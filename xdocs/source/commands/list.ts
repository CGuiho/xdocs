/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { resolve, relative } from 'node:path'
import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { loadConfigOrDefaults } from '../config.js'
import { scanProject } from '../discovery.js'

/** Run the list command. */
export const runList = async (options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const config = await loadConfigOrDefaults(options)
  const targetPath = parsed.positionals[0] ? resolve(options.cwd, parsed.positionals[0]) : options.cwd

  const result = await scanProject(config)
  const relevantFiles = result.xdocsFiles.filter(
    (f) => f.path.startsWith(targetPath),
  )

  // Collect all files with descriptions from metadata
  const fileList: Array<{ file: string, description: string, source: string }> = []

  for (const xdocsFile of relevantFiles) {
    if (!xdocsFile.metadata) continue

    for (const [fileName, description] of Object.entries(xdocsFile.metadata.files)) {
      fileList.push({
        file: fileName,
        description,
        source: xdocsFile.relativePath,
      })
    }
  }

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(fileList, null, 2) + '\n')
    return
  }

  if (fileList.length === 0) {
    const scope = targetPath === options.cwd ? 'project' : relative(options.cwd, targetPath)
    process.stdout.write(`No documented files found in ${scope}.\n`)
    return
  }

  const scope = targetPath === options.cwd ? 'project' : relative(options.cwd, targetPath)
  process.stdout.write(`\nfiles in ${scope}:\n\n`)

  for (const entry of fileList) {
    process.stdout.write(`  ${entry.file}: ${entry.description}\n`)
  }

  process.stdout.write('\n')
}
