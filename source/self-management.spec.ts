/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristovao GUIHO. All Rights Reserved.
 */

import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  resolveCachePath,
  resolveUpdateLockPath,
  runBackgroundUpdateCheck,
  scheduleBackgroundUpdateCheck,
} from './self-management.js'

const temporaryPaths: string[] = []
const originalLeaseToken = process.env['XDOCS_UPDATE_LEASE_TOKEN']
const originalDisableUpdateCheck = process.env['XDOCS_DISABLE_UPDATE_CHECK']

afterEach(async () => {
  restoreEnvironment('XDOCS_UPDATE_LEASE_TOKEN', originalLeaseToken)
  restoreEnvironment('XDOCS_DISABLE_UPDATE_CHECK', originalDisableUpdateCheck)
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('bounded background update worker', () => {
  test.serial('coalesces 64 simultaneous schedules into one detached worker', async () => {
    const cacheDir = join(await temp(), 'cache with spaces')
    let spawnCount = 0
    const environments: Array<Record<string, string | undefined>> = []
    const options = {
      cacheDir,
      executablePath: 'xdocs-test',
      isUpdateCheckDisabled: () => false,
      isSourceCheckout: async () => false,
      createToken: () => 'coalesced-token',
      spawnWorker: (_command: string[], environment: Record<string, string | undefined>) => {
        spawnCount += 1
        environments.push(environment)
        return { unref() {} }
      },
    }

    const results = await Promise.all(Array.from({ length: 64 }, () => scheduleBackgroundUpdateCheck(options)))

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(spawnCount).toBe(1)
    expect(environments[0]?.['XDOCS_UPDATE_LEASE_TOKEN']).toBe('coalesced-token')
    expect(await Bun.file(join(resolveUpdateLockPath(options), 'lease.json')).exists()).toBeTrue()
  })

  test.serial('reclaims one stale lease under two simultaneous schedulers without a herd', async () => {
    const cacheDir = await temp()
    const now = Date.parse('2026-07-21T12:00:00.000Z')
    await writeLease(cacheDir, {
      token: 'stale-token',
      pid: 123,
      createdAt: new Date(now - 31_000).toISOString(),
    })
    let spawnCount = 0
    let tokenCount = 0
    const options = {
      cacheDir,
      executablePath: 'xdocs-test',
      now: () => now,
      isUpdateCheckDisabled: () => false,
      isSourceCheckout: async () => false,
      createToken: () => `new-token-${++tokenCount}`,
      spawnWorker: () => {
        spawnCount += 1
        return { unref() {} }
      },
    }

    const results = await Promise.all([
      scheduleBackgroundUpdateCheck(options),
      scheduleBackgroundUpdateCheck(options),
    ])

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(spawnCount).toBe(1)
    const lease = JSON.parse(await readFile(join(resolveUpdateLockPath(options), 'lease.json'), 'utf8'))
    expect(lease.token).toStartWith('new-token-')
  })

  test.serial('reclaims a stale orphaned lock with no valid lease', async () => {
    const cacheDir = await temp()
    const lockPath = resolveUpdateLockPath({ cacheDir })
    await mkdir(lockPath, { recursive: true })
    await writeFile(join(lockPath, 'lease.json'), '{invalid')
    const old = new Date(Date.now() - 31_000)
    await utimes(lockPath, old, old)
    let spawnCount = 0

    const scheduled = await scheduleBackgroundUpdateCheck({
      cacheDir,
      executablePath: 'xdocs-test',
      isUpdateCheckDisabled: () => false,
      isSourceCheckout: async () => false,
      spawnWorker: () => {
        spawnCount += 1
        return { unref() {} }
      },
    })

    expect(scheduled).toBeTrue()
    expect(spawnCount).toBe(1)
  })

  test.serial('recovers a stale mutation guard and continues scheduling', async () => {
    const cacheDir = await temp()
    const guardPath = join(cacheDir, '.update-check-mutation.lock')
    await mkdir(guardPath, { recursive: true })
    await writeFile(join(guardPath, 'lease.json'), JSON.stringify({
      token: 'stale-guard-token',
      pid: 321,
      createdAt: new Date(Date.now() - 31_000).toISOString(),
    }))
    let spawnCount = 0

    const scheduled = await scheduleBackgroundUpdateCheck({
      cacheDir,
      executablePath: 'xdocs-test',
      isUpdateCheckDisabled: () => false,
      isSourceCheckout: async () => false,
      spawnWorker: () => {
        spawnCount += 1
        return { unref() {} }
      },
    })

    expect(scheduled).toBeTrue()
    expect(spawnCount).toBe(1)
    expect(await testPathExists(guardPath)).toBeFalse()
  })

  test.serial('recovers a stale orphaned mutation guard with no lease file', async () => {
    const cacheDir = await temp()
    const guardPath = join(cacheDir, '.update-check-mutation.lock')
    await mkdir(guardPath, { recursive: true })
    const old = new Date(Date.now() - 31_000)
    await utimes(guardPath, old, old)
    let spawnCount = 0

    const scheduled = await scheduleBackgroundUpdateCheck({
      cacheDir,
      executablePath: 'xdocs-test',
      isUpdateCheckDisabled: () => false,
      isSourceCheckout: async () => false,
      spawnWorker: () => {
        spawnCount += 1
        return { unref() {} }
      },
    })

    expect(scheduled).toBeTrue()
    expect(spawnCount).toBe(1)
    expect(await testPathExists(guardPath)).toBeFalse()
  })

  test.serial('bounds a hung network check and releases its lease', async () => {
    const cacheDir = await temp()
    let fetchStartedAt = 0
    let fetchAbortedAt = 0
    const completed = await runBackgroundUpdateCheck({
      cacheDir,
      timeoutMilliseconds: 25,
      isUpdateCheckDisabled: () => false,
      fetcher: async (_input, init) => new Promise<Response>((_resolve, reject) => {
        fetchStartedAt = performance.now()
        init?.signal?.addEventListener('abort', () => {
          fetchAbortedAt = performance.now()
          reject(new DOMException('aborted', 'AbortError'))
        }, { once: true })
      }),
    })

    expect(completed).toBeFalse()
    expect(fetchStartedAt).toBeGreaterThan(0)
    expect(fetchAbortedAt - fetchStartedAt).toBeGreaterThanOrEqual(20)
    expect(fetchAbortedAt - fetchStartedAt).toBeLessThan(2_000)
    expect(await testPathExists(resolveUpdateLockPath({ cacheDir }))).toBeFalse()
  })

  test.serial('writes cache on success and terminates without leaving a lease', async () => {
    const cacheDir = await temp()
    const completed = await runBackgroundUpdateCheck({
      cacheDir,
      timeoutMilliseconds: 500,
      isUpdateCheckDisabled: () => false,
      fetcher: async () => releaseResponse(),
    })

    expect(completed).toBeTrue()
    expect(await Bun.file(resolveCachePath({ cacheDir })).exists()).toBeTrue()
    expect(await testPathExists(resolveUpdateLockPath({ cacheDir }))).toBeFalse()
  })

  test.serial('does not let an old worker token remove a newer lease', async () => {
    const cacheDir = await temp()
    await writeLease(cacheDir, {
      token: 'new-token',
      pid: process.pid,
      createdAt: new Date().toISOString(),
    })
    process.env['XDOCS_UPDATE_LEASE_TOKEN'] = 'old-token'

    const completed = await runBackgroundUpdateCheck({
      cacheDir,
      timeoutMilliseconds: 25,
      isUpdateCheckDisabled: () => false,
    })

    expect(completed).toBeFalse()
    const lease = JSON.parse(await readFile(join(resolveUpdateLockPath({ cacheDir }), 'lease.json'), 'utf8'))
    expect(lease.token).toBe('new-token')
  })

  test.serial('isolates scheduler filesystem and spawn failures without rejecting', async () => {
    const root = await temp()
    const invalidCacheDirectory = join(root, 'not-a-directory')
    await writeFile(invalidCacheDirectory, 'file')

    await expect(scheduleBackgroundUpdateCheck({
      cacheDir: invalidCacheDirectory,
      executablePath: 'xdocs-test',
      isUpdateCheckDisabled: () => false,
      isSourceCheckout: async () => false,
    })).resolves.toBeFalse()

    const cacheDir = join(root, 'valid-cache')
    await expect(scheduleBackgroundUpdateCheck({
      cacheDir,
      executablePath: 'xdocs-test',
      isUpdateCheckDisabled: () => false,
      isSourceCheckout: async () => false,
      spawnWorker: () => { throw new Error('spawn failed') },
    })).resolves.toBeFalse()
    expect(await testPathExists(resolveUpdateLockPath({ cacheDir }))).toBeFalse()
  })
})

async function temp(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'xdocs-update-worker-'))
  temporaryPaths.push(path)
  return path
}

async function writeLease(cacheDir: string, lease: { token: string, pid: number, createdAt: string }): Promise<void> {
  const lockPath = resolveUpdateLockPath({ cacheDir })
  await mkdir(lockPath, { recursive: true })
  await writeFile(join(lockPath, 'lease.json'), JSON.stringify(lease))
}

function releaseResponse(): Response {
  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux'
  const extension = process.platform === 'win32' ? '.exe' : ''
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64-baseline'
  return Response.json([{
    tag_name: '@guiho/xdocs@9.9.9',
    html_url: 'https://github.com/CGuiho/xdocs/releases/tag/test',
    published_at: '2026-07-21T00:00:00Z',
    prerelease: false,
    draft: false,
    assets: [{
      name: `xdocs-${platform}-${arch}${extension}`,
      browser_download_url: 'https://example.invalid/xdocs',
      size: 1,
    }],
  }])
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

async function testPathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
