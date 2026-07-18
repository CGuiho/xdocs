/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { Value } from '@sinclair/typebox/value'
import { readText } from './runtime/fs.js'
import { basename, dirname, relativePath as relative } from './runtime/path.js'
import { XDocsMetadataSchema } from './schemas.js'
import type { XDocsFile, XDocsFrontmatter, XDocsMetadata } from './types.js'

const FRONTMATTER_READ_CHUNK_SIZE = 8192
const FRONTMATTER_MAX_BYTES = 256 * 1024

/** Parse an xdocs descriptor from disk into an XDocsFile object. */
export const parseXDocsFile = async (filePath: string, cwd: string): Promise<XDocsFile> => {
  const content = await readText(filePath)
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

/** Read only the leading YAML frontmatter block from a Markdown file. */
export const readFrontmatterFromFile = async (filePath: string): Promise<string | null> => {
  const content = await Bun.file(filePath).slice(0, FRONTMATTER_MAX_BYTES).text()
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('---')) return null
  const endIndex = trimmed.indexOf('\n---', FRONTMATTER_READ_CHUNK_SIZE > 3 ? 3 : 3)
  return endIndex === -1 ? null : trimmed.slice(3, endIndex).trim()
}

/** Parse YAML frontmatter into a generic object. */
export const parseFrontmatterObject = (frontmatter: string): { frontmatter: XDocsFrontmatter | null, errors: string[] } => {
  let parsed: unknown

  try {
    parsed = Bun.YAML.parse(frontmatter)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { frontmatter: null, errors: [`Invalid YAML frontmatter: ${message}`] }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { frontmatter: null, errors: ['Frontmatter must be a YAML object.'] }
  }

  return { frontmatter: parsed as XDocsFrontmatter, errors: [] }
}

/** Validate parsed YAML as XDocsMetadata. */
export const validateMetadata = (parsed: unknown): { valid: true, metadata: XDocsMetadata, errors: never[] } | { valid: false, metadata: null, errors: string[] } => {
  if (!Value.Check(XDocsMetadataSchema, parsed)) {
    const errors = [...Value.Errors(XDocsMetadataSchema, parsed)].map((error) =>
      `${error.path || 'frontmatter'}: ${error.message}`)
    return { valid: false, metadata: null, errors }
  }
  return { valid: true, errors: [] as never[], metadata: Value.Decode(XDocsMetadataSchema, parsed) }
}
