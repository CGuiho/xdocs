/**
 * Explicit RFC 0034 agent skill and instruction management.
 */

import type {
  XDocsAgentsInstructionsResult,
  XDocsSkillInstallResult,
  XDocsSkillScope,
} from './types.js'
import { XDocsError } from './errors.js'
import { AgentSkillMetadataSchema, decodeWithSchema } from './schemas.js'
import { homeDirectory } from './runtime/home.js'
import { pathExists, readText, removePath, writeText } from './runtime/fs.js'
import { joinPath, resolvePath } from './runtime/path.js'
// @ts-expect-error -- Bun text import keeps the Bun-only library and native binary self-contained.
import bundledXdocsSkill from '../skills/guiho-s-xdocs/SKILL.md' with { type: 'text' }

export const xdocsSkillName = 'guiho-s-xdocs'
export const legacyXdocsSkillNames: readonly string[] = ['guiho-as-xdocs']
export const xdocsAgentTools = ['agents', 'claude'] as const

const instructionBegin = '<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->'
const instructionEnd = '<!-- END XDOCS -->'

export const xdocsSkillContent: string = globalThis.__XDOCS_EMBEDDED_RESOURCES__?.skill ?? bundledXdocsSkill

export const xdocsSkillVersion = readSkillVersion(xdocsSkillContent)

export const xdocsInstructionTemplate = `## XDocs Structured Documentation

This project uses **xdocs** (\`@guiho/xdocs\`) for structured, machine-readable
documentation. Load the \`${xdocsSkillName}\` agent skill before creating,
updating, scanning, merging, validating, or navigating xdocs descriptors.

The project configuration is \`xdocs.yaml\`. Respect \`ai.mode\`: \`prompt\`
requires confirmation before documentation writes, while \`auto\` permits
immediate descriptor maintenance. Use \`xdocs meta\`, \`xdocs context\`,
\`xdocs tree\`, and \`xdocs doctor\` to discover and validate documentation.
`

export const xdocsInstructionBlock = `${instructionBegin}
${xdocsInstructionTemplate.trimEnd()}
${instructionEnd}`

export type XDocsSkillRecord = {
  id: string
  path: string
  description: string
  metadata: Record<string, unknown>
}

export function listEmbeddedSkills(filter?: string): XDocsSkillRecord[] {
  const record = readEmbeddedSkillRecord()
  if (!filter) return [record]
  const query = filter.toLowerCase()
  return [record].filter((item) =>
    item.id.toLowerCase().includes(query)
    || item.description.toLowerCase().includes(query))
}

export function showEmbeddedSkill(id: string): XDocsSkillRecord {
  if (id !== xdocsSkillName) throw new XDocsError(`Unknown skill id: "${id}"`, 2)
  return readEmbeddedSkillRecord()
}

export async function installSkills(scope: XDocsSkillScope, options: { cwd?: string } = {}): Promise<XDocsSkillInstallResult[]> {
  if (!xdocsSkillContent) throw new XDocsError('Bundled xdocs skill content is unavailable.', 5)
  const root = scope === 'global' ? homeDirectory() : resolvePath(options.cwd ?? process.cwd())
  const results: XDocsSkillInstallResult[] = []

  for (const tool of xdocsAgentTools) {
    const base = tool === 'agents' ? '.agents/skills' : '.claude/skills'
    const destination = joinPath(root, base, xdocsSkillName)
    const destinationFile = joinPath(destination, 'SKILL.md')
    const previous = await pathExists(destinationFile) ? await readText(destinationFile) : undefined
    const removedLegacyPaths: string[] = []

    for (const legacy of legacyXdocsSkillNames) {
      const legacyPath = joinPath(root, base, legacy)
      if (await pathExists(legacyPath)) {
        await removePath(legacyPath, { recursive: true, force: true })
        removedLegacyPaths.push(legacyPath)
      }
    }

    await writeText(destinationFile, xdocsSkillContent)
    results.push({
      tool,
      scope,
      path: destination,
      installed: previous === undefined,
      updated: previous !== undefined && previous !== xdocsSkillContent,
      removedLegacyPaths,
      previousVersion: previous ? readSkillVersion(previous) : undefined,
      bundledVersion: xdocsSkillVersion,
    })
  }
  return results
}

