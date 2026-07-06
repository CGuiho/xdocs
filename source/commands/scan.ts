/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { loadConfigOrDefaults } from '../config.js'
import { scanProject } from '../discovery.js'

/** Run the scan command. */
export const runScan = async (options: XDocsCliOptions, _parsed: XDocsParsedArgs): Promise<void> => {
  const config = await loadConfigOrDefaults(options)
  const result = await scanProject(config)

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify({
      totalFiles: result.totalFiles,
      totalDirectories: result.totalDirectories,
      totalMarkdownDocuments: result.totalMarkdownDocuments,
      coveredDirectories: result.coveredDirectories,
      uncoveredDirectories: result.uncoveredDirectories,
      xdocsFiles: result.xdocsFiles.map((f) => ({
        path: f.relativePath,
        valid: f.valid,
        subject: f.metadata?.subject ?? null,
        keywords: f.metadata?.keywords ?? null,
        documents: f.metadata?.documents ?? null,
        discoveredDocuments: f.documents.map((document) => document.relativePath),
        errors: f.errors,
      })),
      markdownDocuments: result.markdownDocuments.map((document) => document.relativePath),
      uncoveredPaths: result.uncoveredPaths,
    }, null, 2) + '\n')
    return
  }

  process.stdout.write(`\nxdocs scan\n\n`)
  process.stdout.write(`descriptor extension: ${config.extensions.supported.join(', ')}\n`)
  process.stdout.write(`total files scanned: ${result.totalFiles}\n`)
  process.stdout.write(`total directories: ${result.totalDirectories}\n`)
  process.stdout.write(`markdown documents found: ${result.totalMarkdownDocuments}\n`)
  process.stdout.write(`covered directories: ${result.coveredDirectories}\n`)
  process.stdout.write(`uncovered directories: ${result.uncoveredDirectories}\n`)
  process.stdout.write(`xdocs descriptors found: ${result.xdocsFiles.length}\n`)

  if (result.xdocsFiles.length > 0) {
    process.stdout.write(`\nfiles:\n`)
    for (const file of result.xdocsFiles) {
      const isRootIndex = file.relativePath === 'XDOCS.md' && !file.metadata
      const status = isRootIndex ? 'root index' : (file.valid ? 'valid' : 'incomplete')
      const subject = file.metadata?.subject ? ` (${file.metadata.subject})` : ''
      process.stdout.write(`  ${file.relativePath} [${status}]${subject}\n`)

      if (options.verbose && file.errors.length > 0) {
        for (const error of file.errors) {
          process.stdout.write(`    error: ${error}\n`)
        }
      }

      if (options.verbose && file.documents.length > 0) {
        for (const document of file.documents) {
          process.stdout.write(`    document: ${document.name}\n`)
        }
      }
    }
  }

  if (options.verbose && result.uncoveredPaths.length > 0) {
    process.stdout.write(`\nuncovered directories:\n`)
    for (const uncovered of result.uncoveredPaths) {
      process.stdout.write(`  ${uncovered}\n`)
    }
  }

  process.stdout.write('\n')
}
