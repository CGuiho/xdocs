/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsAiMode, XDocsCliOptions, XDocsConfig, XDocsRawConfig } from './types.js'
import { XDocsError } from './errors.js'
import { XDocsRawConfigSchema, decodeWithSchema } from './schemas.js'
import { homeDirectory } from './runtime/home.js'
import { pathExists, readText, writeText } from './runtime/fs.js'
import { basename, isAbsolute, joinPath, resolvePath } from './runtime/path.js'

const DEFAULT_EXTENSIONS = ['.xdocs.md']
const DEFAULT_EXCLUDE = ['node_modules', '.git', 'dist', 'build', 'library', 'bin', 'bundle']
const DEFAULT_AI_MODE: XDocsAiMode = 'prompt'
export const CONFIG_FILENAME = 'xdocs.yaml'

/** Discover xdocs.yaml using the RFC 0034 precedence contract. */
export const discoverConfig = async (cwd: string, explicitPath?: string): Promise<{ path?: string, raw?: XDocsRawConfig }> => {
  if (explicitPath) {
    const configPath = resolveConfigPath(cwd, explicitPath)
    return { path: configPath, raw: await readConfigFile(configPath) }
  }

  const projectPath = resolvePath(cwd, CONFIG_FILENAME)
  if (await pathExists(projectPath)) return { path: projectPath, raw: await readConfigFile(projectPath) }

  const globalPath = joinPath(homeDirectory(), '.guiho', 'xdocs', CONFIG_FILENAME)
  if (await pathExists(globalPath)) return { path: globalPath, raw: await readConfigFile(globalPath) }

  return {}
}

/** Load and normalize required xdocs configuration. */
export const loadConfig = async (options: XDocsCliOptions): Promise<XDocsConfig> => {
  const cwd = resolvePath(options.cwd)
  const discovered = await discoverConfig(cwd, options.config)
  if (!discovered.raw) {
    throw new XDocsError('xdocs configuration not found. Run `xdocs init` to create xdocs.yaml.', 3)
  }
  return normalizeConfig(discovered.raw, cwd, discovered.path)
}

/** Load config if it exists, otherwise return deterministic defaults. */
export const loadConfigOrDefaults = async (options: XDocsCliOptions): Promise<XDocsConfig> => {
  const cwd = resolvePath(options.cwd)
  const discovered = await discoverConfig(cwd, options.config)
  if (!discovered.raw) return defaultConfig(cwd)
  return normalizeConfig(discovered.raw, cwd, discovered.path)
}

/** Normalize a TypeBox-decoded YAML configuration. */
export const normalizeConfig = (input: XDocsRawConfig, cwd: string, configPath?: string): XDocsConfig => {
  const raw = decodeWithSchema<XDocsRawConfig>(XDocsRawConfigSchema, input, `xdocs YAML configuration${configPath ? ` at ${configPath}` : ''}`, 3)
  const extensions = raw.extensions?.supported ?? DEFAULT_EXTENSIONS
  const normalizedExtensions = extensions.map((ext) => ext.toLowerCase())
  if (normalizedExtensions.length !== 1 || normalizedExtensions[0] !== '.xdocs.md') {
    throw new XDocsError('Invalid extensions.supported. xdocs supports only named "*.xdocs.md" descriptor files.', 3)
  }

  return {
    schema: 1,
    cwd,
    configPath,
    extensions: { supported: [...DEFAULT_EXTENSIONS] },
    ai: { mode: (raw.ai?.mode as XDocsAiMode | undefined) ?? DEFAULT_AI_MODE },
    scan: { exclude: raw.scan?.exclude ?? [...DEFAULT_EXCLUDE] },
    project: { name: raw.project?.name ?? basename(cwd) },
  }
}

export const defaultConfig = (cwd: string): XDocsConfig => ({
  schema: 1,
  cwd,
  extensions: { supported: [...DEFAULT_EXTENSIONS] },
  ai: { mode: DEFAULT_AI_MODE },
  scan: { exclude: [...DEFAULT_EXCLUDE] },
  project: { name: basename(cwd) },
})

export const createDefaultConfigContent = (cwd: string): string => {
  const name = basename(cwd).replaceAll('"', '\\"')
  return `schema: 1
extensions:
  supported:
    - .xdocs.md
ai:
  mode: prompt
scan:
  exclude:
    - node_modules
    - .git
    - dist
    - build
    - library
    - bin
    - bundle
project:
  name: "${name}"
`
}

export const writeDefaultConfig = async (cwd: string, overwrite = false): Promise<string> => {
  const path = resolvePath(cwd, CONFIG_FILENAME)
  if (await pathExists(path) && !overwrite) throw new XDocsError(`Configuration already exists: ${path}`, 5)
  await writeText(path, createDefaultConfigContent(cwd))
  return path
}

const readConfigFile = async (path: string): Promise<XDocsRawConfig> => {
  if (!(await pathExists(path))) throw new XDocsError(`Configuration file not found: ${path}`, 3)
  const content = await readText(path)
  let parsed: unknown
  try {
    parsed = Bun.YAML.parse(content)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new XDocsError(`Invalid YAML in configuration file: ${path}\n${message}`, 3)
  }
  return decodeWithSchema<XDocsRawConfig>(XDocsRawConfigSchema, parsed, `xdocs YAML configuration at ${path}`, 3)
}

export const resolveConfigPath = (cwd: string, path: string): string =>
  isAbsolute(path) ? resolvePath(path) : resolvePath(cwd, path)
