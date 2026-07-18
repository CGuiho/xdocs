/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type {
  XDocsNativeArch,
  XDocsNativePlatform,
  XDocsNativeVariant,
  XDocsUninstallResult,
  XDocsUpdateCache,
  XDocsUpgradeEnvelope,
  XDocsUpgradeEvent,
  XDocsUpgradePlan,
} from './types.js'
import { XDocsError } from './errors.js'
import { readPackageVersion } from './help.js'
import { buildUpgradeRecovery, compareSemanticVersions, fetchReleaseCatalog, normalizeXDocsVersion } from './upgrade-catalog.js'
import { executeUpgradeTransaction } from './upgrade-transaction.js'
import { XDocsUpdateCacheSchema, decodeWithSchema } from './schemas.js'
import { homeDirectory } from './runtime/home.js'
import { pathExists, readText, removePath, writeText } from './runtime/fs.js'
import { dirname, joinPath, resolvePath } from './runtime/path.js'
import { updateInstructions, updateSkills } from './agents.js'

export {
  checkForLatestVersion,
  detectNativeArch,
  detectNativePlatform,
  listAvailableVersions,
  readUpdateCache,
  resolveCachePath,
  resolveExecutablePath,
  runBackgroundUpdateCheck,
  scheduleBackgroundUpdateCheck,
  uninstallSelf,
  upgradeSelf,
}

const defaultRepo = 'CGuiho/xdocs'
const cacheTtlMilliseconds = 4 * 60 * 60 * 1000

type SelfManagementOptions = {
  readonly repo?: string
  readonly cacheDir?: string
  readonly executablePath?: string
}

type UpgradeFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type UpgradeOptions = SelfManagementOptions & {
  readonly version?: string
  readonly arch?: string
  readonly variant?: string
  readonly dryRun?: boolean
  readonly onPlan?: (plan: XDocsUpgradePlan) => void
  readonly onEvent?: (event: XDocsUpgradeEvent) => void
  readonly fetcher?: UpgradeFetcher
  readonly verifyExecutable?: (path: string, expectedVersion: string) => Promise<void>
}

type UninstallOptions = SelfManagementOptions & {
  readonly dryRun?: boolean
}

async function readUpdateCache(options: SelfManagementOptions = {}): Promise<XDocsUpdateCache | null> {
  try {
    const content = await readText(resolveCachePath(options))
    return decodeWithSchema<XDocsUpdateCache>(XDocsUpdateCacheSchema, JSON.parse(content), 'xdocs update cache')
  } catch {
    return null
  }
}

async function writeUpdateCache(cache: XDocsUpdateCache, options: SelfManagementOptions = {}): Promise<void> {
  const path = resolveCachePath(options)
  await writeText(path, JSON.stringify(cache, null, 2) + '\n')
}

function resolveCachePath(options: SelfManagementOptions = {}): string {
  const cacheDirectory = options.cacheDir ?? process.env['XDOCS_CACHE_DIR'] ?? joinPath(homeDirectory(), '.guiho', 'xdocs')
  return joinPath(cacheDirectory, 'cache.json')
}

async function checkForLatestVersion(options: SelfManagementOptions = {}): Promise<XDocsUpdateCache> {
  const currentVersion = readPackageVersion()
  const releases = await fetchReleaseCatalog({
    repo: options.repo,
    platform: detectNativePlatform(),
    arch: detectNativeArch(),
  })
  const latest = releases.find((release) => release.compatibleAsset)
  if (!latest) throw new XDocsError('No compatible published xdocs release is available.')
  const latestVersion = latest.version
  const cache: XDocsUpdateCache = {
    newVersionAvailable: compareSemanticVersions(latestVersion, currentVersion) > 0,
    latestVersion,
    upgradeCommand: 'xdocs upgrade',
    lastCheck: new Date().toISOString(),
  }

  await writeUpdateCache(cache, options)
  return cache
}

async function runBackgroundUpdateCheck(options: SelfManagementOptions = {}): Promise<void> {
  await checkForLatestVersion(options)
}

async function scheduleBackgroundUpdateCheck(options: SelfManagementOptions = {}): Promise<boolean> {
  if (process.env['XDOCS_DISABLE_UPDATE_CHECK'] === '1') return false

  const cache = await readUpdateCache(options)
  if (cache && Date.now() - Date.parse(cache.lastCheck) < cacheTtlMilliseconds) return false
  if (await isSourceCheckout()) return false

  try {
    const proc = Bun.spawn([resolveExecutablePath(options), '--check-updates-worker'], {
      detached: true,
      stdin: 'ignore',
      stdout: 'ignore',
      stderr: 'ignore',
      env: { ...process.env, XDOCS_BACKGROUND_UPDATE_CHECK: '1' },
    })
    ;(proc as unknown as { unref?: () => void }).unref?.()
    return true
  } catch {
    return false
  }
}

