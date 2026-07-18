/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { describe, expect, test } from 'bun:test'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { XDocsUpgradePlan } from './types.js'
import { buildUpgradeRecovery } from './upgrade-catalog.js'
import { executeUpgradeTransaction, recoverInterruptedUpgrade, verifyExecutableVersion } from './upgrade-transaction.js'

describe('upgrade transaction', () => {
  test('emits plan and download before awaiting a gated response', async () => {
    const fixture = await createFixture()
    const messages: string[] = []
    let release: ((response: Response) => void) | undefined
    const response = new Promise<Response>((resolve) => { release = resolve })
    try {
      const transaction = executeUpgradeTransaction({
        ...fixture.options,
        fetcher: () => response,
        onEvent: (event) => messages.push(`${event.phase}:${event.status}`),
      })
      await Bun.sleep(10)
      expect(messages).toEqual(['plan:started', 'plan:succeeded', 'download:started'])
      release?.(new Response('MZtarget'))
      expect((await transaction).outcome).toBe('upgraded')
    } finally {
      await fixture.cleanup()
    }
  })

  test('replaces and verifies the canonical path before committing cache', async () => {
    const fixture = await createFixture()
    const order: string[] = []
    try {
      const result = await executeUpgradeTransaction({
        ...fixture.options,
        onEvent: (event) => order.push(`${event.phase}:${event.status}`),
        verifyExecutable: async (path, version) => {
          order.push(`verify:${path === fixture.plan.executablePath ? 'canonical' : 'candidate'}:${version}`)
        },
        commitCache: async () => { order.push('cache:commit') },
      })
      expect(result.outcome).toBe('upgraded')
      expect(await readFile(fixture.plan.executablePath, 'utf8')).toBe('MZtarget')
      expect(order.indexOf('verify:canonical:2.0.0')).toBeLessThan(order.indexOf('cache:commit'))
      expect(result.result?.verifiedVersion).toBe('2.0.0')
      expect(result.result?.cacheUpdated).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })

  test('restores the byte-identical previous executable after canonical verification fails', async () => {
    const fixture = await createFixture()
    try {
      const result = await executeUpgradeTransaction({
        ...fixture.options,
        verifyExecutable: async (path, version) => {
          if (path === fixture.plan.executablePath && version === fixture.plan.targetVersion) throw new Error('forced mismatch')
        },
      })
      expect(result.outcome).toBe('rolled-back')
      expect(await readFile(fixture.plan.executablePath, 'utf8')).toBe('MZcurrent')
      expect(result.result?.cacheUpdated).toBe(false)
      expect(result.error?.code).toBe('upgrade-rolled-back')
    } finally {
      await fixture.cleanup()
    }
  })

  test('fails clearly when another transaction owns the executable', async () => {
    const fixture = await createFixture()
    try {
      await writeFile(join(fixture.dir, '.xdocs-upgrade.lock'), '{"pid":1}\n', 'utf8')
      const result = await executeUpgradeTransaction(fixture.options)
      expect(result.outcome).toBe('failed')
      expect(result.error?.code).toBe('upgrade-locked')
      expect(await readFile(fixture.plan.executablePath, 'utf8')).toBe('MZcurrent')
    } finally {
      await fixture.cleanup()
    }
  })

  test('returns the fixed envelope and pinned recovery after download failure', async () => {
    const fixture = await createFixture()
    try {
      const result = await executeUpgradeTransaction({
        ...fixture.options,
        fetcher: async () => new Response('unavailable', { status: 503, statusText: 'Service Unavailable' }),
      })
      expect(Object.keys(result)).toEqual([
        'schemaVersion', 'command', 'outcome', 'plan', 'events', 'result', 'recovery', 'error',
      ])
      expect(result.outcome).toBe('failed')
      expect(result.result).toBeNull()
      expect(result.events.at(-1)).toMatchObject({ phase: 'download', status: 'failed' })
      expect(result.recovery.targetVersion).toBe(fixture.plan.targetVersion)
      expect(result.recovery.installCommand).toContain(fixture.plan.targetVersion)
      expect(result.recovery.stopProcessCommand).toContain('xdocs')
      expect(result.error?.code).toBe('upgrade-download-failed')
    } finally {
      await fixture.cleanup()
    }
  })

  test('reports cache failure without undoing a verified executable', async () => {
    const fixture = await createFixture()
    try {
      const result = await executeUpgradeTransaction({
        ...fixture.options,
        commitCache: async () => { throw new Error('cache unavailable') },
      })
      expect(result.outcome).toBe('upgraded')
      expect(result.result?.verifiedVersion).toBe(fixture.plan.targetVersion)
      expect(result.result?.cacheUpdated).toBe(false)
      expect(result.error).toEqual({ code: 'upgrade-cache-write-failed', message: 'cache unavailable' })
      expect(await readFile(fixture.plan.executablePath, 'utf8')).toBe('MZtarget')
    } finally {
      await fixture.cleanup()
    }
  })

  test('does not downgrade the canonical executable', async () => {
    const fixture = await createFixture()
    try {
      const plan = { ...fixture.plan, currentVersion: '2.0.0', targetVersion: '1.0.0' }
      let fetched = false
      const result = await executeUpgradeTransaction({
        ...fixture.options,
        plan,
        fetcher: async () => {
          fetched = true
          return new Response('MZtarget')
        },
      })
      expect(result.outcome).toBe('up-to-date')
      expect(fetched).toBe(false)
      expect(result.recovery.targetVersion).toBe(plan.currentVersion)
      expect(result.recovery.targetSource).toBe('fallback-current')
      expect(await readFile(plan.executablePath, 'utf8')).toBe('MZcurrent')
    } finally {
      await fixture.cleanup()
    }
  })

  test('preserves an ambiguous interrupted journal and both executable candidates', async () => {
    const fixture = await createFixture()
    const backupPath = join(fixture.dir, '.xdocs-backup.exe')
    const temporaryPath = join(fixture.dir, '.xdocs-temporary.exe')
    const journalPath = join(fixture.dir, '.xdocs-upgrade.json')
    try {
      await writeFile(backupPath, 'MZbackup', 'utf8')
      await writeFile(temporaryPath, 'MZtemporary', 'utf8')
      await writeFile(journalPath, JSON.stringify({
        pid: process.pid,
        canonicalPath: fixture.plan.executablePath,
        temporaryPath,
        backupPath,
        currentVersion: fixture.plan.currentVersion,
        targetVersion: fixture.plan.targetVersion,
      }), 'utf8')
      await expect(recoverInterruptedUpgrade(fixture.plan.executablePath, async () => undefined))
        .rejects.toThrow('both canonical and backup executables exist')
      expect(await Bun.file(journalPath).exists()).toBe(true)
      expect(await Bun.file(fixture.plan.executablePath).exists()).toBe(true)
      expect(await Bun.file(backupPath).exists()).toBe(true)
      expect(await Bun.file(temporaryPath).exists()).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })

  test('accepts a verified canonical target when backup cleanup finished before journal cleanup', async () => {
    const fixture = await createFixture()
    const journalPath = join(fixture.dir, '.xdocs-upgrade.json')
    const backupPath = join(fixture.dir, '.xdocs-missing-backup.exe')
    const temporaryPath = join(fixture.dir, '.xdocs-consumed-candidate.exe')
    const verified: Array<{ path: string, version: string }> = []
    try {
      await writeFile(fixture.plan.executablePath, 'MZtarget', 'utf8')
      await writeFile(journalPath, JSON.stringify({
        pid: process.pid,
        canonicalPath: fixture.plan.executablePath,
        temporaryPath,
        backupPath,
        currentVersion: fixture.plan.currentVersion,
        targetVersion: fixture.plan.targetVersion,
      }), 'utf8')
      expect(await recoverInterruptedUpgrade(fixture.plan.executablePath, async (path, version) => {
        verified.push({ path, version })
        if (version !== fixture.plan.targetVersion) throw new Error(`received ${version}`)
      })).toBe(true)
      expect(verified).toEqual([
        { path: fixture.plan.executablePath, version: fixture.plan.currentVersion },
        { path: fixture.plan.executablePath, version: fixture.plan.targetVersion },
      ])
      expect(await Bun.file(journalPath).exists()).toBe(false)
      expect(await Bun.file(fixture.plan.executablePath).text()).toBe('MZtarget')
    } finally {
      await fixture.cleanup()
    }
  })

  if (process.platform !== 'win32') {
    test('terminates a candidate whose version check exceeds the deadline', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'xdocs-verification-timeout-'))
      const executable = join(dir, 'xdocs-hung')
      try {
        await writeFile(executable, '#!/bin/sh\nexec sleep 30\n', 'utf8')
        await chmod(executable, 0o755)
        await expect(verifyExecutableVersion(executable, '1.0.0', 50)).rejects.toThrow('timed out')
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })
  }
})

