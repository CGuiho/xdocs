/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { readFile } from 'node:fs/promises'
import { basename, dirname, relative } from 'node:path'
import type { XDocsFile, XDocsMetadata } from './types.js'

/** Parse an xdocs descriptor from disk into an XDocsFile object. */
export const parseXDocsFile = async (filePath: string, cwd: string): Promise<XDocsFile> => {
  const content = await readFile(filePath, 'utf8')
  const errors: string[] = []

  if (basename(filePath).toLowerCase() === '.xdocs.md') {
    errors.push('Invalid xdocs descriptor filename. Use a named file such as "authentication.xdocs.md"; ".xdocs.md" is only the extension.')
  }

  const { frontmatter, body } = extractFrontmatter(content)

  let metadata: XDocsMetadata | null = null

  if (frontmatter) {
    let parsed: unknown

    try {
      parsed = Bun.YAML.parse(frontmatter)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Invalid YAML frontmatter: ${message}`)
    }

    if (parsed !== undefined && parsed !== null) {
      const result = validateMetadata(parsed)
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
    metadata,
    documents: [],
    body,
    valid: metadata !== null && errors.length === 0,
    errors,
  }
}

/** Extract YAML frontmatter and body from a Markdown string. */
export const extractFrontmatter = (content: string): { frontmatter: string | null, body: string } => {
  const trimmed = content.trimStart()

  if (!trimmed.startsWith('---')) {
    return { frontmatter: null, body: content }
  }

  const endIndex = trimmed.indexOf('\n---', 3)

  if (endIndex === -1) {
    return { frontmatter: null, body: content }
  }

  const frontmatter = trimmed.slice(3, endIndex).trim()
  const body = trimmed.slice(endIndex + 4).trim()

  return { frontmatter, body }
}

/** Validate parsed YAML as XDocsMetadata. */
export const validateMetadata = (parsed: unknown): { valid: true, metadata: XDocsMetadata, errors: never[] } | { valid: false, metadata: null, errors: string[] } => {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, metadata: null, errors: ['Frontmatter must be a YAML object.'] }
  }

  const record = parsed as Record<string, unknown>
  const errors: string[] = []

  if (typeof record['subject'] !== 'string' || record['subject'].length === 0) {
    errors.push('Missing or invalid "subject" field. Expected a non-empty string.')
  }

  if (typeof record['description'] !== 'string' || record['description'].length === 0) {
    errors.push('Missing or invalid "description" field. Expected a non-empty string.')
  }

  if (record['parent'] !== null && typeof record['parent'] !== 'string') {
    errors.push('Invalid "parent" field. Expected a string or null.')
  }

  if (!Array.isArray(record['children'])) {
    errors.push('Missing or invalid "children" field. Expected an array.')
  } else if (record['children'].some((child: unknown) => typeof child !== 'string')) {
    errors.push('Invalid "children" field. All entries must be strings.')
  }

  if (!isStringMap(record['files'])) {
    errors.push('Missing or invalid "files" field. Expected an object mapping filenames to descriptions.')
  }

  if (!isStringMap(record['documents'])) {
    errors.push('Missing or invalid "documents" field. Expected an object mapping sibling Markdown filenames to descriptions.')
  }

  if (!Array.isArray(record['tags'])) {
    errors.push('Missing or invalid "tags" field. Expected an array of strings.')
  } else if (record['tags'].some((tag: unknown) => typeof tag !== 'string')) {
    errors.push('Invalid "tags" field. All entries must be strings.')
  }

  if (!Array.isArray(record['flags'])) {
    errors.push('Missing or invalid "flags" field. Expected an array of strings.')
  } else if (record['flags'].some((flag: unknown) => typeof flag !== 'string')) {
    errors.push('Invalid "flags" field. All entries must be strings.')
  }

  if (errors.length > 0) {
    return { valid: false, metadata: null, errors }
  }

  return {
    valid: true,
    errors: [] as never[],
    metadata: {
      subject: record['subject'] as string,
      description: record['description'] as string,
      parent: (record['parent'] as string | null) ?? null,
      children: record['children'] as string[],
      files: record['files'] as Record<string, string>,
      documents: record['documents'] as Record<string, string>,
      tags: record['tags'] as string[],
      flags: record['flags'] as string[],
      status: typeof record['status'] === 'string' ? record['status'] : undefined,
    },
  }
}

const isStringMap = (value: unknown): value is Record<string, string> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  return Object.entries(value).every(
    ([key, description]) => typeof key === 'string' && typeof description === 'string',
  )
}
