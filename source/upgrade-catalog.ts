/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type {
  XDocsNativeArch,
  XDocsNativePlatform,
  XDocsNativeVariant,
  XDocsRelease,
  XDocsReleaseAsset,
  XDocsReleaseChannel,
  XDocsUpgradeListEnvelope,
  XDocsUpgradeRecovery,
} from './types.js'
import { XDocsError } from './errors.js'

export {
  buildUpgradeListEnvelope,
  buildUpgradeRecovery,
  classifyReleaseChannel,
  compareSemanticVersions,
  fetchReleaseCatalog,
  normalizeXDocsVersion,
}

type ReleaseCatalogOptions = {
  repo?: string
  platform: XDocsNativePlatform
  arch: XDocsNativeArch
  variant?: XDocsNativeVariant
  fetcher?: ReleaseFetcher
}

type ReleaseFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type RecoveryOptions = {
  platform: XDocsNativePlatform
  targetVersion: string
  targetSource: XDocsUpgradeRecovery['targetSource']
  installerUrl?: string
}

type GitHubReleaseAsset = {
  name?: unknown
  browser_download_url?: unknown
  size?: unknown
}

type GitHubRelease = {
  tag_name?: unknown
  html_url?: unknown
  published_at?: unknown
  draft?: unknown
  assets?: unknown
}

type SemanticVersion = {
  raw: string
  major: number
  minor: number
  patch: number
  prerelease: string[]
}

const defaultRepo = 'CGuiho/xdocs'
const semanticVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

async function fetchReleaseCatalog(options: ReleaseCatalogOptions): Promise<XDocsRelease[]> {
  const repo = options.repo ?? process.env['XDOCS_REPO'] ?? defaultRepo
  const fetcher = options.fetcher ?? fetch
  const releases: XDocsRelease[] = []
  let url: string | null = `https://api.github.com/repos/${repo}/releases?per_page=100&page=1`

  while (url) {
    const response = await fetcher(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'xdocs-cli' } })
    if (!response.ok) {
      throw new XDocsError(`Failed to fetch the complete xdocs release catalog: ${response.status} ${response.statusText}`)
    }

    const page = await response.json() as unknown
    if (!Array.isArray(page)) throw new XDocsError('GitHub returned a malformed xdocs release catalog page.')

    for (const value of page) {
      const release = normalizeRelease(value, options)
      if (release) releases.push(release)
    }

    url = nextPageUrl(response.headers.get('link'))
  }

  releases.sort(compareReleases)
  const unique = new Map<string, XDocsRelease>()
  for (const release of releases) {
    if (!unique.has(release.version)) unique.set(release.version, release)
  }
  return [...unique.values()]
}

function buildUpgradeListEnvelope(currentVersion: string, releases: XDocsRelease[]): XDocsUpgradeListEnvelope {
  const normalizedCurrent = requireSemanticVersion(currentVersion)
  return {
    schemaVersion: 1,
    command: 'xdocs upgrade list',
    currentVersion: normalizedCurrent,
    latestStableVersion: releases.find((release) => release.channel === 'stable')?.version ?? null,
    releases,
  }
}

function buildUpgradeRecovery(options: RecoveryOptions): XDocsUpgradeRecovery {
  const targetVersion = requireSemanticVersion(options.targetVersion)
  if (options.platform === 'windows') {
    const installerUrl = recoveryInstallerUrl(
      options.installerUrl,
      'https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1',
    )
    return {
      targetVersion,
      targetSource: options.targetSource,
      installCommand: `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$installer = Join-Path $env:TEMP "xdocs-install.ps1"; Invoke-WebRequest "${installerUrl}" -OutFile $installer; & $installer -Version "${targetVersion}"; Remove-Item $installer -Force'`,
      stopProcessCommand: "powershell.exe -NoProfile -Command 'Get-Process xdocs -ErrorAction SilentlyContinue | Stop-Process -Force'",
    }
  }

  const installerUrl = recoveryInstallerUrl(
    options.installerUrl,
    'https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.sh',
  )
  return {
    targetVersion,
    targetSource: options.targetSource,
    installCommand: `curl -fsSL ${installerUrl} | bash -s -- --version '${targetVersion}'`,
    stopProcessCommand: "pkill -x xdocs || true",
  }
}

function recoveryInstallerUrl(value: string | undefined, fallback: string): string {
  const url = value ?? fallback
  if (!/^https?:\/\/[0-9A-Za-z._~:/%=-]+$/.test(url)) {
    throw new XDocsError(`Invalid recovery installer URL: ${url}`)
  }
  return url
}

function normalizeXDocsVersion(value: string): string | null {
  const normalized = value.startsWith('@guiho/xdocs@')
    ? value.slice('@guiho/xdocs@'.length)
    : value.startsWith('v')
      ? value.slice(1)
      : value
  return parseSemanticVersion(normalized) ? normalized : null
}

