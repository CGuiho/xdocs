/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { readDirectory as readdir, statPath as stat } from './runtime/fs.js'
import { basename, dirname, joinPath as join, relativePath as relative, resolvePath as resolve } from './runtime/path.js'
import type { XDocsConfig, XDocsFile, XDocsMarkdownDocument, XDocsScanResult } from './types.js'
import { parseXDocsFile } from './metadata.js'

const XDOCS_DESCRIPTOR_EXTENSION = '.xdocs.md'
const ROOT_XDOCS_FILENAME = 'XDOCS.md'

/** Scan the project for xdocs descriptor files and sibling Markdown documents. */
export const scanProject = async (config: XDocsConfig): Promise<XDocsScanResult> => {
  const xdocsFiles: XDocsFile[] = []
  const markdownDocuments: XDocsMarkdownDocument[] = []
  const markdownDocumentsByDirectory = new Map<string, XDocsMarkdownDocument[]>()
  const allDirectories: string[] = []
  let totalFiles = 0

  await walkDirectory(config.cwd, config, async (filePath, _dir) => {
    totalFiles += 1

    if (isXDocsDescriptorFile(filePath)) {
      const file = await parseXDocsFile(filePath, config.cwd)
      xdocsFiles.push(file)
      return
    }

    if (isPlainMarkdownDocument(filePath)) {
      const document = createMarkdownDocument(filePath, config.cwd)
      markdownDocuments.push(document)
      addMarkdownDocument(markdownDocumentsByDirectory, document.directory, document)
    }
  }, allDirectories)

  // The root XDOCS.md is always recognized
  const rootXDocs = join(config.cwd, ROOT_XDOCS_FILENAME)
  const rootAlreadyFound = xdocsFiles.some((f) => f.path === rootXDocs)

  if (!rootAlreadyFound) {
    try {
      const rootStat = await stat(rootXDocs)
      if (rootStat.isFile()) {
        const file = await parseXDocsFile(rootXDocs, config.cwd)
        xdocsFiles.push(file)
      }
    } catch {
      // Root XDOCS.md does not exist, that's fine
    }
  }

  enrichDescriptorFiles(xdocsFiles, markdownDocumentsByDirectory)

  const coveredDirectories = new Set<string>()
  if (xdocsFiles.some((file) => file.path === rootXDocs)) coveredDirectories.add(config.cwd)
  for (const file of xdocsFiles) {
    if (file.path === rootXDocs) continue
    if (file.valid) coveredDirectories.add(file.directory)
  }

  const uncoveredPaths = allDirectories.filter((dir) => !coveredDirectories.has(dir))

  return {
    totalFiles,
    totalDirectories: allDirectories.length,
    totalMarkdownDocuments: markdownDocuments.length,
    coveredDirectories: coveredDirectories.size,
    uncoveredDirectories: uncoveredPaths.length,
    xdocsFiles,
    markdownDocuments,
    uncoveredPaths,
  }
}

/** Check if a file path is a root index or xdocs descriptor file. */
export const isXDocsFile = (filePath: string, _extensions: string[] = [XDOCS_DESCRIPTOR_EXTENSION]): boolean =>
  basename(filePath) === ROOT_XDOCS_FILENAME || isXDocsDescriptorFile(filePath)

/** Check if a file path is an xdocs module descriptor. */
export const isXDocsDescriptorFile = (filePath: string): boolean =>
  basename(filePath).toLowerCase().endsWith(XDOCS_DESCRIPTOR_EXTENSION)

