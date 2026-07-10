/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Agent skill installation and AGENTS.md instructions for xdocs.
 *
 * Two distinct things live here:
 *  1. The small AGENTS.md section that tells any AI agent that xdocs structured
 *     documentation exists and that it should load the guiho-s-xdocs skill.
 *  2. The large guiho-s-xdocs skill file, installed (local or global) into the
 *     skills directory of one or more AI tools.
 */

import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, resolve } from 'node:path'
import type {
  XDocsAgentAutomationResult,
  XDocsAgentSettings,
  XDocsAgentTool,
  XDocsAgentsInstructionsResult,
  XDocsCliOptions,
  XDocsSkillInstallResult,
  XDocsSkillScope,
} from './types.js'
import { discoverConfig, normalizeAgentSettings } from './config.js'
import { XDocsError } from './errors.js'

/** Canonical name of the xdocs agent skill. */
export const xdocsSkillName = 'guiho-s-xdocs'

/** Previous skill names that should be removed during install/refresh. */
export const legacyXdocsSkillNames: readonly string[] = ['guiho-as-xdocs']

/** Raw contents of the bundled guiho-s-xdocs/SKILL.md, read from disk at
 * runtime (relative to this module) so the compiled library works under both
 * Node and Bun. The file ships with the package in `skills/`. */
export const xdocsSkillContent: string = (() => {
  const embedded = globalThis.__XDOCS_EMBEDDED_RESOURCES__?.skill
  if (embedded) return embedded

  try {
    return readFileSync(new URL('../skills/guiho-s-xdocs/SKILL.md', import.meta.url), 'utf8')
  } catch {
    return ''
  }
})()

/** Version declared by the bundled skill frontmatter. */
export const xdocsSkillVersion = readSkillVersion(xdocsSkillContent)

/** All AI tools the skill can be installed for. `agents` is the standard. */
export const xdocsAgentTools: readonly XDocsAgentTool[] = ['agents', 'claude']

/** The standard, always-default skill target (AGENTS.md + .agents/skills). */
export const standardAgentTool: XDocsAgentTool = 'agents'

/** Parse an explicit `--tool` value into a list of tools (`all` expands to every tool). */
export const parseAgentTools = (value: string | undefined): XDocsAgentTool[] => {
  if (!value || value === standardAgentTool) return [standardAgentTool]
  if (value === 'all') return [...xdocsAgentTools]
  if (xdocsAgentTools.includes(value as XDocsAgentTool)) return [value as XDocsAgentTool]
  throw new XDocsError(`Invalid --tool value: "${value}". Expected ${xdocsAgentTools.join(', ')}, or all.`)
}

/**
 * Detect which tools to install for when no `--tool` is given. The standard
 * `agents` target is always included; non-standard targets are only added when
 * their files are already present in the project (e.g. Claude Code).
 */
export const detectAgentTools = (cwd: string): XDocsAgentTool[] => {
  const tools: XDocsAgentTool[] = [standardAgentTool]
  const root = resolve(cwd)
  if (existsSync(resolve(root, '.claude')) || existsSync(resolve(root, 'CLAUDE.md'))) tools.push('claude')
  return tools
}

/**
 * Resolve the tools to install for: an explicit `--tool` value wins; otherwise
 * fall back to detection (standard plus any detected non-standard tools).
 */
export const resolveInstallTools = (cwd: string, toolFlag: string | undefined): XDocsAgentTool[] =>
  toolFlag ? parseAgentTools(toolFlag) : detectAgentTools(cwd)

/**
 * Skill directory for each tool, relative to the scope root (project root for
 * `local`, home directory for `global`). The skill is written to
 * `<root>/<dir>/guiho-s-xdocs/SKILL.md`.
 *
 * `agents` is the cross-tool standard (OpenCode, Codex, Jules, and any AGENTS.md
 * tool read it). `claude` is the non-standard Claude Code location.
 */
const skillDirectories: Record<XDocsAgentTool, string> = {
  agents: '.agents/skills',
  claude: '.claude/skills',
}

const AGENTS_BEGIN_MARKER = '<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->'
const AGENTS_END_MARKER = '<!-- END XDOCS -->'

