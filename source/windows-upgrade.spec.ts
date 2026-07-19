/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { expect, test } from 'bun:test'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { XDocsUpgradePlan } from './types.js'
import { buildUpgradeRecovery } from './upgrade-catalog.js'
import { executeUpgradeTransaction, verifyExecutableVersion } from './upgrade-transaction.js'

if (process.platform === 'win32') {
  test('replaces a running real Windows executable before returning', async () => {
    const previousDisableCleanup = process.env['XDOCS_DISABLE_SCHEDULED_CLEANUP']
    delete process.env['XDOCS_DISABLE_SCHEDULED_CLEANUP']
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-windows-upgrade-'))
    const canonicalPath = join(dir, 'xdocs.exe')
    const plan: XDocsUpgradePlan = {
      currentVersion: '0.0.0',
      targetVersion: Bun.version,
      platform: 'windows',
      arch: process.arch === 'arm64' ? 'arm64' : 'x64',
      variant: process.arch === 'arm64' ? null : 'baseline',
      assetName: 'xdocs-windows-fixture.exe',
      downloadUrl: 'https://fixture.invalid/xdocs.exe',
      executablePath: canonicalPath,
      temporaryPath: join(dir, '.xdocs-candidate.exe'),
      backupPath: join(dir, '.xdocs-backup.exe'),
      releaseUrl: 'https://fixture.invalid/release',
    }
    await copyFile(process.execPath, canonicalPath)
    const runningOldImage = Bun.spawn([canonicalPath, '-e', 'setTimeout(() => {}, 30000)'], {
      stdin: 'ignore',
      stdout: 'ignore',
      stderr: 'ignore',
    })
    try {
      await Bun.sleep(250)
      const result = await executeUpgradeTransaction({
        plan,
        platform: 'windows',
        recovery: buildUpgradeRecovery({ platform: 'windows', targetVersion: Bun.version, targetSource: 'explicit' }),
        fetcher: async () => new Response(Bun.file(process.execPath)),
      })
      expect(isProcessRunning(runningOldImage.pid)).toBe(true)
      expect(result.outcome).toBe('upgraded')
      expect(result.result?.verifiedVersion).toBe(Bun.version)
      expect(result.result?.cleanup).toEqual({ backupPath: plan.backupPath, scheduled: true })
      expect(result.events).toContainEqual(expect.objectContaining({
        phase: 'cleanup',
        status: 'succeeded',
        message: expect.stringContaining('scheduled'),
      }))
      expect(await Bun.file(plan.backupPath).exists()).toBe(true)
      expect(isProcessRunning(runningOldImage.pid)).toBe(true)
      await verifyExecutableVersion(canonicalPath, Bun.version)
      runningOldImage.kill()
      await runningOldImage.exited
      await waitForFileRemoval(plan.backupPath)
      expect(await Bun.file(plan.backupPath).exists()).toBe(false)
    } finally {
      if (previousDisableCleanup === undefined) delete process.env['XDOCS_DISABLE_SCHEDULED_CLEANUP']
      else process.env['XDOCS_DISABLE_SCHEDULED_CLEANUP'] = previousDisableCleanup
      if (isProcessRunning(runningOldImage.pid)) {
        runningOldImage.kill()
        await runningOldImage.exited
      }
      await Bun.sleep(250)
      await rm(dir, { recursive: true, force: true })
    }
  }, 30_000)
} else {
  test.skip('replaces a running real Windows executable before returning', () => undefined)
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function waitForFileRemoval(path: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (!await Bun.file(path).exists()) return
    await Bun.sleep(100)
  }
  throw new Error(`Scheduled cleanup did not remove ${path}.`)
}