export const updateSkills = installSkills

export async function uninstallSkills(scope: XDocsSkillScope, options: { cwd?: string } = {}): Promise<string[]> {
  const root = scope === 'global' ? homeDirectory() : resolvePath(options.cwd ?? process.cwd())
  const removed: string[] = []
  for (const tool of xdocsAgentTools) {
    const base = tool === 'agents' ? '.agents/skills' : '.claude/skills'
    for (const name of [xdocsSkillName, ...legacyXdocsSkillNames]) {
      const target = joinPath(root, base, name)
      if (await pathExists(target)) {
        await removePath(target, { recursive: true, force: true })
        removed.push(target)
      }
    }
  }
  return removed
}

export async function applyInstructions(cwd: string): Promise<XDocsAgentsInstructionsResult[]> {
  const targets = await resolveInstructionTargets(cwd)
  return Promise.all(targets.map(async (path) => {
    const exists = await pathExists(path)
    const current = exists ? await readText(path) : ''
    const next = replaceInstructionBlock(current, xdocsInstructionBlock)
    const changed = current !== next
    if (changed) await writeText(path, next)
    return { path, exists, changed }
  }))
}

export const updateInstructions = applyInstructions

export async function removeInstructions(cwd: string): Promise<XDocsAgentsInstructionsResult[]> {
  const targets = await existingInstructionTargets(cwd)
  return Promise.all(targets.map(async (path) => {
    const current = await readText(path)
    const next = removeInstructionBlock(current)
    const changed = current !== next
    if (changed) await writeText(path, next)
    return { path, exists: true, changed }
  }))
}

export async function resolveInstructionTargets(cwd: string): Promise<string[]> {
  const existing = await existingInstructionTargets(cwd)
  return existing.length > 0 ? existing : [joinPath(resolvePath(cwd), 'AGENTS.md')]
}

async function existingInstructionTargets(cwd: string): Promise<string[]> {
  const root = resolvePath(cwd)
  const candidates = [joinPath(root, 'AGENTS.md'), joinPath(root, 'CLAUDE.md')]
  const checks = await Promise.all(candidates.map(async (path) => ({ path, exists: await pathExists(path) })))
  return checks.filter((item) => item.exists).map((item) => item.path)
}

function replaceInstructionBlock(content: string, block: string): string {
  const without = removeInstructionBlock(content)
  return `${without.trimEnd()}${without.trim() ? '\n\n' : ''}${block}\n`
}

function removeInstructionBlock(content: string): string {
  const escapedBegin = escapeRegExp(instructionBegin)
  const escapedEnd = escapeRegExp(instructionEnd)
  const current = new RegExp(`\\s*${escapedBegin}[\\s\\S]*?${escapedEnd}\\s*`, 'g')
  const legacy = /(?:\s*)<!-- BEGIN XDOCS [\s\S]*?<!-- END XDOCS -->(?:\s*)/g
  return content.replace(current, '\n\n').replace(legacy, '\n\n').trimEnd() + (content.trim() ? '\n' : '')
}

function readEmbeddedSkillRecord(): XDocsSkillRecord {
  const split = splitFrontmatter(xdocsSkillContent)
  const metadata = decodeWithSchema<Record<string, unknown>>(AgentSkillMetadataSchema, Bun.YAML.parse(split.frontmatter), 'bundled xdocs skill metadata', 5)
  return {
    id: xdocsSkillName,
    path: `skills/${xdocsSkillName}/SKILL.md`,
    description: String(metadata['description']),
    metadata,
  }
}

function readSkillVersion(content: string): string | undefined {
  try {
    const parsed = Bun.YAML.parse(splitFrontmatter(content).frontmatter) as Record<string, unknown>
    const metadata = parsed['metadata']
    if (metadata && typeof metadata === 'object' && typeof (metadata as Record<string, unknown>)['version'] === 'string') {
      return (metadata as Record<string, unknown>)['version'] as string
    }
    return typeof parsed['version'] === 'string' ? parsed['version'] : undefined
  } catch {
    return undefined
  }
}

function splitFrontmatter(content: string): { frontmatter: string, body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match?.[1]) throw new XDocsError('Bundled xdocs skill is missing YAML frontmatter.', 5)
  return { frontmatter: match[1], body: match[2] ?? '' }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
