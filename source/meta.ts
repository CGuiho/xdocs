/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { readDirectory as readdir, statPath as stat } from './runtime/fs.js'
import { basename, dirname, joinPath as join, relativePath as relative, resolvePath as resolve } from './runtime/path.js'
import type {
  XDocsConfig,
  XDocsFrontmatter,
  XDocsMetaDescriptor,
  XDocsMetaDocument,
  XDocsMetaFilters,
  XDocsMetaScanOptions,
  XDocsMetaScanResult,
  XDocsMetadata,
} from './types.js'
import { XDocsError } from './errors.js'
import { isPlainMarkdownDocument, isXDocsDescriptorFile } from './discovery.js'
import { parseFrontmatterObject, readFrontmatterFromFile, validateMetadata } from './metadata.js'

export {
  collectMetaErrors,
  scanMetadata,
}

type MarkdownDocumentReference = {
  path: string
  relativePath: string
  directory: string
  name: string
}

/** Scan xdocs descriptors and optional companion docs by reading frontmatter only. */
const scanMetadata = async (config: XDocsConfig, options: XDocsMetaScanOptions = {}): Promise<XDocsMetaScanResult> => {
  const targetPath = resolve(config.cwd, options.targetPath ?? config.cwd)
  const targetStat = await stat(targetPath).catch(() => null)

  if (!targetStat) throw new XDocsError(`Metadata target does not exist: ${relative(config.cwd, targetPath) || '.'}`)
  if (!targetStat.isDirectory()) throw new XDocsError(`Metadata target must be a directory: ${relative(config.cwd, targetPath) || '.'}`)

  const descriptors: XDocsMetaDescriptor[] = []
  const documentsByDirectory = new Map<string, MarkdownDocumentReference[]>()

  await walkMetadataDirectory(targetPath, config, async (filePath) => {
    if (isXDocsDescriptorFile(filePath)) {
      descriptors.push(await parseMetaDescriptor(filePath, config.cwd))
      return
    }

    if (isPlainMarkdownDocument(filePath)) {
      addDocumentReference(documentsByDirectory, {
        path: filePath,
        relativePath: relative(config.cwd, filePath),
        directory: dirname(filePath),
        name: basename(filePath),
      })
    }
  })

  await enrichMetaDescriptors(descriptors, documentsByDirectory, Boolean(options.includeDocuments))

  const filters = createMetaFilters(options)
  const filteredDescriptors = filterDescriptors(descriptors, filters, Boolean(options.includeDocuments))
  const errors = collectMetaErrors({ descriptors: filteredDescriptors })

  return {
    root: config.cwd,
    targetPath: relative(config.cwd, targetPath) || '.',
    includeDocuments: Boolean(options.includeDocuments),
    strict: Boolean(options.strict),
    filters,
    descriptors: filteredDescriptors,
    errors,
  }
}

/** Collect validation errors from a metadata scan or descriptor list. */
const collectMetaErrors = (input: Pick<XDocsMetaScanResult, 'descriptors'>): string[] => {
  const errors: string[] = []

  for (const descriptor of input.descriptors) {
    for (const error of descriptor.errors) errors.push(`${descriptor.relativePath}: ${error}`)
    for (const document of descriptor.documents) {
      for (const error of document.errors) errors.push(`${document.relativePath}: ${error}`)
    }
  }

  return errors
}

const parseMetaDescriptor = async (filePath: string, cwd: string): Promise<XDocsMetaDescriptor> => {
  const errors: string[] = []

  if (basename(filePath).toLowerCase() === '.xdocs.md') {
    errors.push('Invalid xdocs descriptor filename. Use a named file such as "authentication.xdocs.md"; ".xdocs.md" is only the extension.')
  }

  const frontmatterText = await readFrontmatterFromFile(filePath)
  let frontmatter: XDocsFrontmatter | null = null
  let metadata: XDocsMetadata | null = null

  if (!frontmatterText) {
    errors.push('Missing YAML frontmatter.')
  } else {
    const parsed = parseFrontmatterObject(frontmatterText)
    frontmatter = parsed.frontmatter
    errors.push(...parsed.errors)

    if (frontmatter) {
      const result = validateMetadata(frontmatter)
      if (result.valid) {
        metadata = result.metadata
      } else {
        errors.push(...result.errors)
      }
    }
  }

  return {
    path: filePath,
    relativePath: relative(cwd, filePath),
    directory: dirname(filePath),
    subject: metadata?.subject ?? stringField(frontmatter, 'subject'),
    valid: metadata !== null && errors.length === 0,
    frontmatter,
    metadata,
    documents: [],
    errors,
  }
}

