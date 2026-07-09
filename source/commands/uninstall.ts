/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { booleanFlag } from '../flags.js'
import { uninstallSelf } from '../self-management.js'

export { runUninstall }

async function runUninstall(options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> {
  const result = await uninstallSelf({ dryRun: booleanFlag(parsed.flags, 'dryRun') })

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  process.stdout.write('xdocs uninstall\n')
  process.stdout.write(`path: ${result.executablePath}\n`)
  if (result.dryRun) {
    process.stdout.write('dry_run: true\n')
    return
  }

  process.stdout.write(result.scheduled
    ? 'Uninstall scheduled after this xdocs process exits.\n'
    : 'Uninstall complete.\n')
}
