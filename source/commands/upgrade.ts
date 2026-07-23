/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsUpgradeEnvelope, XDocsUpgradeEvent, XDocsUpgradeListEnvelope, XDocsUpgradePlan } from '../types.js'
import { XDocsError } from '../errors.js'
import { readPackageVersion } from '../help.js'
import { detectNativeArch, detectNativePlatform, checkForLatestVersion, upgradeSelf } from '../self-management.js'
import { buildUpgradeListEnvelope, fetchReleaseCatalog } from '../upgrade-catalog.js'

export { renderEvent, renderPlan, renderTerminal, renderUpgradeList, runUpgrade, runUpgradeCheck, runUpgradeList }

type XDocsUpgradeInput = {
  version?: string
  arch?: string
  variant?: string
  dryRun?: boolean
}

type XDocsUpgradeListInput = {
  page?: number
  size?: number
}

async function runUpgradeCheck(options: XDocsCliOptions): Promise<void> {
  const result = await checkForLatestVersion()
  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  process.stdout.write(`current: ${readPackageVersion()}\n`)
  process.stdout.write(`latest: ${result.latestVersion}\n`)
  process.stdout.write(`update_available: ${result.newVersionAvailable}\n`)
  if (result.newVersionAvailable) process.stdout.write('Run: xdocs upgrade\n')
}

async function runUpgradeList(options: XDocsCliOptions, input: XDocsUpgradeListInput = {}): Promise<void> {
  const platform = detectNativePlatform()
  const arch = detectNativeArch()
  const releases = await fetchReleaseCatalog({ platform, arch })
  const envelope = buildUpgradeListEnvelope(readPackageVersion(), releases, input.page ?? 1, input.size ?? 8)
  renderUpgradeList(options, envelope)
}

function renderUpgradeList(options: XDocsCliOptions, envelope: XDocsUpgradeListEnvelope): void {
  const visibleReleases = envelope.releases
  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(envelope, null, 2) + '\n')
    return
  }

  if (options.format === 'markdown') {
    process.stdout.write('# xdocs upgrade list\n\n')
    process.stdout.write('| Version | Tag | Channel | Published | Asset | Asset Name | Markers |\n')
    process.stdout.write('| --- | --- | --- | --- | --- | --- | --- |\n')
    for (const release of visibleReleases) {
      process.stdout.write(`| ${release.version} | ${release.tag} | ${release.channel} | ${release.publishedAt ?? '-'} | ${release.compatibleAsset ? 'yes' : 'no'} | ${release.compatibleAsset?.name ?? '-'} | ${releaseMarkers(release.version, envelope.currentVersion, envelope.latestStableVersion)} |\n`)
    }
    if (visibleReleases.length === 0) process.stdout.write('| _No releases on this page_ | - | - | - | - | - | - |\n')
    renderPageNavigation(options, envelope)
    return
  }

  process.stdout.write('AVAILABLE XDOCS VERSIONS\n\n')
  renderTextReleaseTable(envelope)
  if (visibleReleases.length === 0) process.stdout.write(envelope.pagination.totalItems === 0 ? 'No published xdocs releases found.\n' : 'No xdocs releases exist on this page.\n')
  renderPageNavigation(options, envelope)
}

function renderTextReleaseTable(envelope: XDocsUpgradeListEnvelope): void {
  const headers = ['VERSION', 'CHANNEL', 'PUBLISHED', 'CURRENT', 'LATEST', 'ASSET']
  const rows = envelope.releases.map((release) => [
    release.version,
    release.channel,
    release.publishedAt?.slice(0, 10) ?? '-',
    release.version === envelope.currentVersion ? 'yes' : '',
    release.version === envelope.latestStableVersion ? 'yes' : '',
    release.compatibleAsset ? 'yes' : 'no',
  ])
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)))
  const renderRow = (row: string[]) =>
    row.map((value, index) => value.padEnd(widths[index] ?? value.length)).join('  ').trimEnd()

  process.stdout.write(renderRow(headers) + '\n')
  for (const row of rows) process.stdout.write(renderRow(row) + '\n')
}

function renderPageNavigation(options: XDocsCliOptions, envelope: XDocsUpgradeListEnvelope): void {
  const page = envelope.pagination
  const commands = [page.previousCommand, page.nextCommand].filter((value): value is string => value !== null)
  if (commands.length === 0) return
  if (options.format === 'markdown') {
    process.stdout.write('\nMore versions are available.\n\n')
    for (const command of commands) process.stdout.write(`- \`${command}\`\n`)
    return
  }
  process.stdout.write('\nMore versions are available.\n')
  for (const command of commands) process.stdout.write(`Run: ${command}\n`)
}

async function runUpgrade(options: XDocsCliOptions, input: XDocsUpgradeInput = {}): Promise<void> {
  const streaming = options.format !== 'json'
  const result = await upgradeSelf({
    version: input.version,
    arch: input.arch,
    variant: input.variant,
    dryRun: input.dryRun,
    onPlan: streaming ? (plan) => renderPlan(options, plan) : undefined,
    onEvent: streaming ? (event) => renderEvent(options, event) : undefined,
  })

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  } else {
    renderTerminal(options, result)
  }

  if (result.outcome === 'failed' || result.outcome === 'rolled-back') {
    throw new XDocsError(result.error?.message ?? 'xdocs upgrade failed.', result.plan ? 5 : 4)
  }
}