async function upgradeSelf(options: UpgradeOptions = {}): Promise<XDocsUpgradeEnvelope> {
  const currentVersion = readPackageVersion()
  const recoveryPlatform: XDocsNativePlatform = process.platform === 'win32'
    ? 'windows'
    : process.platform === 'darwin'
      ? 'darwin'
      : 'linux'
  const repo = options.repo ?? process.env['XDOCS_REPO'] ?? defaultRepo
  const requestedVersion = options.version ? normalizeXDocsVersion(options.version) : null
  try {
    const executablePath = resolveExecutablePath(options)
    await assertNativeInstall(executablePath, 'upgrade')
    const platform = detectNativePlatform()
    const arch = detectNativeArch(options.arch)
    const variant = parseVariant(options.variant)
    if (options.version && !requestedVersion) throw new XDocsError(`Invalid xdocs semantic version: ${options.version}`)
    const release = requestedVersion
      ? null
      : (await fetchReleaseCatalog({ repo, platform, arch, variant, fetcher: options.fetcher })).find((candidate) => candidate.compatibleAsset)
    if (!requestedVersion && !release) throw new XDocsError(`No compatible xdocs releases are available for ${platform}/${arch}.`)
    const targetVersion = requestedVersion ?? release?.version ?? currentVersion
    const targetComparison = compareSemanticVersions(targetVersion, currentVersion)
    const candidates = buildAssetCandidates(platform, arch, variant)
    const explicitAsset = requestedVersion && targetComparison > 0 && !options.dryRun
      ? await resolveExplicitAsset(candidates, targetVersion, repo, options.fetcher)
      : null
    const asset = release?.compatibleAsset?.name ?? explicitAsset?.asset ?? candidates[0]
    if (!asset) throw new XDocsError(`No compatible xdocs asset is available for ${platform}/${arch}.`)
    const transactionId = `${process.pid}-${Date.now()}`
    const extension = platform === 'windows' ? '.exe' : ''
    const plan: XDocsUpgradePlan = {
      currentVersion,
      targetVersion,
      platform,
      arch,
      variant: arch === 'x64' ? variant : null,
      assetName: asset,
      downloadUrl: release?.compatibleAsset?.downloadUrl ?? explicitAsset?.url ?? buildDownloadUrl(asset, targetVersion, repo),
      executablePath,
      temporaryPath: joinPath(dirname(executablePath), `.xdocs-upgrade-${transactionId}${extension}`),
      backupPath: joinPath(dirname(executablePath), `.xdocs-backup-${transactionId}${extension}`),
      releaseUrl: release?.releaseUrl ?? `https://github.com/${repo}/releases/tag/${encodeURIComponent(`@guiho/xdocs@${targetVersion}`)}`,
    }
    const recovery = buildUpgradeRecovery({
      platform,
      targetVersion: targetComparison < 0 ? currentVersion : targetVersion,
      targetSource: targetComparison < 0 ? 'fallback-current' : requestedVersion ? 'explicit' : 'release',
    })
    options.onPlan?.(plan)
    const result = await executeUpgradeTransaction({
      plan,
      recovery,
      dryRun: options.dryRun,
      onEvent: options.onEvent,
      fetcher: options.fetcher,
      verifyExecutable: options.verifyExecutable,
      platform,
      commitCache: async () => writeUpdateCache({
        newVersionAvailable: false,
        latestVersion: targetVersion,
        lastCheck: new Date().toISOString(),
      }, options),
    })
    if (result.outcome === 'upgraded') {
      await updateSkills('global')
      await updateInstructions(process.cwd())
    }
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const recovery = buildUpgradeRecovery({
      platform: recoveryPlatform,
      targetVersion: requestedVersion ?? currentVersion,
      targetSource: requestedVersion ? 'explicit' : 'fallback-current',
    })
    return {
      schemaVersion: 1,
      command: 'xdocs upgrade',
      outcome: 'failed',
      plan: null,
      events: [
        { sequence: 1, phase: 'plan', status: 'started', message: 'Resolving upgrade target.' },
        { sequence: 2, phase: 'plan', status: 'failed', message },
      ],
      result: null,
      recovery,
      error: { code: 'upgrade-target-unavailable', message },
    }
  }
}

async function resolveExplicitAsset(
  candidates: string[],
  targetVersion: string,
  repo: string,
  fetcher: UpgradeFetcher = fetch,
): Promise<{ asset: string, url: string }> {
  for (const asset of candidates) {
    const url = buildDownloadUrl(asset, targetVersion, repo)
    let response: Response
    try {
      response = await fetcher(url, { method: 'HEAD', headers: { 'User-Agent': 'xdocs-cli' } })
    } catch {
      return { asset, url }
    }
    await response.body?.cancel().catch(() => undefined)
    if (response.ok) return { asset, url }
    if (response.status !== 404) return { asset, url }
  }
  throw new XDocsError(`No compatible xdocs ${targetVersion} binary is available.`)
}

