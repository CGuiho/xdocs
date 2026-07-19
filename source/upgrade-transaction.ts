/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type {
  XDocsNativePlatform,
  XDocsUpgradeEnvelope,
  XDocsUpgradeEvent,
  XDocsUpgradePlan,
  XDocsUpgradeRecovery,
} from './types.js'
import { XDocsError } from './errors.js'
import { buildUpgradeRecovery, compareSemanticVersions } from './upgrade-catalog.js'
import {
  chmodPath as chmod,
  movePath as rename,
  pathExists,
  readText as readFile,
  removePath as rm,
  statPath as stat,
  writeText as writeFile,
} from './runtime/fs.js'
import { dirname, joinPath as join } from './runtime/path.js'

export {
  executeUpgradeTransaction,
  recoverInterruptedUpgrade,
  verifyExecutableVersion,
}

type UpgradeFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>
type ExecutableVerifier = (path: string, expectedVersion: string) => Promise<void>
type DownloadProgress = NonNullable<XDocsUpgradeEvent['progress']>

type UpgradeTransactionOptions = {
  plan: XDocsUpgradePlan
  recovery: XDocsUpgradeRecovery
  dryRun?: boolean
  onEvent?: (event: XDocsUpgradeEvent) => void
  fetcher?: UpgradeFetcher
  verifyExecutable?: ExecutableVerifier
  commitCache?: () => Promise<void>
  platform?: XDocsNativePlatform
}

const executableVerificationTimeoutMilliseconds = 15_000

type UpgradeJournal = {
  pid: number
  canonicalPath: string
  temporaryPath: string
  backupPath: string
  currentVersion: string
  targetVersion: string
}