/** The small AGENTS.md section announcing xdocs and pointing to the skill. */
export const xdocsAgentsSection = `${AGENTS_BEGIN_MARKER}
## XDocs Structured Documentation

This project uses **xdocs** (\`@guiho/xdocs\`) for structured, machine-readable
documentation. The repository has one root \`XDOCS.md\` index (no frontmatter),
and each package/application has a root named \`*.xdocs.md\` descriptor file. Each
documented module has exactly one named \`*.xdocs.md\` descriptor in its directory
with YAML frontmatter (\`subject\`, \`description\`, \`parent\`, \`children\`,
\`files\`, \`documents\`, \`tags\`, \`keywords\`, \`flags\`). Same-directory plain
\`*.md\` files are companion documents and must be listed in the descriptor's
\`documents\` metadata map. Ordinary companion documents should also include
frontmatter with \`owner\`, \`tags\`, and \`keywords\` so agents can inspect
metadata before reading full Markdown bodies.

**Load the \`${xdocsSkillName}\` agent skill** for any documentation work:
creating, updating, regenerating, scanning, merging, or navigating xdocs descriptors.
The skill holds the full workflow, metadata schema, and CLI reference.

Before changing documentation, read \`xdocs.config.toml\` and respect \`[ai].mode\`:

- **prompt** — announce which xdocs descriptors need updating and wait for confirmation.
- **auto** — update the relevant xdocs descriptors immediately.

Use the installed xdocs CLI for operations. Prefer \`xdocs context "<query>"
[path] --documents --files --format json\` to get a task-specific reading set,
or \`xdocs meta [path] --documents --format json\` when you only need
frontmatter. Other commands: \`xdocs scan\`, \`xdocs tree\`, \`xdocs generate\`,
\`xdocs list\`, \`xdocs doctor\`, \`xdocs merge\`, \`xdocs upgrade\`, and
\`xdocs uninstall --dry-run\`.
${AGENTS_END_MARKER}`

type SkillPathOptions = {
  cwd?: string
  homeDirectory?: string
}

type SkillInstallOptions = SkillPathOptions & {
  overwrite?: boolean
}

type AgentAutomationOptions = XDocsCliOptions & {
  homeDirectory?: string
}

/** Resolve the on-disk path of the skill file for a tool and scope. */
export const resolveSkillPath = (tool: XDocsAgentTool, scope: XDocsSkillScope, options: SkillPathOptions = {}): string =>
  resolveNamedSkillPath(tool, scope, xdocsSkillName, options)

const resolveNamedSkillPath = (tool: XDocsAgentTool, scope: XDocsSkillScope, skillName: string, options: SkillPathOptions = {}): string => {
  const root = scope === 'local' ? resolve(options.cwd ?? process.cwd()) : resolveAgentHome(options.homeDirectory)
  return resolve(root, skillDirectories[tool], skillName, 'SKILL.md')
}

/** Whether the skill is already installed for a tool and scope. */
export const isSkillInstalled = (tool: XDocsAgentTool, scope: XDocsSkillScope, options: SkillPathOptions = {}): boolean =>
  existsSync(resolveSkillPath(tool, scope, options))

/** Install (or refresh) the skill for a single tool and scope. */
export const installSkill = async (
  tool: XDocsAgentTool,
  scope: XDocsSkillScope,
  options: SkillInstallOptions = {},
): Promise<XDocsSkillInstallResult> => {
  const path = resolveSkillPath(tool, scope, options)
  const exists = existsSync(path)
  const current = exists ? await readFile(path, 'utf8') : undefined
  const previousVersion = current ? readSkillVersion(current) : undefined
  const bundledVersion = xdocsSkillVersion

  if (exists && options.overwrite === false) {
    return { tool, scope, path, installed: false, updated: false, removedLegacyPaths: [], previousVersion, bundledVersion }
  }

  const removedLegacyPaths: string[] = []
  for (const legacyName of legacyXdocsSkillNames) {
    const legacyPath = resolveNamedSkillPath(tool, scope, legacyName, options)
    if (!existsSync(legacyPath)) continue

    await rm(dirname(legacyPath), { recursive: true, force: true })
    removedLegacyPaths.push(legacyPath)
  }

  if (current === xdocsSkillContent) {
    return { tool, scope, path, installed: false, updated: false, removedLegacyPaths, previousVersion, bundledVersion }
  }

  if (exists) await rm(dirname(path), { recursive: true, force: true })
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, xdocsSkillContent, 'utf8')

  return { tool, scope, path, installed: !exists, updated: exists, removedLegacyPaths, previousVersion, bundledVersion }
}

/** Install the skill for several tools at once. */
export const installSkills = async (
  tools: readonly XDocsAgentTool[],
  scope: XDocsSkillScope,
  options: SkillInstallOptions = {},
): Promise<XDocsSkillInstallResult[]> => {
  const results: XDocsSkillInstallResult[] = []
  for (const tool of tools) results.push(await installSkill(tool, scope, options))
  return results
}

/**
 * Ensure the xdocs section is present in AGENTS.md.
 *
 * - When the file is missing and `create` is false, nothing is written.
 * - When the section markers exist, the block is replaced in place (idempotent).
 * - When the markers are absent, the section is appended.
 */
export const ensureAgentsInstructions = async (cwd: string, create = false): Promise<XDocsAgentsInstructionsResult> => {
  const path = findAgentsFile(cwd) ?? resolve(cwd, 'AGENTS.md')
  const exists = existsSync(path)

  if (!exists && !create) return { path, exists: false, changed: false }

  if (!exists) {
    await writeFile(path, `# Agent Instructions\n\n${xdocsAgentsSection}\n`, 'utf8')
    return { path, exists: true, changed: true }
  }

  const content = await readFile(path, 'utf8')
  const nextContent = upsertAgentsSection(content)

  if (nextContent === content) return { path, exists: true, changed: false }

  await writeFile(path, nextContent, 'utf8')
  return { path, exists: true, changed: true }
}

