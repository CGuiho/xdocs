/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions } from '../types.js'
import { checkForLatestVersion, listAvailableVersions, upgradeSelf } from '../self-management.js'

export { runUpgrade, runUpgradeCheck, runUpgradeList }

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

  process.stdout.write(`current: ${result.currentVersion}\n`)
  process.stdout.write(`latest: ${result.latestVersion}\n`)
  process.stdout.write(`update_available: ${result.updateAvailable}\n`)
  if (result.updateAvailable) process.stdout.write('Run: xdocs upgrade\n')
}

async function runUpgradeList(options: XDocsCliOptions): Promise<void> {
  const versions = await listAvailableVersions()
  if (options.format === 'json') {
    process.stdout.write(JSON.stringify({ versions }, null, 2) + '\n')
    return
  }

  process.stdout.write('Available xdocs versions\n\n')
  for (const [index, version] of versions.entries()) {
    process.stdout.write(index === 0 ? `  latest  ${version}\n` : `          ${version}\n`)
  }
}

async function runUpgrade(options: XDocsCliOptions, input: XDocsUpgradeInput = {}): Promise<void> {
  const result = await upgradeSelf({
    version: input.version,
    arch: input.arch,
    variant: input.variant,
    dryRun: input.dryRun,
  })

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  process.stdout.write('------------------------------------------------------------\n')
  process.stdout.write('  xdocs upgrade\n')
  process.stdout.write('------------------------------------------------------------\n')
  process.stdout.write(`  current : ${result.currentVersion}\n`)
  process.stdout.write(`  target  : ${result.targetVersion}\n`)
  if (result.upToDate) {
    process.stdout.write('------------------------------------------------------------\n')
    process.stdout.write('Already up to date.\n')
    return
  }
  process.stdout.write(`  binary  : ${result.asset}\n`)
  process.stdout.write(`  path    : ${result.executablePath}\n`)
  process.stdout.write('------------------------------------------------------------\n')
  if (result.dryRun) {
    process.stdout.write(`  url     : ${result.url}\n`)
    process.stdout.write('  dry_run : true\n')
    return
  }

  process.stdout.write(result.scheduled
    ? 'Upgrade downloaded. Replacement is scheduled after this xdocs process exits.\n'
    : 'Upgrade complete.\n')
}
