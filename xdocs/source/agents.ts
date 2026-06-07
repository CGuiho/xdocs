/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Agent skill installation and AGENTS.md instructions for xdocs.
 *
 * Two distinct things live here:
 *  1. The small AGENTS.md section that tells any AI agent that xdocs structured
 *     documentation exists and that it should load the guiho-as-xdocs skill.
 *  2. The large guiho-as-xdocs skill file, installed (local or global) into the
 *     skills directory of one or more AI tools.
 */

// @ts-expect-error -- Bun text import, no TS declaration needed
import skillRaw from '../skills/guiho-as-xdocs/SKILL.md' with { type: 'text' }

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
export const xdocsSkillName = 'guiho-as-xdocs'

/** Raw contents of the bundled guiho-as-xdocs/SKILL.md (embedded at build time). */
export const xdocsSkillContent: string = skillRaw

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
 * `<root>/<dir>/guiho-as-xdocs/SKILL.md`.
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
documentation. Each module carries a \`.docs.md\` / \`.xdocs.md\` file with YAML
frontmatter (\`subject\`, \`description\`, \`parent\`, \`children\`, \`files\`), and the
root \`XDOCS.md\` is the top of the tree.

**Load the \`${xdocsSkillName}\` agent skill** for any documentation work:
creating, updating, regenerating, scanning, merging, or navigating xdocs files.
The skill holds the full workflow, metadata schema, and CLI reference.

Before changing documentation, read \`xdocs.config.toml\` and respect \`[ai].mode\`:

- **prompt** — announce which xdocs files need updating and wait for confirmation.
- **auto** — update the relevant xdocs files immediately.

Use the xdocs CLI for operations: \`xdocs scan\`, \`xdocs tree\`, \`xdocs generate\`,
\`xdocs list\`, \`xdocs merge\`.
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
export const resolveSkillPath = (tool: XDocsAgentTool, scope: XDocsSkillScope, options: SkillPathOptions = {}): string => {
  const root = scope === 'local' ? resolve(options.cwd ?? process.cwd()) : resolveAgentHome(options.homeDirectory)
  return resolve(root, skillDirectories[tool], xdocsSkillName, 'SKILL.md')
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

  if (exists && options.overwrite === false) return { tool, scope, path, installed: false, updated: false }

  const current = exists ? await readFile(path, 'utf8') : undefined
  if (current === xdocsSkillContent) return { tool, scope, path, installed: false, updated: false }

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, xdocsSkillContent, 'utf8')

  return { tool, scope, path, installed: !exists, updated: exists }
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
    const before = content.slice(0, begin)
    const after = content.slice(end + AGENTS_END_MARKER.length)
    return `${before}${xdocsAgentsSection}${after}`
  }

  return `${content.trimEnd()}\n\n${xdocsAgentsSection}\n`
}

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
 * Config-gated automation run by normal commands. Does nothing outside an xdocs
 * project (no config discovered). When enabled, it keeps the AGENTS.md section
 * fresh (only if AGENTS.md already exists) and installs the global skill for the
 * configured tool when it is missing.
 */
export const runAgentAutomation = async (
  options: AgentAutomationOptions,
  notify: (message: string) => void = () => {},
): Promise<XDocsAgentAutomationResult> => {
  const cwd = resolve(options.cwd)
  const discovered = await discoverConfig(cwd, options.config)

  if (!discovered.raw) return { settings: { ...normalizeAgentSettings(undefined) } }

  const settings = normalizeAgentSettings(discovered.raw.agents)
  const result: XDocsAgentAutomationResult = { settings }

  if (settings.autoAgentsMd) result.agentsMd = await ensureAgentsInstructions(cwd, false)

  if (settings.autoSkillInstall && !isSkillInstalled(settings.skillTool, 'global', { cwd, homeDirectory: options.homeDirectory })) {
    const path = resolveSkillPath(settings.skillTool, 'global', { cwd, homeDirectory: options.homeDirectory })
    notify(`notice: ${xdocsSkillName} skill not found globally; xdocs is installing it at ${path}`)
    result.globalSkill = await installSkill(settings.skillTool, 'global', { cwd, homeDirectory: options.homeDirectory, overwrite: false })
  }

  return result
}

const resolveAgentHome = (homeDirectory?: string): string => {
  const value = homeDirectory ?? process.env['XDOCS_AGENT_HOME'] ?? homedir()
  return isAbsolute(value) ? value : resolve(process.cwd(), value)
}
