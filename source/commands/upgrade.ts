/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsUpgradeEnvelope, XDocsUpgradeEvent, XDocsUpgradePlan } from '../types.js'
import { XDocsError } from '../errors.js'
import { readPackageVersion } from '../help.js'
import { detectNativeArch, detectNativePlatform, checkForLatestVersion, upgradeSelf } from '../self-management.js'
import { buildUpgradeListEnvelope, fetchReleaseCatalog } from '../upgrade-catalog.js'

export { renderEvent, renderPlan, renderTerminal, runUpgrade, runUpgradeCheck, runUpgradeList }

type XDocsUpgradeInput = {
  version?: string
  arch?: string
  variant?: string
  dryRun?: boolean
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

async function runUpgradeList(options: XDocsCliOptions): Promise<void> {
  const platform = detectNativePlatform()
  const arch = detectNativeArch()
  const releases = await fetchReleaseCatalog({ platform, arch })
  const envelope = buildUpgradeListEnvelope(readPackageVersion(), releases)
  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(envelope, null, 2) + '\n')
    return
  }

  if (options.format === 'markdown') {
    process.stdout.write('# xdocs upgrade list\n\n')
    process.stdout.write('| Version | Tag | Channel | Published | Asset | Asset Name | Markers |\n')
    process.stdout.write('| --- | --- | --- | --- | --- | --- | --- |\n')
    for (const release of releases) {
      process.stdout.write(`| ${release.version} | ${release.tag} | ${release.channel} | ${release.publishedAt ?? '-'} | ${release.compatibleAsset ? 'yes' : 'no'} | ${release.compatibleAsset?.name ?? '-'} | ${releaseMarkers(release.version, envelope.currentVersion, envelope.latestStableVersion)} |\n`)
    }
    if (releases.length === 0) process.stdout.write('| _No published releases_ | - | - | - | - | - | - |\n')
    return
  }

  process.stdout.write('AVAILABLE XDOCS VERSIONS\n\n')
  process.stdout.write('Version                   Tag                                  Channel      Published                  Asset  Asset Name                               Markers\n')
  process.stdout.write('-----------------------------------------------------------------------------------------------------------------------------------------------------------\n')
  for (const release of releases) {
    process.stdout.write(`${pad(release.version, 25)} ${pad(release.tag, 36)} ${pad(release.channel, 12)} ${pad(release.publishedAt ?? '-', 26)} ${pad(release.compatibleAsset ? 'yes' : 'no', 6)} ${pad(release.compatibleAsset?.name ?? '-', 40)} ${releaseMarkers(release.version, envelope.currentVersion, envelope.latestStableVersion)}\n`)
  }
  if (releases.length === 0) process.stdout.write('No published xdocs releases found.\n')
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
  if (event.status !== 'started' || event.phase === 'plan') return
  const label: Record<XDocsUpgradeEvent['phase'], string> = {
    plan: 'Planning', download: 'Downloading', validate: 'Validating', replace: 'Replacing',
    verify: 'Verifying', cache: 'Updating cache', cleanup: 'Cleaning up',
  }
  process.stdout.write(options.format === 'markdown' ? `**${label[event.phase]}...**\n\n` : `${label[event.phase]}...\n`)
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
