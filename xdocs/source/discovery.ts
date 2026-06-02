/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { XDocsConfig, XDocsFile, XDocsScanResult } from './types.js'
import { parseXDocsFile } from './metadata.js'

/** Scan the project for xdocs files matching configured extensions. */
export const scanProject = async (config: XDocsConfig): Promise<XDocsScanResult> => {
  const xdocsFiles: XDocsFile[] = []
  const allDirectories: string[] = []
  const coveredDirectories = new Set<string>()
  let totalFiles = 0

  await walkDirectory(config.cwd, config, async (filePath, dir) => {
    totalFiles += 1

    if (isXDocsFile(filePath, config.extensions.supported)) {
      const file = await parseXDocsFile(filePath, config.cwd)
      xdocsFiles.push(file)
      coveredDirectories.add(dir)
    }
  }, allDirectories)

  // The root XDOCS.md is always recognized
  const rootXDocs = join(config.cwd, 'XDOCS.md')
  const rootAlreadyFound = xdocsFiles.some((f) => f.path === rootXDocs)

  if (!rootAlreadyFound) {
    try {
      const rootStat = await stat(rootXDocs)
      if (rootStat.isFile()) {
        const file = await parseXDocsFile(rootXDocs, config.cwd)
        xdocsFiles.push(file)
        coveredDirectories.add(config.cwd)
      }
    } catch {
      // Root XDOCS.md does not exist, that's fine
    }
  }

  const uncoveredPaths = allDirectories.filter((dir) => !coveredDirectories.has(dir))

  return {
    totalFiles,
    totalDirectories: allDirectories.length,
    coveredDirectories: coveredDirectories.size,
    uncoveredDirectories: uncoveredPaths.length,
    xdocsFiles,
    uncoveredPaths,
  }
}

/** Check if a file path matches any of the configured xdocs extensions. */
export const isXDocsFile = (filePath: string, extensions: string[]): boolean => {
  const lower = filePath.toLowerCase()

  // Root XDOCS.md is always recognized
  if (lower.endsWith('/xdocs.md') || lower.endsWith('\\xdocs.md')) return true

  return extensions.some((ext) => lower.endsWith(ext.toLowerCase()))
}

/** Recursively walk a directory, skipping excluded directories. */
const walkDirectory = async (
  dir: string,
  config: XDocsConfig,
  onFile: (filePath: string, directory: string) => Promise<void>,
  allDirectories: string[],
): Promise<void> => {
  allDirectories.push(dir)

  let entries

  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (isExcluded(entry.name, config.scan.exclude)) continue
      await walkDirectory(fullPath, config, onFile, allDirectories)
    } else if (entry.isFile()) {
      await onFile(fullPath, dir)
    }
  }
}

/** Check if a directory name is in the exclude list. */
const isExcluded = (name: string, exclude: string[]): boolean =>
  exclude.includes(name) || name.startsWith('.')

/** Scan a specific directory (not recursive) for xdocs files. */
export const scanDirectory = async (dirPath: string, config: XDocsConfig): Promise<XDocsFile[]> => {
  const files: XDocsFile[] = []
  let entries

  try {
    entries = await readdir(dirPath, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const fullPath = join(dirPath, entry.name)

    if (isXDocsFile(fullPath, config.extensions.supported)) {
      const file = await parseXDocsFile(fullPath, config.cwd)
      files.push(file)
    }
  }

  return files
}

/** List all files in a directory (non-recursive). */
export const listDirectoryFiles = async (dirPath: string, config: XDocsConfig): Promise<string[]> => {
  const result: string[] = []
  let entries

  try {
    entries = await readdir(dirPath, { withFileTypes: true })
  } catch {
    return result
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (isExcluded(entry.name, config.scan.exclude)) continue
    result.push(relative(config.cwd, join(dirPath, entry.name)))
  }

  return result
}