const parseMetaDocument = async (
  document: MarkdownDocumentReference,
  expectedOwner: string | null,
): Promise<XDocsMetaDocument> => {
  const errors: string[] = []
  const frontmatterText = await readFrontmatterFromFile(document.path)
  let frontmatter: XDocsFrontmatter | null = null

  if (!frontmatterText) {
    errors.push('Missing YAML frontmatter.')
  } else {
    const parsed = parseFrontmatterObject(frontmatterText)
    frontmatter = parsed.frontmatter
    errors.push(...parsed.errors)
    if (frontmatter) errors.push(...validateCompanionFrontmatter(frontmatter, expectedOwner))
  }

  return {
    ...document,
    owner: stringField(frontmatter, 'owner'),
    valid: frontmatter !== null && errors.length === 0,
    frontmatter,
    errors,
  }
}

const enrichMetaDescriptors = async (
  descriptors: XDocsMetaDescriptor[],
  documentsByDirectory: Map<string, MarkdownDocumentReference[]>,
  includeDocuments: boolean,
): Promise<void> => {
  const descriptorsByDirectory = new Map<string, XDocsMetaDescriptor[]>()

  for (const descriptor of descriptors) {
    const siblings = descriptorsByDirectory.get(descriptor.directory) ?? []
    siblings.push(descriptor)
    descriptorsByDirectory.set(descriptor.directory, siblings)
  }

  for (const siblings of descriptorsByDirectory.values()) {
    if (siblings.length <= 1) continue
    for (const descriptor of siblings) {
      descriptor.errors.push('Multiple xdocs descriptors found in this directory. Keep exactly one named "*.xdocs.md" file per directory.')
    }
  }

  for (const descriptor of descriptors) {
    const documents = documentsByDirectory.get(descriptor.directory) ?? []
    validateDocumentReferences(descriptor, documents)
    if (includeDocuments) descriptor.documents = await parseAssociatedDocuments(descriptor, documents)
    descriptor.valid = descriptor.metadata !== null && descriptor.errors.length === 0
  }
}

const parseAssociatedDocuments = async (
  descriptor: XDocsMetaDescriptor,
  documents: MarkdownDocumentReference[],
): Promise<XDocsMetaDocument[]> => {
  if (!descriptor.metadata) return []

  const declaredDocuments = descriptor.metadata.documents
  const associatedDocuments = documents.filter((document) => Object.hasOwn(declaredDocuments, document.name))
  const result: XDocsMetaDocument[] = []

  for (const document of associatedDocuments) {
    result.push(await parseMetaDocument(document, descriptor.metadata.subject))
  }

  return result
}

const validateDocumentReferences = (
  descriptor: XDocsMetaDescriptor,
  documents: MarkdownDocumentReference[],
): void => {
  if (!descriptor.metadata) return

  const actualDocuments = new Set(documents.map((document) => document.name))
  const declaredDocuments = descriptor.metadata.documents

  for (const document of documents) {
    if (Object.hasOwn(declaredDocuments, document.name)) continue
    descriptor.errors.push(`Undocumented Markdown document: "${document.name}" must be listed in the "documents" metadata map.`)
  }

  for (const name of Object.keys(declaredDocuments)) {
    if (!isPlainMarkdownDocumentName(name)) {
      descriptor.errors.push(`Invalid document entry: "${name}" must be a sibling plain "*.md" filename, not an xdocs descriptor or path.`)
      continue
    }

    if (!actualDocuments.has(name)) {
      descriptor.errors.push(`Missing Markdown document: "${name}" is listed in metadata but does not exist beside the descriptor.`)
    }
  }
}

