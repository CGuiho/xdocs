/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Prompt loader. Each .md file in prompts/ is imported as text at build time
 * so that `bun build --compile` embeds them in the binary. Adding a new prompt
 * requires two steps: create the .md file, then add an import here.
 */

// @ts-expect-error -- Bun text import, no TS declaration needed
import writeRaw from '../prompts/write.md' with { type: 'text' }
// @ts-expect-error -- Bun text import, no TS declaration needed
import updateRaw from '../prompts/update.md' with { type: 'text' }
// @ts-expect-error -- Bun text import, no TS declaration needed
import agentsRaw from '../prompts/agents.md' with { type: 'text' }
// @ts-expect-error -- Bun text import, no TS declaration needed
import generateRaw from '../prompts/generate.md' with { type: 'text' }

import { extractFrontmatter } from './metadata.js'
import type { XDocsPrompt } from './types.js'

const rawFiles: string[] = [writeRaw, updateRaw, agentsRaw, generateRaw]

/** Parse a raw prompt file into an XDocsPrompt. */
const parsePrompt = (raw: string): XDocsPrompt => {
  const { frontmatter, body } = extractFrontmatter(raw)

  if (!frontmatter) {
    throw new Error('Prompt file is missing YAML frontmatter.')
  }

  // Lightweight parse — prompts only have `name` and `description`.
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m)

  if (!nameMatch?.[1]) throw new Error('Prompt frontmatter missing "name" field.')
  if (!descMatch?.[1]) throw new Error('Prompt frontmatter missing "description" field.')

  return {
    name: nameMatch[1].trim(),
    description: descMatch[1].trim(),
    body: body.trim(),
  }
}

/** All available prompts, keyed by name. */
export const prompts: ReadonlyMap<string, XDocsPrompt> = (() => {
  const map = new Map<string, XDocsPrompt>()

  for (const raw of rawFiles) {
    const prompt = parsePrompt(raw)
    map.set(prompt.name, prompt)
  }

  return map
})()

/** Get a prompt by name or return undefined. */
export const getPrompt = (name: string): XDocsPrompt | undefined =>
  prompts.get(name)

/** Get all prompt names. */
export const getPromptNames = (): string[] =>
  [...prompts.keys()]
