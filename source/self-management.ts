/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { existsSync } from 'node:fs'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'

import type {
  XDocsNativeArch,
  XDocsNativePlatform,
  XDocsNativeVariant,
  XDocsUninstallResult,
  XDocsUpdateCache,
  XDocsUpgradeResult,
} from './types.js'
import { XDocsError } from './errors.js'
import { readPackageVersion } from './help.js'

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

type GitHubRelease = {
  readonly tag_name?: string
  readonly html_url?: string
}

type SelfManagementOptions = {
  readonly repo?: string
  readonly cacheDir?: string
  readonly executablePath?: string
}

type UpgradeOptions = SelfManagementOptions & {
  readonly version?: string
  readonly arch?: string
  readonly variant?: string
  readonly dryRun?: boolean
}

type UninstallOptions = SelfManagementOptions & {
  readonly dryRun?: boolean
}

async function readUpdateCache(options: SelfManagementOptions = {}): Promise<XDocsUpdateCache | null> {
  try {
    const content = await readFile(resolveCachePath(options), 'utf8')
    const parsed = JSON.parse(content) as Partial<XDocsUpdateCache>
    if (!parsed.checkedAt || !parsed.currentVersion || !parsed.latestVersion || typeof parsed.updateAvailable !== 'boolean') return null

    return {
      checkedAt: parsed.checkedAt,
      currentVersion: parsed.currentVersion,
      latestVersion: parsed.latestVersion,
      updateAvailable: parsed.updateAvailable,
      releaseUrl: parsed.releaseUrl ?? '',
    }
  } catch {
    return null
  }
}

async function writeUpdateCache(cache: XDocsUpdateCache, options: SelfManagementOptions = {}): Promise<void> {
  const path = resolveCachePath(options)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(cache, null, 2) + '\n', 'utf8')
}

function resolveCachePath(options: SelfManagementOptions = {}): string {
  const cacheDirectory = options.cacheDir ?? process.env['XDOCS_CACHE_DIR'] ?? defaultCacheDirectory()
  return join(cacheDirectory, 'update.json')
}