async function createFixture(): Promise<{
  dir: string
  plan: XDocsUpgradePlan
  options: Parameters<typeof executeUpgradeTransaction>[0]
  cleanup: () => Promise<void>
}> {
  const dir = await mkdtemp(join(tmpdir(), 'xdocs-transaction-'))
  const executablePath = join(dir, 'xdocs.exe')
  const plan: XDocsUpgradePlan = {
    currentVersion: '1.0.0',
    targetVersion: '2.0.0',
    platform: 'windows',
    arch: 'x64',
    variant: 'baseline',
    assetName: 'xdocs-windows-x64-baseline.exe',
    downloadUrl: 'https://example.test/xdocs.exe',
    executablePath,
    temporaryPath: join(dir, '.xdocs-upgrade-target.exe'),
    backupPath: join(dir, '.xdocs-upgrade-backup.exe'),
    releaseUrl: 'https://example.test/release',
  }
  await writeFile(executablePath, 'MZcurrent', 'utf8')
  const verifyExecutable = async (): Promise<void> => undefined
  return {
    dir,
    plan,
    options: {
      plan,
      platform: 'windows',
      recovery: buildUpgradeRecovery({ platform: 'windows', targetVersion: plan.targetVersion, targetSource: 'release' }),
      fetcher: async () => new Response('MZtarget'),
      verifyExecutable,
    },
    cleanup: () => rm(dir, { recursive: true, force: true }),
  }
}