const validateCompanionFrontmatter = (frontmatter: XDocsFrontmatter, expectedOwner: string | null): string[] => {
  const errors: string[] = []

  for (const field of ['name', 'purpose', 'description', 'created', 'owner']) {
    if (typeof frontmatter[field] !== 'string' || frontmatter[field].length === 0) {
      errors.push(`Missing or invalid "${field}" field. Expected a non-empty string.`)
    }
  }

  for (const field of ['flags', 'tags', 'keywords']) {
    const value = frontmatter[field]
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
      errors.push(`Missing or invalid "${field}" field. Expected an array of strings.`)
    }
  }

  const created = stringField(frontmatter, 'created')
  if (created && !/^\d{4}-\d{2}-\d{2}$/.test(created)) {
    errors.push('Invalid "created" field. Expected YYYY-MM-DD.')
  }

  const owner = stringField(frontmatter, 'owner')
  if (expectedOwner && owner && owner !== expectedOwner) {
    errors.push(`Invalid "owner" field. Expected "${expectedOwner}".`)
  }

  return errors
}

const filterDescriptors = (
  descriptors: XDocsMetaDescriptor[],
  filters: XDocsMetaFilters,
  includeDocuments: boolean,
): XDocsMetaDescriptor[] => {
  if (!hasFilters(filters)) return descriptors

  return descriptors
    .map((descriptor) => {
      const documents = includeDocuments
        ? descriptor.documents.filter((document) => documentMatchesFilters(document, filters))
        : []

      return { ...descriptor, documents }
    })
    .filter((descriptor) => descriptorMatchesFilters(descriptor, filters) || descriptor.documents.length > 0)
}

const descriptorMatchesFilters = (descriptor: XDocsMetaDescriptor, filters: XDocsMetaFilters): boolean => {
  if (filters.owner && !sameValue(descriptor.subject, filters.owner)) return false
  if (filters.tag && !arrayFieldIncludes(descriptor.frontmatter, 'tags', filters.tag)) return false
  if (filters.keyword && !arrayFieldIncludes(descriptor.frontmatter, 'keywords', filters.keyword)) return false
  return true
}

const documentMatchesFilters = (document: XDocsMetaDocument, filters: XDocsMetaFilters): boolean => {
  if (filters.owner && !sameValue(document.owner, filters.owner)) return false
  if (filters.tag && !arrayFieldIncludes(document.frontmatter, 'tags', filters.tag)) return false
  if (filters.keyword && !arrayFieldIncludes(document.frontmatter, 'keywords', filters.keyword)) return false
  return true
}

const hasFilters = (filters: XDocsMetaFilters): boolean =>
  Boolean(filters.owner || filters.tag || filters.keyword)

const createMetaFilters = (options: XDocsMetaScanOptions): XDocsMetaFilters => ({
  ...(options.owner ? { owner: options.owner } : {}),
  ...(options.tag ? { tag: options.tag } : {}),
  ...(options.keyword ? { keyword: options.keyword } : {}),
})

const arrayFieldIncludes = (frontmatter: XDocsFrontmatter | null, key: string, expected: string): boolean => {
  const value = frontmatter?.[key]
  if (!Array.isArray(value)) return false
  return value.some((entry) => typeof entry === 'string' && sameValue(entry, expected))
}

const sameValue = (left: string | null | undefined, right: string): boolean =>
  typeof left === 'string' && left.toLowerCase() === right.toLowerCase()

const stringField = (frontmatter: XDocsFrontmatter | null, key: string): string | null => {
  const value = frontmatter?.[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

const walkMetadataDirectory = async (
  dir: string,
  config: XDocsConfig,
  onFile: (filePath: string) => Promise<void>,
): Promise<void> => {
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
      await walkMetadataDirectory(fullPath, config, onFile)
      continue
    }

    if (entry.isFile()) await onFile(fullPath)
  }
}

const isExcluded = (name: string, exclude: string[]): boolean =>
  exclude.includes(name) || name.startsWith('.')

const addDocumentReference = (
  documentsByDirectory: Map<string, MarkdownDocumentReference[]>,
  document: MarkdownDocumentReference,
): void => {
  const documents = documentsByDirectory.get(document.directory) ?? []
  documents.push(document)
  documentsByDirectory.set(document.directory, documents)
}

const isPlainMarkdownDocumentName = (name: string): boolean => {
  const lower = name.toLowerCase()
  return !name.includes('/') && !name.includes('\\') && lower.endsWith('.md') && lower !== 'xdocs.md' && !lower.endsWith('.xdocs.md')
}