async function checkForLatestVersion(options: SelfManagementOptions = {}): Promise<XDocsUpdateCache> {
  const currentVersion = readPackageVersion()
  const latest = await fetchLatestRelease(options.repo)
  const latestVersion = normalizeVersion(latest.version)
  const cache: XDocsUpdateCache = {
    checkedAt: new Date().toISOString(),
    currentVersion,
    latestVersion,
    updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
    releaseUrl: latest.url,
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
  if (cache && Date.now() - Date.parse(cache.checkedAt) < cacheTtlMilliseconds) return false
  if (await isSourceCheckout()) return false

  try {
    const proc = Bun.spawn([resolveExecutablePath(options), 'xdocs-update-check-worker'], {
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

async function upgradeSelf(options: UpgradeOptions = {}): Promise<XDocsUpgradeResult> {
  const executablePath = resolveExecutablePath(options)
  await assertNativeInstall(executablePath, 'upgrade')

  const targetVersion = options.version ? normalizeVersion(options.version) : (await fetchLatestRelease(options.repo)).version
  const currentVersion = readPackageVersion()
  if (compareVersions(targetVersion, currentVersion) === 0) {
    return { currentVersion, targetVersion, executablePath, dryRun: Boolean(options.dryRun), scheduled: false, upToDate: true }
  }
  const platform = detectNativePlatform()
  const arch = detectNativeArch(options.arch)
  const variant = parseVariant(options.variant)
  const candidates = buildAssetCandidates(platform, arch, variant)

  let lastStatus = ''
  for (const asset of candidates) {
    const url = buildDownloadUrl(asset, targetVersion, options.repo)
    const temporaryPath = join(dirname(executablePath), `.xdocs-upgrade-${process.pid}-${asset}`)

    if (options.dryRun) {
      return { currentVersion, targetVersion, asset, url, executablePath, dryRun: true, scheduled: false, upToDate: false }
    }

    const response = await fetch(url)
    if (!response.ok) {
      lastStatus = `${response.status} ${response.statusText}`
      continue
    }

    await Bun.write(temporaryPath, response)
    const valid = await isNativeBinary(temporaryPath, platform)
    if (!valid) {
      await rm(temporaryPath, { force: true })
      lastStatus = 'download was not a native binary'
      continue
    }

    if (platform === 'windows') {
      await writeUpdateCache({
        checkedAt: new Date().toISOString(),
        currentVersion: targetVersion,
        latestVersion: targetVersion,
        updateAvailable: false,
        releaseUrl: `https://github.com/${options.repo ?? process.env['XDOCS_REPO'] ?? defaultRepo}/releases/tag/${encodeURIComponent(`@guiho/xdocs@${targetVersion}`)}`,
      }, options)
      await scheduleWindowsReplacement(temporaryPath, executablePath)
      return { currentVersion, targetVersion, asset, url, executablePath, dryRun: false, scheduled: true, upToDate: false }
    }

    await chmod(temporaryPath, 0o755)
    await rename(temporaryPath, executablePath)
    await writeUpdateCache({
      checkedAt: new Date().toISOString(),
      currentVersion: targetVersion,
      latestVersion: targetVersion,
      updateAvailable: false,
      releaseUrl: `https://github.com/${options.repo ?? process.env['XDOCS_REPO'] ?? defaultRepo}/releases/tag/${encodeURIComponent(`@guiho/xdocs@${targetVersion}`)}`,
    }, options)
    return { currentVersion, targetVersion, asset, url, executablePath, dryRun: false, scheduled: false, upToDate: false }
  }

  throw new XDocsError(`No compatible xdocs binary found for ${platform}/${arch}. Last status: ${lastStatus || 'unknown'}`)
}

async function uninstallSelf(options: UninstallOptions = {}): Promise<XDocsUninstallResult> {
  const executablePath = resolveExecutablePath(options)
  await assertNativeInstall(executablePath, 'uninstall')

  if (options.dryRun) return { executablePath, dryRun: true, scheduled: false }

  if (detectNativePlatform() === 'windows') {
    await scheduleWindowsRemoval(executablePath)
    return { executablePath, dryRun: false, scheduled: true }
  }

  await rm(executablePath, { force: true })
  return { executablePath, dryRun: false, scheduled: false }
}

async function listAvailableVersions(options: SelfManagementOptions = {}): Promise<string[]> {
  const repo = options.repo ?? process.env['XDOCS_REPO'] ?? defaultRepo
  const response = await fetch(`https://api.github.com/repos/${repo}/releases`, {
    headers: { 'User-Agent': 'xdocs-cli' },
  })

  if (!response.ok) throw new XDocsError(`Failed to fetch xdocs releases: ${response.status} ${response.statusText}`)

  const releases = await response.json() as GitHubRelease[]
  return releases
    .map((release) => release.tag_name)
    .filter((tag): tag is string => typeof tag === 'string')
    .map(normalizeVersion)
}

function resolveExecutablePath(options: SelfManagementOptions = {}): string {
  const override = options.executablePath ?? process.env['XDOCS_SELF_PATH']
  return override ? resolve(override) : process.execPath
}

function detectNativePlatform(): XDocsNativePlatform {
  if (process.platform === 'linux') return 'linux'
  if (process.platform === 'darwin') return 'macos'
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

function normalizeVersion(version: string): string {
  return version.replace(/^@guiho\/xdocs@/, '').replace(/^v/, '')
}

function compareVersions(a: string, b: string): number {
  const left = normalizeVersion(a).split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0)
  const right = normalizeVersion(b).split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)
    if (diff !== 0) return diff
  }

  return 0
}

async function fetchLatestRelease(repo?: string): Promise<{ version: string, url: string }> {
  const resolvedRepo = repo ?? process.env['XDOCS_REPO'] ?? defaultRepo
  const response = await fetch(`https://api.github.com/repos/${resolvedRepo}/releases/latest`, {
    headers: { 'User-Agent': 'xdocs-cli' },
  })

  if (!response.ok) throw new XDocsError(`Failed to fetch latest xdocs release: ${response.status} ${response.statusText}`)

  const release = await response.json() as GitHubRelease
  if (!release.tag_name) throw new XDocsError('Latest xdocs release did not include a tag name')
  return { version: normalizeVersion(release.tag_name), url: release.html_url ?? `https://github.com/${resolvedRepo}/releases/latest` }
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

async function assertNativeInstall(executablePath: string, action: string): Promise<void> {
  if (process.env['XDOCS_SELF_PATH']) return
  if (await isSourceCheckout()) throw new XDocsError(`xdocs ${action} is only available from an installed native xdocs binary.`)
  if (!existsSync(executablePath)) throw new XDocsError(`Cannot find current xdocs executable at ${executablePath}`)
}

async function isSourceCheckout(): Promise<boolean> {
  try {
    return await Bun.file(new URL('../source/guiho-xdocs-bin.ts', import.meta.url)).exists()
  } catch {
    return false
  }
}

async function scheduleWindowsReplacement(source: string, destination: string): Promise<void> {
  const script = [
    `$pidToWait = ${process.pid}`,
    'Wait-Process -Id $pidToWait -ErrorAction SilentlyContinue',
    `Move-Item -LiteralPath ${quotePowerShell(source)} -Destination ${quotePowerShell(destination)} -Force`,
    'Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force',
  ].join('\n')
  const scriptPath = join(dirname(source), `.xdocs-upgrade-${process.pid}.ps1`)
  await writeFile(scriptPath, script, 'utf8')
  const proc = Bun.spawn(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'ignore',
  })
  ;(proc as unknown as { unref?: () => void }).unref?.()
}

async function scheduleWindowsRemoval(path: string): Promise<void> {
  const script = [
    `$pidToWait = ${process.pid}`,
    'Wait-Process -Id $pidToWait -ErrorAction SilentlyContinue',
    `Remove-Item -LiteralPath ${quotePowerShell(path)} -Force`,
    'Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force',
  ].join('\n')
  const scriptPath = join(dirname(path), `.xdocs-uninstall-${process.pid}.ps1`)
  await writeFile(scriptPath, script, 'utf8')
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

function defaultCacheDirectory(): string {
  if (process.platform === 'win32') return join(process.env['LOCALAPPDATA'] ?? homedir(), 'xdocs')
  return join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'xdocs')
}
