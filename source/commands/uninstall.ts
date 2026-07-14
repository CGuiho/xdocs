/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions } from '../types.js'
import { uninstallSelf } from '../self-management.js'

export { runUninstall }

async function runUninstall(options: XDocsCliOptions, input: { dryRun?: boolean } = {}): Promise<void> {
  const result = await uninstallSelf({ dryRun: input.dryRun })

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
