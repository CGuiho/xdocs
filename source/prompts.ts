/**
 * Embedded RFC 0034 prompt catalog.
 */

import type { XDocsPrompt } from './types.js'
import { PromptMetadataSchema, decodeWithSchema } from './schemas.js'
// @ts-expect-error -- Bun text imports embed prompt bodies in Bun-only builds.
import writePrompt from '../prompts/write.md' with { type: 'text' }
// @ts-expect-error -- Bun text imports embed prompt bodies in Bun-only builds.
import updatePrompt from '../prompts/update.md' with { type: 'text' }
// @ts-expect-error -- Bun text imports embed prompt bodies in Bun-only builds.
import agentsPrompt from '../prompts/agents.md' with { type: 'text' }
// @ts-expect-error -- Bun text imports embed prompt bodies in Bun-only builds.
import generatePrompt from '../prompts/generate.md' with { type: 'text' }

const PROMPT_NAMES = ['write', 'update', 'agents', 'generate'] as const
const bundledPrompts: Record<string, string> = {
  write: writePrompt,
  update: updatePrompt,
  agents: agentsPrompt,
  generate: generatePrompt,
}

const readPromptFile = (name: string): string | undefined => {
  const embedded = globalThis.__XDOCS_EMBEDDED_RESOURCES__?.prompts[name]
  if (embedded) return embedded
  return bundledPrompts[name]
}

const parsePrompt = (raw: string): XDocsPrompt => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match?.[1]) throw new Error('Prompt file is missing YAML frontmatter.')
  const metadata = decodeWithSchema<{ name: string, description: string }>(
    PromptMetadataSchema,
    Bun.YAML.parse(match[1]),
    'prompt metadata',
    5,
  )
  return { ...metadata, body: (match[2] ?? '').trim() }
}

const catalog: readonly XDocsPrompt[] = PROMPT_NAMES.map((name) => {
  const raw = readPromptFile(name)
  if (!raw) throw new Error(`Bundled prompt is unavailable: ${name}`)
  return parsePrompt(raw)
})

export const prompts: ReadonlyMap<string, XDocsPrompt> = new Map(catalog.map((prompt) => [prompt.name, prompt]))
export const getPrompt = (name: string): XDocsPrompt | undefined => prompts.get(name)
export const getPromptNames = (): string[] => [...prompts.keys()]
export const getPrompts = (): XDocsPrompt[] => [...prompts.values()]
