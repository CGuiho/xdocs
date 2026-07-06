/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { loadConfigOrDefaults } from '../config.js'
import { scanProject } from '../discovery.js'
import { stringFlag } from '../flags.js'

/** Run the merge command. */
export const runMerge = async (options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const config = await loadConfigOrDefaults(options)
  const targetPath = parsed.positionals[0] ? resolve(options.cwd, parsed.positionals[0]) : options.cwd
  const outputPath = stringFlag(parsed.flags, 'output')

  const result = await scanProject(config)
  const relevantFiles = result.xdocsFiles.filter(
    (f) => f.path.startsWith(targetPath),
  )

  if (relevantFiles.length === 0) {
    process.stdout.write('No xdocs descriptors found in the specified path.\n')
    return
  }

  const lines: string[] = []

  for (const file of relevantFiles) {
    lines.push(`<!-- source: ${file.relativePath} -->`)

    if (file.metadata) {
      lines.push(`# ${file.metadata.subject}`, '')
      lines.push(file.metadata.description, '')

      if (file.metadata.keywords.length > 0) {
        lines.push(`Keywords: ${file.metadata.keywords.map((keyword) => `\`${keyword}\``).join(', ')}`, '')
      }

      const fileEntries = Object.entries(file.metadata.files)
      if (fileEntries.length > 0) {
        lines.push('## Files', '')
        for (const [name, desc] of fileEntries) {
          lines.push(`- \`${name}\`: ${desc}`)
        }
        lines.push('')
      }

      const documentEntries = Object.entries(file.metadata.documents)
      if (documentEntries.length > 0) {
        lines.push('## Documents', '')
        for (const [name, desc] of documentEntries) {
          lines.push(`- \`${name}\`: ${desc}`)
        }
        lines.push('')
      }

      if (file.metadata.children.length > 0) {
        lines.push('## Submodules', '')
        for (const child of file.metadata.children) {
          lines.push(`- ${child}`)
        }
        lines.push('')
      }
    }

    if (file.body.trim()) {
      lines.push(file.body.trim(), '')
    }

    lines.push('---', '')
  }

  const content = lines.join('\n')

  if (outputPath) {
    await writeFile(resolve(options.cwd, outputPath), content, 'utf8')
    process.stdout.write(`merged: ${outputPath} (${relevantFiles.length} files)\n`)
  } else {
    process.stdout.write(content)
  }
}
