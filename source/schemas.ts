/**
 * Runtime schemas for every structured xdocs boundary.
 */

import { Type, type Static } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { XDocsError } from './errors.js'

export const XDocsFormatSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('json'),
  Type.Literal('markdown'),
])

export const XDocsAiModeSchema = Type.Union([Type.Literal('prompt'), Type.Literal('auto')])

export const XDocsRawConfigSchema = Type.Object({
  schema: Type.Optional(Type.Literal(1)),
  extensions: Type.Optional(Type.Object({
    supported: Type.Optional(Type.Array(Type.String())),
  }, { additionalProperties: false })),
  ai: Type.Optional(Type.Object({
    mode: Type.Optional(XDocsAiModeSchema),
  }, { additionalProperties: false })),
  scan: Type.Optional(Type.Object({
    exclude: Type.Optional(Type.Array(Type.String())),
  }, { additionalProperties: false })),
  project: Type.Optional(Type.Object({
    name: Type.Optional(Type.String({ minLength: 1 })),
  }, { additionalProperties: false })),
}, { additionalProperties: false })

export type XDocsRawConfigValue = Static<typeof XDocsRawConfigSchema>

export const XDocsMetadataSchema = Type.Object({
  subject: Type.String({ minLength: 1 }),
  description: Type.String({ minLength: 1 }),
  parent: Type.Union([Type.String(), Type.Null()]),
  children: Type.Array(Type.String()),
  files: Type.Record(Type.String(), Type.String()),
  documents: Type.Record(Type.String(), Type.String()),
  tags: Type.Array(Type.String()),
  keywords: Type.Array(Type.String()),
  flags: Type.Array(Type.String()),
  status: Type.Optional(Type.String()),
}, { additionalProperties: true })

export const XDocsDocumentMetadataSchema = Type.Intersect([
  Type.Object({
    owner: Type.String({ minLength: 1 }),
    tags: Type.Array(Type.String()),
    keywords: Type.Array(Type.String()),
  }),
  Type.Record(Type.String(), Type.Unknown()),
])

export const XDocsUpdateCacheSchema = Type.Object({
  newVersionAvailable: Type.Boolean(),
  latestVersion: Type.String({ minLength: 1 }),
  upgradeCommand: Type.Optional(Type.String({ minLength: 1 })),
  lastCheck: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export type XDocsUpdateCacheValue = Static<typeof XDocsUpdateCacheSchema>

export const XDocsUpdateLeaseSchema = Type.Object({
  token: Type.String({ minLength: 1 }),
  pid: Type.Integer({ minimum: 1 }),
  createdAt: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export type XDocsUpdateLeaseValue = Static<typeof XDocsUpdateLeaseSchema>

export const GitHubAssetSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  browser_download_url: Type.String({ minLength: 1 }),
  size: Type.Optional(Type.Number({ minimum: 0 })),
}, { additionalProperties: true })

export const GitHubReleaseSchema = Type.Object({
  tag_name: Type.String({ minLength: 1 }),
  html_url: Type.String({ minLength: 1 }),
  prerelease: Type.Boolean(),
  draft: Type.Boolean(),
  published_at: Type.Union([Type.String(), Type.Null()]),
  assets: Type.Array(GitHubAssetSchema),
}, { additionalProperties: true })

export const GitHubReleaseCatalogSchema = Type.Array(GitHubReleaseSchema)

export const AgentSkillMetadataSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  description: Type.String({ minLength: 1 }),
  version: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Object({
    version: Type.Optional(Type.String()),
  }, { additionalProperties: true })),
}, { additionalProperties: true })

export const PromptMetadataSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  description: Type.String({ minLength: 1 }),
}, { additionalProperties: true })

export const PositiveIntegerSchema = Type.Integer({ minimum: 1 })

export function decodeWithSchema<T>(
  schema: Parameters<typeof Value.Decode>[0],
  input: unknown,
  source: string,
  exitCode = 2,
): T {
  try {
    return Value.Decode(schema, input) as T
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new XDocsError(`Invalid ${source}: ${detail}`, exitCode)
  }
}