/** Replace the xdocs block between markers, or append it when absent. */
const upsertAgentsSection = (content: string): string => {
  const begin = content.indexOf(AGENTS_BEGIN_MARKER)
  const end = content.indexOf(AGENTS_END_MARKER)

  if (begin !== -1 && end !== -1 && end > begin) {
    const blockEnd = end + AGENTS_END_MARKER.length
    const currentBlock = content.slice(begin, blockEnd)
    if (normalizeAgentsSection(currentBlock) === normalizeAgentsSection(xdocsAgentsSection)) return content

    const before = content.slice(0, begin)
    const after = content.slice(blockEnd)
    return `${before}${xdocsAgentsSection}${after}`
  }

  return `${content.trimEnd()}\n\n${xdocsAgentsSection}\n`
}

/** Ignore blank-only lines and trailing whitespace when comparing formatted sections. */
const normalizeAgentsSection = (content: string): string =>
  content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .join('\n')

/** Walk up from cwd to find the nearest AGENTS.md. */
export const findAgentsFile = (cwd: string): string | undefined => {
  let current = resolve(cwd)

  while (true) {
    const path = resolve(current, 'AGENTS.md')
    if (existsSync(path)) return path

    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

/** Resolve agent settings from the discovered xdocs config (defaults when absent). */
export const resolveAgentSettings = async (options: XDocsCliOptions): Promise<XDocsAgentSettings> => {
  const cwd = resolve(options.cwd)
  const discovered = await discoverConfig(cwd, options.config)
  return normalizeAgentSettings(discovered.raw?.agents)
}

/**
 * Agent automation run by bare and data commands. It always bootstraps the
 * configured global skill from the bundled package copy; when config exists,
 * it also keeps the AGENTS.md section fresh if enabled and AGENTS.md exists.
 */
export const runAgentAutomation = async (
  options: AgentAutomationOptions,
  notify: (message: string) => void = () => {},
): Promise<XDocsAgentAutomationResult> => {
  const cwd = resolve(options.cwd)
  const discovered = await discoverConfig(cwd, options.config)
  const settings = normalizeAgentSettings(discovered.raw?.agents)
  const result: XDocsAgentAutomationResult = { settings }

  if (discovered.raw && settings.autoAgentsMd) result.agentsMd = await ensureAgentsInstructions(cwd, false)

  if (settings.autoSkillInstall) {
    const globalSkill = await installSkill(settings.skillTool, 'global', { cwd, homeDirectory: options.homeDirectory })
    const changed = globalSkill.installed || globalSkill.updated || globalSkill.removedLegacyPaths.length > 0
    if (changed) notify(`notice: ${xdocsSkillName} skill refreshed globally at ${globalSkill.path}`)
    result.globalSkill = globalSkill
  }

  return result
}

/** Read a skill version from SKILL.md YAML frontmatter. */
export function readSkillVersion(content: string): string | undefined {
  const frontmatter = extractSkillFrontmatter(content)
  if (!frontmatter) return undefined

  return readNestedSkillFrontmatterValue(frontmatter, 'metadata', 'version') ?? readSkillFrontmatterValue(frontmatter, 'version')
}

function extractSkillFrontmatter(content: string): string | undefined {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return undefined
  return match[1]
}

function readSkillFrontmatterValue(frontmatter: string, key: string): string | undefined {
  for (const line of frontmatter.split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    if (line.slice(0, separator).trim() !== key) continue

    const value = line.slice(separator + 1).trim()
    if (!value) return undefined
    return value.replace(/^['"]|['"]$/g, '')
  }

  return undefined
}

function readNestedSkillFrontmatterValue(frontmatter: string, parentKey: string, key: string): string | undefined {
  const lines = frontmatter.split(/\r?\n/)
  let parentIndent: number | undefined

  for (const line of lines) {
    if (line.trim().length === 0) continue

    const indent = line.length - line.trimStart().length
    const trimmed = line.trim()

    if (parentIndent === undefined) {
      if (trimmed === `${parentKey}:`) parentIndent = indent
      continue
    }

    if (indent <= parentIndent) {
      parentIndent = trimmed === `${parentKey}:` ? indent : undefined
      continue
    }

    const separator = trimmed.indexOf(':')
    if (separator === -1) continue
    if (trimmed.slice(0, separator).trim() !== key) continue

    const value = trimmed.slice(separator + 1).trim()
    if (!value) return undefined
    return value.replace(/^['"]|['"]$/g, '')
  }

  return undefined
}

const resolveAgentHome = (homeDirectory?: string): string => {
  const value = homeDirectory ?? process.env['XDOCS_AGENT_HOME'] ?? homedir()
  return isAbsolute(value) ? value : resolve(process.cwd(), value)
}