async function executeUpgradeTransaction(options: UpgradeTransactionOptions): Promise<XDocsUpgradeEnvelope> {
  const events: XDocsUpgradeEvent[] = []
  const emit = (
    phase: XDocsUpgradeEvent['phase'],
    status: XDocsUpgradeEvent['status'],
    message: string,
    progress?: DownloadProgress,
  ): void => {
    const event = { sequence: events.length + 1, phase, status, message, ...(progress ? { progress } : {}) } satisfies XDocsUpgradeEvent
    events.push(event)
    options.onEvent?.(event)
  }
  const plan = options.plan
  const platform = options.platform ?? plan.platform
  const verify = options.verifyExecutable ?? verifyExecutableVersion
  const lockPath = join(dirname(plan.executablePath), '.xdocs-upgrade.lock')
  const journalPath = join(dirname(plan.executablePath), '.xdocs-upgrade.json')
  let ownsLock = false
  let backupCreated = false
  let candidateInstalled = false

  emit('plan', 'started', 'Resolving upgrade target.')
  emit('plan', 'succeeded', 'Upgrade plan resolved.')

  const targetComparison = compareSemanticVersions(plan.targetVersion, plan.currentVersion)
  if (targetComparison <= 0) {
    const recovery = targetComparison < 0
      ? buildUpgradeRecovery({ platform, targetVersion: plan.currentVersion, targetSource: 'fallback-current' })
      : options.recovery
    return envelope('up-to-date', plan, events, recovery, {
      verifiedVersion: plan.currentVersion,
      cacheUpdated: false,
      cleanup: { backupPath: null, scheduled: false },
    })
  }
  if (options.dryRun) {
    return envelope('dry-run', plan, events, options.recovery, null)
  }

  try {
    await recoverInterruptedUpgrade(plan.executablePath, verify)
    if (await pathExists(lockPath)) throw new XDocsError(`Another xdocs upgrade owns ${plan.executablePath}.`)
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, targetVersion: plan.targetVersion }) + '\n')
    ownsLock = true

    emit('download', 'started', 'Downloading upgrade asset.')
    const response = await (options.fetcher ?? fetch)(plan.downloadUrl, { headers: { 'User-Agent': 'xdocs-cli' } })
    if (!response.ok) throw new XDocsError(`Upgrade download failed: ${response.status} ${response.statusText}`)
    await downloadResponse(response, plan.temporaryPath, (progress) => {
      emit('download', 'progress', downloadProgressMessage(progress), progress)
    })
    if ((await stat(plan.temporaryPath)).size === 0) throw new XDocsError('Upgrade download was empty.')
    emit('download', 'succeeded', 'Upgrade asset downloaded.')

    emit('validate', 'started', 'Validating upgrade asset.')
    if (!await isNativeBinary(plan.temporaryPath, platform)) throw new XDocsError('Upgrade download was not a native executable for this platform.')
    if (platform !== 'windows') await chmod(plan.temporaryPath, 0o755)
    await verify(plan.temporaryPath, plan.targetVersion)
    emit('validate', 'succeeded', `Upgrade candidate reports ${plan.targetVersion}.`)

    const journal: UpgradeJournal = {
      pid: process.pid,
      canonicalPath: plan.executablePath,
      temporaryPath: plan.temporaryPath,
      backupPath: plan.backupPath,
      currentVersion: plan.currentVersion,
      targetVersion: plan.targetVersion,
    }
    await writeFile(journalPath, JSON.stringify(journal, null, 2) + '\n', 'utf8')

    emit('replace', 'started', 'Replacing canonical executable.')
    await rm(plan.backupPath, { force: true })
    await rename(plan.executablePath, plan.backupPath)
    backupCreated = true
    await rename(plan.temporaryPath, plan.executablePath)
    candidateInstalled = true
    emit('replace', 'succeeded', 'Canonical executable replaced.')

    emit('verify', 'started', 'Verifying canonical executable.')
    await verify(plan.executablePath, plan.targetVersion)
    emit('verify', 'succeeded', `Canonical executable reports ${plan.targetVersion}.`)

    let cacheUpdated = false
    let cacheError: Error | null = null
    emit('cache', 'started', 'Updating cached version state.')
    try {
      await options.commitCache?.()
      cacheUpdated = Boolean(options.commitCache)
      emit('cache', options.commitCache ? 'succeeded' : 'skipped', options.commitCache ? 'Update cache committed.' : 'No update cache configured.')
    } catch (error) {
      cacheError = toError(error)
      emit('cache', 'failed', `Canonical executable is verified, but the update cache failed: ${cacheError.message}`)
    }

    emit('cleanup', 'started', 'Cleaning transaction artifacts.')
    const cleanup = await cleanupBackup(plan.backupPath, platform)
    await rm(journalPath, { force: true })
    emit('cleanup', 'succeeded', cleanup.scheduled ? 'Backup cleanup scheduled after the old process exits.' : 'Transaction artifacts cleaned.')
    return envelope('upgraded', plan, events, options.recovery, {
      verifiedVersion: plan.targetVersion,
      cacheUpdated,
      cleanup,
    }, cacheError ? { code: 'upgrade-cache-write-failed', message: cacheError.message } : null)
  } catch (error) {
    const failure = toError(error)
    const phase = activePhase(events)
    if (phase) emit(phase, 'failed', failure.message)

    if (backupCreated) {
      try {
        if (candidateInstalled) await rm(plan.executablePath, { force: true })
        await rename(plan.backupPath, plan.executablePath)
        await verify(plan.executablePath, plan.currentVersion)
        emit('cleanup', 'started', 'Cleaning failed transaction artifacts.')
        await rm(plan.temporaryPath, { force: true })
        await rm(journalPath, { force: true })
        emit('cleanup', 'succeeded', 'Previous executable restored.')
        return envelope('rolled-back', plan, events, options.recovery, {
          verifiedVersion: plan.currentVersion,
          cacheUpdated: false,
          cleanup: { backupPath: null, scheduled: false },
        }, { code: 'upgrade-rolled-back', message: failure.message })
      } catch (rollbackError) {
        const rollback = toError(rollbackError)
        return envelope('failed', plan, events, options.recovery, null, {
          code: 'upgrade-rollback-failed',
          message: `${failure.message} Rollback also failed: ${rollback.message}`,
        })
      }
    }

    await rm(plan.temporaryPath, { force: true }).catch(() => undefined)
    return envelope('failed', plan, events, options.recovery, null, {
      code: errorCode(failure),
      message: failure.message,
    })
  } finally {
    if (ownsLock) await rm(lockPath, { force: true }).catch(() => undefined)
  }
}