async function uninstallSelf(options: UninstallOptions = {}): Promise<XDocsUninstallResult> {
  const executablePath = resolveExecutablePath(options)
  await assertNativeInstall(executablePath, 'uninstall')

  if (options.dryRun) return { executablePath, dryRun: true, scheduled: false }

  if (detectNativePlatform() === 'windows') {
    await scheduleWindowsRemoval(executablePath)
    return { executablePath, dryRun: false, scheduled: true }
  }

  await removePath(executablePath, { force: true })
  return { executablePath, dryRun: false, scheduled: false }
}

async function listAvailableVersions(options: SelfManagementOptions = {}): Promise<string[]> {
  return (await fetchReleaseCatalog({
    repo: options.repo,
    platform: detectNativePlatform(),
    arch: detectNativeArch(),
  })).map((release) => release.version)
}

function resolveExecutablePath(options: SelfManagementOptions = {}): string {
  const override = options.executablePath ?? process.env['XDOCS_SELF_PATH']
  return override ? resolvePath(override) : process.execPath
}

function detectNativePlatform(): XDocsNativePlatform {
  if (process.platform === 'linux') return 'linux'
  if (process.platform === 'darwin') return 'darwin'
  if (process.platform === 'win32') return 'windows'
  throw new XDocsError(`Unsupported OS: ${process.platform}`)
}

function detectNativeArch(value: string = process.arch): XDocsNativeArch {
  if (value === 'x64') return 'x64'
  if (value === 'arm64') return 'arm64'
  throw new XDocsError(`Unsupported architecture: ${value}`)
}

function buildAssetCandidates(platform: XDocsNativePlatform, arch: XDocsNativeArch, variant: XDocsNativeVariant): string[] {
  const extension = platform === 'windows' ? '.exe' : ''
  if (arch === 'arm64') return [`xdocs-${platform}-arm64${extension}`]

  if (variant === 'modern') return [`xdocs-${platform}-x64-modern${extension}`, `xdocs-${platform}-x64${extension}`, `xdocs-${platform}-x64-baseline${extension}`]
  if (variant === 'default') return [`xdocs-${platform}-x64${extension}`, `xdocs-${platform}-x64-baseline${extension}`, `xdocs-${platform}-x64-modern${extension}`]
  return [`xdocs-${platform}-x64-baseline${extension}`, `xdocs-${platform}-x64${extension}`, `xdocs-${platform}-x64-modern${extension}`]
}

function parseVariant(value: string | undefined): XDocsNativeVariant {
  if (!value) return 'baseline'
  if (value === 'baseline' || value === 'default' || value === 'modern') return value
  throw new XDocsError(`Invalid --variant value: ${value}. Expected baseline, default, or modern.`)
}

function buildDownloadUrl(asset: string, version: string, repo?: string): string {
  const resolvedRepo = repo ?? process.env['XDOCS_REPO'] ?? defaultRepo
  if (version === 'latest') return `https://github.com/${resolvedRepo}/releases/latest/download/${asset}`
  const tag = encodeURIComponent(version.startsWith('@') ? version : `@guiho/xdocs@${version}`)
  return `https://github.com/${resolvedRepo}/releases/download/${tag}/${asset}`
}

async function assertNativeInstall(executablePath: string, action: string): Promise<void> {
  if (process.env['XDOCS_SELF_PATH']) return
  if (await isSourceCheckout()) throw new XDocsError(`xdocs ${action} is only available from an installed native xdocs binary.`)
  if (!(await pathExists(executablePath))) throw new XDocsError(`Cannot find current xdocs executable at ${executablePath}`)
}

async function isSourceCheckout(): Promise<boolean> {
  try {
    return await Bun.file(new URL('../source/guiho-xdocs-bin.ts', import.meta.url)).exists()
  } catch {
    return false
  }
}

async function scheduleWindowsRemoval(path: string): Promise<void> {
  const script = [
    `$pidToWait = ${process.pid}`,
    'Wait-Process -Id $pidToWait -ErrorAction SilentlyContinue',
    `Remove-Item -LiteralPath ${quotePowerShell(path)} -Force`,
    'Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force',
  ].join('\n')
  const scriptPath = joinPath(dirname(path), `.xdocs-uninstall-${process.pid}.ps1`)
  await writeText(scriptPath, script)
  const proc = Bun.spawn(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'ignore',
  })
  ;(proc as unknown as { unref?: () => void }).unref?.()
}

function quotePowerShell(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}