function compareSemanticVersions(left: string, right: string): number {
  const a = parseSemanticVersion(requireSemanticVersion(left))
  const b = parseSemanticVersion(requireSemanticVersion(right))
  if (!a || !b) return 0

  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] !== b[key]) return a[key] - b[key]
  }

  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0
  if (a.prerelease.length === 0) return 1
  if (b.prerelease.length === 0) return -1

  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    const aPart = a.prerelease[index]
    const bPart = b.prerelease[index]
    if (aPart === undefined) return -1
    if (bPart === undefined) return 1
    if (aPart === bPart) continue
    const aNumeric = /^\d+$/.test(aPart)
    const bNumeric = /^\d+$/.test(bPart)
    if (aNumeric && bNumeric) return Number(aPart) - Number(bPart)
    if (aNumeric) return -1
    if (bNumeric) return 1
    return aPart.localeCompare(bPart)
  }
  return 0
}

function classifyReleaseChannel(version: string): XDocsReleaseChannel {
  const parsed = parseSemanticVersion(requireSemanticVersion(version))
  const first = parsed?.prerelease[0]?.toLowerCase()
  if (!first) return 'stable'
  if (first === 'alpha' || first.startsWith('alpha-')) return 'alpha'
  if (first === 'beta' || first.startsWith('beta-')) return 'beta'
  if (first === 'rc' || first.startsWith('rc-')) return 'rc'
  return 'prerelease'
}

function normalizeRelease(value: unknown, options: ReleaseCatalogOptions): XDocsRelease | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as GitHubRelease
  if (raw.draft === true || typeof raw.tag_name !== 'string') return null
  if (!raw.tag_name.startsWith('@guiho/xdocs@') && !raw.tag_name.startsWith('v')) return null
  const version = normalizeXDocsVersion(raw.tag_name)
  if (!version) return null
  const assets = normalizeAssets(raw.assets)
  const compatibleNames = buildAssetCandidates(options.platform, options.arch, options.variant ?? 'baseline')
  const compatibleAsset = compatibleNames
    .map((name) => assets.find((asset) => asset.name === name) ?? null)
    .find((asset): asset is XDocsReleaseAsset => asset !== null) ?? null

  return {
    version,
    tag: raw.tag_name,
    channel: classifyReleaseChannel(version),
    prerelease: classifyReleaseChannel(version) !== 'stable',
    publishedAt: typeof raw.published_at === 'string' ? raw.published_at : null,
    releaseUrl: typeof raw.html_url === 'string' ? raw.html_url : `https://github.com/${options.repo ?? defaultRepo}/releases/tag/${encodeURIComponent(raw.tag_name)}`,
    assets,
    compatibleAsset,
  }
}

function normalizeAssets(value: unknown): XDocsReleaseAsset[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((assetValue): XDocsReleaseAsset[] => {
    if (!assetValue || typeof assetValue !== 'object') return []
    const asset = assetValue as GitHubReleaseAsset
    if (typeof asset.name !== 'string' || typeof asset.browser_download_url !== 'string') return []
    return [{ name: asset.name, downloadUrl: asset.browser_download_url, size: typeof asset.size === 'number' ? asset.size : null }]
  })
}

function buildAssetCandidates(platform: XDocsNativePlatform, arch: XDocsNativeArch, variant: XDocsNativeVariant): string[] {
  const extension = platform === 'windows' ? '.exe' : ''
  if (arch === 'arm64') return [`xdocs-${platform}-arm64${extension}`]
  if (variant === 'modern') return [`xdocs-${platform}-x64-modern${extension}`, `xdocs-${platform}-x64${extension}`, `xdocs-${platform}-x64-baseline${extension}`]
  if (variant === 'default') return [`xdocs-${platform}-x64${extension}`, `xdocs-${platform}-x64-baseline${extension}`, `xdocs-${platform}-x64-modern${extension}`]
  return [`xdocs-${platform}-x64-baseline${extension}`, `xdocs-${platform}-x64${extension}`, `xdocs-${platform}-x64-modern${extension}`]
}

function parseSemanticVersion(value: string): SemanticVersion | null {
  const match = semanticVersionPattern.exec(value)
  if (!match) return null
  const prerelease = match[4]?.split('.') ?? []
  if (prerelease.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) return null
  return {
    raw: value,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
  }
}

function requireSemanticVersion(value: string): string {
  const normalized = normalizeXDocsVersion(value)
  if (!normalized) throw new XDocsError(`Invalid xdocs semantic version: ${value}`)
  return normalized
}

function compareReleases(a: XDocsRelease, b: XDocsRelease): number {
  const precedence = compareSemanticVersions(b.version, a.version)
  if (precedence !== 0) return precedence
  return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || a.tag.localeCompare(b.tag)
}

function nextPageUrl(link: string | null): string | null {
  if (!link) return null
  for (const segment of link.split(',')) {
    const match = /^\s*<([^>]+)>;\s*rel="([^"]+)"\s*$/.exec(segment)
    if (match?.[2]?.split(/\s+/).includes('next')) return match[1] ?? null
  }
  return null
}