async function downloadResponse(
  response: Response,
  destination: string,
  onProgress: (progress: DownloadProgress) => void,
): Promise<void> {
  if (!response.body) throw new XDocsError('Upgrade download response had no body.')
  const rawTotal = response.headers.get('content-length')
  const parsedTotal = rawTotal ? Number(rawTotal) : Number.NaN
  const totalBytes = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : null
  const reader = response.body.getReader()
  const writer = Bun.file(destination).writer()
  let receivedBytes = 0
  let lastPercentBucket = -1
  let lastUnknownBucket = 0
  let lastReportedReceived = -1
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      writer.write(chunk.value)
      receivedBytes += chunk.value.byteLength
      if (totalBytes !== null && totalBytes > 0) {
        const percent = Math.min(100, (receivedBytes / totalBytes) * 100)
        const bucket = Math.floor(percent / 5)
        if (bucket > lastPercentBucket || percent === 100) {
          lastPercentBucket = bucket
          lastReportedReceived = receivedBytes
          onProgress({ receivedBytes, totalBytes, percent })
        }
      } else {
        const bucket = Math.floor(receivedBytes / (1024 * 1024))
        if (bucket > lastUnknownBucket) {
          lastUnknownBucket = bucket
          lastReportedReceived = receivedBytes
          onProgress({ receivedBytes, totalBytes: null, percent: null })
        }
      }
    }
  } finally {
    await writer.end()
    reader.releaseLock()
  }
  if (totalBytes === null && receivedBytes !== lastReportedReceived) {
    onProgress({ receivedBytes, totalBytes: null, percent: null })
  } else if (totalBytes !== null && receivedBytes !== lastReportedReceived) {
    const percent = totalBytes === 0 ? 100 : Math.min(100, (receivedBytes / totalBytes) * 100)
    onProgress({ receivedBytes, totalBytes, percent })
  }
}

function downloadProgressMessage(progress: DownloadProgress): string {
  if (progress.percent === null || progress.totalBytes === null) {
    return `Downloaded ${progress.receivedBytes} bytes.`
  }
  return `Downloaded ${progress.receivedBytes} of ${progress.totalBytes} bytes (${progress.percent.toFixed(1)}%).`
}

async function recoverInterruptedUpgrade(executablePath: string, verify: ExecutableVerifier = verifyExecutableVersion): Promise<boolean> {
  const directory = dirname(executablePath)
  const journalPath = join(directory, '.xdocs-upgrade.json')
  const lockPath = join(directory, '.xdocs-upgrade.lock')
  if (!(await pathExists(journalPath))) return false

  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as Partial<UpgradeJournal>
  if (!journal.canonicalPath || !journal.backupPath || !journal.temporaryPath || !journal.currentVersion) {
    throw new XDocsError(`Cannot recover malformed upgrade journal at ${journalPath}.`)
  }
  if (journal.pid && journal.pid !== process.pid && isProcessRunning(journal.pid)) {
    throw new XDocsError(`An xdocs upgrade transaction is still active for ${executablePath}.`)
  }

  const canonicalExists = await pathExists(journal.canonicalPath)
  const backupExists = await pathExists(journal.backupPath)
  if (canonicalExists && backupExists) {
    throw new XDocsError(
      `Interrupted xdocs upgrade is ambiguous: both canonical and backup executables exist. `
      + `Preserving the journal and both files at ${journalPath}.`,
    )
  }

  if (!canonicalExists) {
    if (!backupExists) throw new XDocsError(`Interrupted xdocs upgrade has no canonical executable or backup at ${journalPath}.`)
    await rename(journal.backupPath, journal.canonicalPath)
    await verify(journal.canonicalPath, journal.currentVersion)
  } else {
    try {
      await verify(journal.canonicalPath, journal.currentVersion)
    } catch (currentError) {
      if (!journal.targetVersion) {
        throw new XDocsError(`Cannot recover upgrade journal without a target version at ${journalPath}.`)
      }
      try {
        await verify(journal.canonicalPath, journal.targetVersion)
      } catch (targetError) {
        throw new XDocsError(
          `Interrupted canonical executable matches neither ${journal.currentVersion} nor ${journal.targetVersion}. `
          + `Current verification: ${toError(currentError).message} Target verification: ${toError(targetError).message}`,
        )
      }
    }
  }
  await rm(journal.temporaryPath, { force: true })
  await rm(journalPath, { force: true })
  await rm(lockPath, { force: true })
  return true
}