function renderPlan(options: XDocsCliOptions, plan: XDocsUpgradePlan): void {
  if (options.format === 'markdown') {
    process.stdout.write('# xdocs upgrade\n\n')
    process.stdout.write('| Field | Value |\n| --- | --- |\n')
    for (const [field, value] of planFields(plan)) process.stdout.write(`| ${field} | ${value} |\n`)
    process.stdout.write('\n')
    return
  }

  process.stdout.write('------------------------------------------------------------\n')
  process.stdout.write('  Upgrading the CLI\n')
  process.stdout.write('------------------------------------------------------------\n')
  for (const [field, value] of planFields(plan)) process.stdout.write(`  ${pad(field, 8)}: ${value}\n`)
  process.stdout.write('------------------------------------------------------------\n')
}

function renderEvent(options: XDocsCliOptions, event: XDocsUpgradeEvent): void {
  if (event.status === 'progress' && event.phase === 'download' && event.progress) {
    const line = renderDownloadProgress(event.progress)
    process.stdout.write(options.format === 'markdown' ? `\`${line}\`\n\n` : `${line}\n`)
    return
  }
  if (event.status !== 'started' || event.phase === 'plan') return
  const label: Record<XDocsUpgradeEvent['phase'], string> = {
    plan: 'Planning', download: 'Downloading', validate: 'Validating', replace: 'Replacing',
    verify: 'Verifying', cache: 'Updating cache', cleanup: 'Cleaning up',
  }
  process.stdout.write(options.format === 'markdown' ? `**${label[event.phase]}...**\n\n` : `${label[event.phase]}...\n`)
}

function renderDownloadProgress(progress: NonNullable<XDocsUpgradeEvent['progress']>): string {
  if (progress.percent === null || progress.totalBytes === null) {
    return `Download progress: ${formatBytes(progress.receivedBytes)} received`
  }
  const width = 40
  const filled = Math.min(width, Math.max(0, Math.round((progress.percent / 100) * width)))
  const bar = '#'.repeat(filled) + '-'.repeat(width - filled)
  return `[${bar}] ${progress.percent.toFixed(1)}% (${formatBytes(progress.receivedBytes)}/${formatBytes(progress.totalBytes)})`
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`
}

function renderTerminal(options: XDocsCliOptions, envelope: XDocsUpgradeEnvelope): void {
  const resultLine = terminalLine(envelope)
  if (options.format === 'markdown') {
    process.stdout.write(`**${resultLine}**\n\n`)
    if (envelope.recovery.targetSource === 'fallback-current' && envelope.plan === null) {
      process.stdout.write(`Target discovery failed. Repair fallback: reinstalling currently installed xdocs ${envelope.recovery.targetVersion}.\n\n`)
    }
    process.stdout.write(`If the new version is not active, install XDocs ${envelope.recovery.targetVersion} directly:\n\n`)
    process.stdout.write(`\`\`\`text\n${envelope.recovery.installCommand}\n\`\`\`\n\n`)
    process.stdout.write('If XDocs is still running and blocks installation, stop it first:\n\n')
    process.stdout.write(`\`\`\`text\n${envelope.recovery.stopProcessCommand}\n\`\`\`\n`)
    return
  }

  process.stdout.write(`${resultLine}\n\n`)
  if (envelope.recovery.targetSource === 'fallback-current' && envelope.plan === null) {
    process.stdout.write(`Target discovery failed. Repair fallback: reinstalling currently installed xdocs ${envelope.recovery.targetVersion}.\n`)
  }
  process.stdout.write(`If the new version is not active, install XDocs ${envelope.recovery.targetVersion} directly:\n`)
  process.stdout.write(`  ${envelope.recovery.installCommand}\n`)
  process.stdout.write('If XDocs is still running and blocks installation, stop it first:\n')
  process.stdout.write(`  ${envelope.recovery.stopProcessCommand}\n`)
}

function terminalLine(envelope: XDocsUpgradeEnvelope): string {
  if (envelope.outcome === 'upgraded' && envelope.plan) return `Upgrade complete: ${envelope.plan.currentVersion} -> ${envelope.plan.targetVersion}`
  if (envelope.outcome === 'up-to-date') return 'Already up to date.'
  if (envelope.outcome === 'dry-run') return 'Dry run complete; no executable was changed.'
  if (envelope.outcome === 'rolled-back') return `Upgrade failed and the previous executable was restored: ${envelope.error?.message ?? 'unknown error'}`
  return `Upgrade failed: ${envelope.error?.message ?? 'unknown error'}`
}

function planFields(plan: XDocsUpgradePlan): Array<[string, string]> {
  return [
    ['current', plan.currentVersion], ['target', plan.targetVersion], ['os', plan.platform], ['arch', plan.arch],
    ['binary', plan.assetName], ['path', plan.executablePath], ['url', plan.downloadUrl],
  ]
}

function releaseMarkers(version: string, current: string, latestStable: string | null): string {
  return [version === current ? 'current' : '', version === latestStable ? 'latest stable' : ''].filter(Boolean).join(', ')
}

function pad(value: string, length: number): string {
  return value + ' '.repeat(Math.max(1, length - value.length))
}
