/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, resolve } from 'node:path'
import type { XDocsAgentSettings, XDocsAgentTool, XDocsAiMode, XDocsCliOptions, XDocsConfig, XDocsRawConfig } from './types.js'
import { XDocsError } from './errors.js'

const DEFAULT_EXTENSIONS = ['.docs.md', '.xdocs.md']
const DEFAULT_EXCLUDE = ['node_modules', '.git', 'dist', 'build', 'library', 'bin', 'bundle']
const DEFAULT_AI_MODE: XDocsAiMode = 'prompt'
const CONFIG_FILENAME = 'xdocs.config.toml'

const AGENT_TOOLS = new Set<XDocsAgentTool>(['agents', 'claude'])

/** Default agent automation settings when no [agents] section is configured. */
export const DEFAULT_AGENT_SETTINGS: XDocsAgentSettings = {
  autoAgentsMd: true,
  autoSkillInstall: true,
  skillTool: 'agents',
}

/** Normalize the raw [agents] config section into validated settings. */
export const normalizeAgentSettings = (raw: XDocsRawConfig['agents']): XDocsAgentSettings => {
  if (raw === undefined) return { ...DEFAULT_AGENT_SETTINGS }

  const autoAgentsMd = optionalBoolean(raw.auto_agents_md, 'agents.auto_agents_md')
  const autoSkillInstall = optionalBoolean(raw.auto_skill_install, 'agents.auto_skill_install')
  const skillTool = raw.skill_tool

  if (skillTool !== undefined && (typeof skillTool !== 'string' || !AGENT_TOOLS.has(skillTool as XDocsAgentTool))) {
    throw new XDocsError(`Invalid agents.skill_tool: "${String(skillTool)}". Expected agents or claude.`)
  }

  return {
    autoAgentsMd: autoAgentsMd !== false,
    autoSkillInstall: autoSkillInstall !== false,
    skillTool: (skillTool as XDocsAgentTool | undefined) ?? DEFAULT_AGENT_SETTINGS.skillTool,
  }
}

const optionalBoolean = (value: unknown, key: string): boolean | undefined => {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new XDocsError(`Invalid ${key}. Expected true or false.`)
  return value
}

/** Discover the xdocs.config.toml file. */
export const discoverConfig = async (cwd: string, explicitPath?: string): Promise<{ path?: string, raw?: XDocsRawConfig }> => {
  if (explicitPath) {
    const configPath = resolvePath(cwd, explicitPath)
    return { path: configPath, raw: await readConfigFile(configPath) }
  }

  const rootPath = resolve(cwd, CONFIG_FILENAME)
  if (existsSync(rootPath)) return { path: rootPath, raw: await readConfigFile(rootPath) }

  const nestedPath = resolve(cwd, 'config', CONFIG_FILENAME)
  if (existsSync(nestedPath)) return { path: nestedPath, raw: await readConfigFile(nestedPath) }

  return {}
}

/** Load and normalize the xdocs configuration. */
export const loadConfig = async (options: XDocsCliOptions): Promise<XDocsConfig> => {
  const cwd = resolve(options.cwd)
  const discovered = await discoverConfig(cwd, options.config)

  if (!discovered.raw) {
    throw new XDocsError(`xdocs configuration not found. Run \`xdocs init\` to create one.`)
  }

  return normalizeConfig(discovered.raw, cwd, discovered.path)
}

/** Load config if it exists, otherwise return defaults. */
export const loadConfigOrDefaults = async (options: XDocsCliOptions): Promise<XDocsConfig> => {
  const cwd = resolve(options.cwd)
  const discovered = await discoverConfig(cwd, options.config)

  if (!discovered.raw) return defaultConfig(cwd)

  return normalizeConfig(discovered.raw, cwd, discovered.path)
}

/** Normalize raw TOML config into validated XDocsConfig. */
export const normalizeConfig = (raw: XDocsRawConfig, cwd: string, configPath?: string): XDocsConfig => {
  if (raw.schema !== undefined && raw.schema !== 1) {
    throw new XDocsError('Unsupported configuration schema. Expected `schema = 1`.')
  }

  const aiMode = raw.ai?.mode
  if (aiMode !== undefined && aiMode !== 'prompt' && aiMode !== 'auto') {
    throw new XDocsError(`Invalid ai.mode: "${aiMode}". Expected "prompt" or "auto".`)
  }

  const extensions = raw.extensions?.supported ?? DEFAULT_EXTENSIONS
  if (!Array.isArray(extensions) || extensions.some((ext) => typeof ext !== 'string')) {
    throw new XDocsError('Invalid extensions.supported. Expected an array of strings.')
  }

  const exclude = raw.scan?.exclude ?? DEFAULT_EXCLUDE
  if (!Array.isArray(exclude) || exclude.some((dir) => typeof dir !== 'string')) {
    throw new XDocsError('Invalid scan.exclude. Expected an array of strings.')
  }

  return {
    schema: 1,
    cwd,
    configPath,
    extensions: { supported: extensions },
    ai: { mode: (aiMode as XDocsAiMode) ?? DEFAULT_AI_MODE },
    scan: { exclude },
    project: { name: raw.project?.name ?? basename(cwd) },
    agents: normalizeAgentSettings(raw.agents),
  }
}

/** Create a default config object for a given cwd. */
export const defaultConfig = (cwd: string): XDocsConfig => ({
  schema: 1,
  cwd,
  extensions: { supported: DEFAULT_EXTENSIONS },
  ai: { mode: DEFAULT_AI_MODE },
  scan: { exclude: DEFAULT_EXCLUDE },
  project: { name: basename(cwd) },
  agents: { ...DEFAULT_AGENT_SETTINGS },
})

/** Generate the default xdocs.config.toml content. */
export const createDefaultConfigContent = (cwd: string): string => {
  const name = basename(cwd)

  return `schema = 1

[extensions]
supported = [".docs.md", ".xdocs.md"]

[ai]
mode = "prompt"

[scan]
exclude = ["node_modules", ".git", "dist", "build", "library", "bin", "bundle"]

[project]
name = "${name}"

[agents]
auto_agents_md = true
auto_skill_install = true
skill_tool = "agents"
`
}

/** Write the default xdocs.config.toml to disk. */
export const writeDefaultConfig = async (cwd: string, overwrite = false): Promise<string> => {
  const path = resolve(cwd, CONFIG_FILENAME)

  if (existsSync(path) && !overwrite) {
    throw new XDocsError(`Configuration already exists: ${path}`)
  }

  await writeFile(path, createDefaultConfigContent(cwd), 'utf8')
  return path
}

/** Read and parse a TOML config file. */
const readConfigFile = async (path: string): Promise<XDocsRawConfig> => {
  if (!existsSync(path)) throw new XDocsError(`Configuration file not found: ${path}`)

  const content = await readFile(path, 'utf8')
  let parsed: unknown

  try {
    parsed = Bun.TOML.parse(content)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new XDocsError(`Invalid TOML in configuration file: ${path}\n${message}`)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new XDocsError(`Configuration file must contain a TOML object: ${path}`)
  }

  return parsed as XDocsRawConfig
}

/** Resolve a path relative to cwd if not absolute. */
export const resolvePath = (cwd: string, path: string) =>
  isAbsolute(path) ? path : resolve(cwd, path)