async function verifyExecutableVersion(
  path: string,
  expectedVersion: string,
  timeoutMilliseconds = executableVerificationTimeoutMilliseconds,
): Promise<void> {
  if (!(await pathExists(path))) throw new XDocsError(`Executable verification path does not exist: ${path}`)
  const proc = Bun.spawn([path, '--version'], {
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, XDOCS_DISABLE_UPDATE_CHECK: '1' },
  })
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    proc.kill()
  }, timeoutMilliseconds)
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited.finally(() => clearTimeout(timeout)),
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  if (timedOut) {
    throw new XDocsError(`Executable verification timed out after ${timeoutMilliseconds}ms.`)
  }
  if (exitCode !== 0) throw new XDocsError(`Executable verification failed with exit code ${exitCode}: ${stderr.trim()}`)
  const actual = stdout.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/)?.[0]
  if (actual !== expectedVersion) throw new XDocsError(`Executable verification mismatch: expected ${expectedVersion}, received ${actual ?? 'no version'}.`)
}

async function isNativeBinary(path: string, platform: XDocsNativePlatform): Promise<boolean> {
  const bytes = new Uint8Array(await Bun.file(path).slice(0, 4).arrayBuffer())
  if (platform === 'windows') return bytes[0] === 0x4d && bytes[1] === 0x5a
  if (platform === 'linux') return bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46
  return [
    [0xcf, 0xfa, 0xed, 0xfe],
    [0xce, 0xfa, 0xed, 0xfe],
    [0xfe, 0xed, 0xfa, 0xcf],
    [0xfe, 0xed, 0xfa, 0xce],
    [0xca, 0xfe, 0xba, 0xbe],
    [0xbe, 0xba, 0xfe, 0xca],
  ].some((magic) => magic.every((value, index) => bytes[index] === value))
}

async function cleanupBackup(backupPath: string, platform: XDocsNativePlatform): Promise<{ backupPath: string | null, scheduled: boolean }> {
  try {
    await rm(backupPath, { force: true })
    return { backupPath: null, scheduled: false }
  } catch (error) {
    if (platform !== 'windows') throw error
    if (process.env['XDOCS_DISABLE_SCHEDULED_CLEANUP'] === '1') {
      return { backupPath, scheduled: true }
    }
    const scriptPath = join(dirname(backupPath), `.xdocs-cleanup-${process.pid}.ps1`)
    const script = [
      `$pidToWait = ${process.pid}`,
      'Wait-Process -Id $pidToWait -ErrorAction SilentlyContinue',
      `Remove-Item -LiteralPath ${quotePowerShell(backupPath)} -Force -ErrorAction SilentlyContinue`,
      'Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue',
    ].join('\n')
    await writeFile(scriptPath, script, 'utf8')
    const proc = Bun.spawn(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
      stdin: 'ignore', stdout: 'ignore', stderr: 'ignore',
    })
    ;(proc as unknown as { unref?: () => void }).unref?.()
    return { backupPath, scheduled: true }
  }
}

function envelope(
  outcome: XDocsUpgradeEnvelope['outcome'],
  plan: XDocsUpgradePlan,
  events: XDocsUpgradeEvent[],
  recovery: XDocsUpgradeRecovery,
  result: XDocsUpgradeEnvelope['result'],
  error: XDocsUpgradeEnvelope['error'] = null,
): XDocsUpgradeEnvelope {
  return { schemaVersion: 1, command: 'xdocs upgrade', outcome, plan, events, result, recovery, error }
}

function activePhase(events: XDocsUpgradeEvent[]): XDocsUpgradeEvent['phase'] | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (!event) continue
    if (event.status === 'progress') continue
    return event.status === 'started' ? event.phase : null
  }
  return null
}

function errorCode(error: Error): string {
  if (error.message.includes('Another xdocs upgrade')) return 'upgrade-locked'
  if (error.message.includes('download')) return 'upgrade-download-failed'
  if (error.message.includes('verification')) return 'upgrade-verification-failed'
  return 'upgrade-failed'
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function quotePowerShell(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
