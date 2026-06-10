/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Prompt loader. Prompt `.md` files are read from disk at runtime (relative to
 * this module via import.meta.url) so the compiled library works under both
 * Node and Bun. Each `.md` file ships with the package in `prompts/`. Adding a
 * new prompt requires creating the `.md` file and adding its name to
 * PROMPT_NAMES.
 */

import { readFileSync } from 'node:fs'
import { extractFrontmatter } from './metadata.js'
import type { XDocsPrompt } from './types.js'

const PROMPT_NAMES = ['write', 'update', 'agents', 'generate'] as const

/** Read a prompt file's raw contents, or undefined when it cannot be read. */
const readPromptFile = (name: string): string | undefined => {
  const embedded = globalThis.__XDOCS_EMBEDDED_RESOURCES__?.prompts[name]
  if (embedded) return embedded

  try {
    return readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), 'utf8')
  } catch {
    return undefined
  }
}

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

  for (const name of PROMPT_NAMES) {
    const raw = readPromptFile(name)
    if (!raw) continue
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
