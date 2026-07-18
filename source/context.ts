/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { joinPath as join } from './runtime/path.js'
import type {
  XDocsConfig,
  XDocsContextEntry,
  XDocsContextOptions,
  XDocsContextResult,
  XDocsFrontmatter,
  XDocsMetaDescriptor,
  XDocsMetaFilters,
} from './types.js'
import { XDocsError } from './errors.js'
import { scanMetadata } from './meta.js'

export {
  findContext,
}

const defaultContextLimit = 20

/** Find the smallest useful reading set for a query using xdocs metadata. */
const findContext = async (config: XDocsConfig, query: string, options: XDocsContextOptions = {}): Promise<XDocsContextResult> => {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) throw new XDocsError('xdocs context requires a non-empty query.')

  const includeDocuments = Boolean(options.includeDocuments)
  const includeFiles = Boolean(options.includeFiles)
  const filters = createContextFilters(options)
  const metadata = await scanMetadata(config, {
    targetPath: options.targetPath,
    includeDocuments,
    ...filters,
  })

  const entries: XDocsContextEntry[] = []

  for (const descriptor of metadata.descriptors) {
    entries.push(...scoreDescriptor(descriptor, tokens))
    if (includeFiles) entries.push(...scoreFiles(descriptor, tokens))
    if (includeDocuments) entries.push(...scoreDocuments(descriptor, tokens))
  }

  return {
    root: metadata.root,
    targetPath: metadata.targetPath,
    query,
    tokens,
    includeDocuments,
    includeFiles,
    filters,
    entries: entries
      .filter((entry) => entry.score > 0)
      .sort(compareContextEntries)
      .slice(0, normalizeLimit(options.limit)),
  }
}

const scoreDescriptor = (descriptor: XDocsMetaDescriptor, tokens: string[]): XDocsContextEntry[] => {
  if (!descriptor.frontmatter) return []

  const scored = scoreFields(tokens, [
    weightedField('subject', descriptor.subject, 8),
    weightedField('description', stringField(descriptor.frontmatter, 'description'), 4),
    weightedField('tags', arrayField(descriptor.frontmatter, 'tags').join(' '), 6),
    weightedField('keywords', arrayField(descriptor.frontmatter, 'keywords').join(' '), 7),
    weightedField('files', Object.entries(descriptor.metadata?.files ?? {}).map(([name, description]) => `${name} ${description}`).join(' '), 2),
    weightedField('documents', Object.entries(descriptor.metadata?.documents ?? {}).map(([name, description]) => `${name} ${description}`).join(' '), 2),
  ])

  return [{
    kind: 'descriptor',
    path: descriptor.relativePath,
    source: descriptor.relativePath,
    owner: descriptor.subject,
    score: scored.score,
    reasons: scored.reasons,
    description: stringField(descriptor.frontmatter, 'description'),
  }]
}

const scoreFiles = (descriptor: XDocsMetaDescriptor, tokens: string[]): XDocsContextEntry[] => {
  if (!descriptor.metadata) return []

  return Object.entries(descriptor.metadata.files).map(([fileName, description]) => {
    const scored = scoreFields(tokens, [
      weightedField('file', fileName, 7),
      weightedField('description', description, 4),
      weightedField('owner', descriptor.subject, 2),
      weightedField('descriptor keywords', descriptor.metadata?.keywords.join(' '), 2),
    ])

    return {
      kind: 'file' as const,
      path: normalizeContextPath(join(descriptor.relativePath, '..', fileName)),
      source: descriptor.relativePath,
      owner: descriptor.subject,
      score: scored.score,
      reasons: scored.reasons,
      description,
    }
  })
}

const scoreDocuments = (descriptor: XDocsMetaDescriptor, tokens: string[]): XDocsContextEntry[] => {
  const declaredDocuments = descriptor.metadata?.documents ?? {}

  return descriptor.documents.map((document) => {
    const scored = scoreFields(tokens, [
      weightedField('document', document.name, 7),
      weightedField('description', stringField(document.frontmatter, 'description') ?? declaredDocuments[document.name], 4),
      weightedField('purpose', stringField(document.frontmatter, 'purpose'), 5),
      weightedField('owner', document.owner, 3),
      weightedField('tags', arrayField(document.frontmatter, 'tags').join(' '), 6),
      weightedField('keywords', arrayField(document.frontmatter, 'keywords').join(' '), 7),
    ])

    return {
      kind: 'document',
      path: document.relativePath,
      source: descriptor.relativePath,
      owner: document.owner,
      score: scored.score,
      reasons: scored.reasons,
      description: stringField(document.frontmatter, 'description') ?? declaredDocuments[document.name] ?? null,
    }
  })
}

type WeightedField = {
  label: string
  value: string
  weight: number
}

const weightedField = (label: string, value: string | null | undefined, weight: number): WeightedField => ({
  label,
  value: value ?? '',
  weight,
})

const scoreFields = (tokens: string[], fields: WeightedField[]): { score: number, reasons: string[] } => {
  let score = 0
  const reasons = new Set<string>()

  for (const token of tokens) {
    for (const field of fields) {
      const value = field.value.toLowerCase()
      if (!value.includes(token)) continue

      score += value.split(/[^a-z0-9]+/).includes(token) ? field.weight * 2 : field.weight
      reasons.add(`${field.label}: ${token}`)
    }
  }

  return { score, reasons: [...reasons] }
}

const compareContextEntries = (left: XDocsContextEntry, right: XDocsContextEntry): number => {
  const scoreDiff = right.score - left.score
  if (scoreDiff !== 0) return scoreDiff
  return left.path.localeCompare(right.path)
}

const tokenizeQuery = (query: string): string[] =>
  [...new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 2))]

const normalizeLimit = (limit: number | undefined): number => {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) return defaultContextLimit
  return Math.floor(limit)
}

const createContextFilters = (options: XDocsContextOptions): XDocsMetaFilters => ({
  ...(options.owner ? { owner: options.owner } : {}),
  ...(options.tag ? { tag: options.tag } : {}),
  ...(options.keyword ? { keyword: options.keyword } : {}),
})

const stringField = (frontmatter: XDocsFrontmatter | null, key: string): string | null => {
  const value = frontmatter?.[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

const arrayField = (frontmatter: XDocsFrontmatter | null, key: string): string[] => {
  const value = frontmatter?.[key]
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

const normalizeContextPath = (path: string): string =>
  path.replace(/^[\\/]+/, '').replace(/\\/g, '/')
