/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { booleanFlag, stringFlag } from '../flags.js'
import { checkForLatestVersion, listAvailableVersions, upgradeSelf } from '../self-management.js'

export { runUpgrade }

async function runUpgrade(options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> {
  const subcommand = parsed.positionals[0]

  if (subcommand === 'check') {
    const result = await checkForLatestVersion()
    if (options.format === 'json') {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n')
      return
    }

    process.stdout.write(`current: ${result.currentVersion}\n`)
    process.stdout.write(`latest: ${result.latestVersion}\n`)
    process.stdout.write(`update_available: ${result.updateAvailable}\n`)
    if (result.updateAvailable) process.stdout.write('Run: xdocs upgrade\n')
    return
  }

  if (subcommand === 'list') {
    const versions = await listAvailableVersions()
    if (options.format === 'json') {
      process.stdout.write(JSON.stringify({ versions }, null, 2) + '\n')
      return
    }

    process.stdout.write('Available xdocs versions\n\n')
    for (const [index, version] of versions.entries()) {
      process.stdout.write(index === 0 ? `  latest  ${version}\n` : `          ${version}\n`)
    }
    return
  }

  const result = await upgradeSelf({
    version: stringFlag(parsed.flags, 'version'),
    arch: stringFlag(parsed.flags, 'arch'),
    variant: stringFlag(parsed.flags, 'variant'),
    dryRun: booleanFlag(parsed.flags, 'dryRun'),
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