/** Check if a file path is a companion Markdown document, not an xdocs descriptor. */
export const isPlainMarkdownDocument = (filePath: string): boolean => {
  const name = basename(filePath)
  const lower = name.toLowerCase()
  return lower.endsWith('.md') && lower !== 'xdocs.md' && !isXDocsDescriptorFile(filePath)
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

/** Scan a specific directory (not recursive) for xdocs descriptors. */
export const scanDirectory = async (dirPath: string, config: XDocsConfig): Promise<XDocsFile[]> => {
  const files: XDocsFile[] = []
  const markdownDocumentsByDirectory = new Map<string, XDocsMarkdownDocument[]>()
  let entries

  try {
    entries = await readdir(dirPath, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const fullPath = join(dirPath, entry.name)

    if (isXDocsDescriptorFile(fullPath) || isRootXDocsFile(fullPath, config.cwd)) {
      const file = await parseXDocsFile(fullPath, config.cwd)
      files.push(file)
      continue
    }

    if (isPlainMarkdownDocument(fullPath)) {
      const document = createMarkdownDocument(fullPath, config.cwd)
      addMarkdownDocument(markdownDocumentsByDirectory, document.directory, document)
    }
  }

  enrichDescriptorFiles(files, markdownDocumentsByDirectory)
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

const isRootXDocsFile = (filePath: string, cwd: string): boolean =>
  resolve(filePath) === resolve(cwd, ROOT_XDOCS_FILENAME)

const createMarkdownDocument = (filePath: string, cwd: string): XDocsMarkdownDocument => ({
  path: filePath,
  relativePath: relative(cwd, filePath),
  directory: dirname(filePath),
  name: basename(filePath),
})

const addMarkdownDocument = (
  documentsByDirectory: Map<string, XDocsMarkdownDocument[]>,
  directory: string,
  document: XDocsMarkdownDocument,
) => {
  const documents = documentsByDirectory.get(directory) ?? []
  documents.push(document)
  documentsByDirectory.set(directory, documents)
}

const enrichDescriptorFiles = (
  files: XDocsFile[],
  documentsByDirectory: Map<string, XDocsMarkdownDocument[]>,
) => {
  const descriptorsByDirectory = new Map<string, XDocsFile[]>()

  for (const file of files) {
    if (!isXDocsDescriptorFile(file.path)) continue
    const descriptors = descriptorsByDirectory.get(file.directory) ?? []
    descriptors.push(file)
    descriptorsByDirectory.set(file.directory, descriptors)
  }

  for (const descriptors of descriptorsByDirectory.values()) {
    if (descriptors.length <= 1) continue

    for (const file of descriptors) {
      file.errors.push('Multiple xdocs descriptors found in this directory. Keep exactly one named "*.xdocs.md" file per directory.')
      file.valid = false
    }
  }

  for (const file of files) {
    if (!isXDocsDescriptorFile(file.path)) continue

    file.documents = documentsByDirectory.get(file.directory) ?? []
    validateDocumentReferences(file)
    if (file.errors.length > 0) file.valid = false
  }
}

const validateDocumentReferences = (file: XDocsFile) => {
  if (!file.metadata) return

  const actualDocuments = new Set(file.documents.map((document) => document.name))
  const declaredDocuments = file.metadata.documents

  for (const document of file.documents) {
    if (Object.hasOwn(declaredDocuments, document.name)) continue
    file.errors.push(`Undocumented Markdown document: "${document.name}" must be listed in the "documents" metadata map.`)
  }

  for (const name of Object.keys(declaredDocuments)) {
    if (!isPlainMarkdownDocumentName(name)) {
      file.errors.push(`Invalid document entry: "${name}" must be a sibling plain "*.md" filename, not an xdocs descriptor or path.`)
      continue
    }

    if (!actualDocuments.has(name)) {
      file.errors.push(`Missing Markdown document: "${name}" is listed in metadata but does not exist beside the descriptor.`)
    }
  }
}

const isPlainMarkdownDocumentName = (name: string): boolean => {
  const lower = name.toLowerCase()
  return !name.includes('/') && !name.includes('\\') && lower.endsWith('.md') && lower !== 'xdocs.md' && !lower.endsWith(XDOCS_DESCRIPTOR_EXTENSION)
}
