/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { loadConfigOrDefaults } from '../config.js'
import { scanProject } from '../discovery.js'
import { buildTree, validateTree, renderTree, renderTreeMarkdown } from '../tree.js'
import { stringFlag } from '../flags.js'

/** Run the tree command. */
export const runTree = async (options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const config = await loadConfigOrDefaults(options)
  const outputPath = stringFlag(parsed.flags, 'output')

  const result = await scanProject(config)
  const tree = buildTree(result.xdocsFiles)

  // Validate tree integrity
  if (options.verbose) {
    const validation = validateTree(result.xdocsFiles)

    if (validation.warnings.length > 0) {
      process.stderr.write('\nwarnings:\n')
      for (const warning of validation.warnings) {
        process.stderr.write(`  ${warning}\n`)
      }
    }

    if (validation.errors.length > 0) {
      process.stderr.write('\nerrors:\n')
      for (const error of validation.errors) {
        process.stderr.write(`  ${error}\n`)
      }
    }
  }

  let content: string

  if (options.format === 'markdown') {
    content = `# Project Hierarchy\n\n${renderTreeMarkdown(tree)}\n`
  } else if (options.format === 'json') {
    content = JSON.stringify(tree, null, 2) + '\n'
  } else {
    content = renderTree(tree) + '\n'
  }

  if (outputPath) {
    await writeFile(resolve(options.cwd, outputPath), content, 'utf8')
    process.stdout.write(`tree: ${outputPath}\n`)
  } else {
    process.stdout.write(content)
  }
}
