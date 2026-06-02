/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

/** Supported output formats for CLI commands. */
export type XDocsFormat = 'text' | 'json' | 'markdown'

/** AI behavior mode for documentation updates. */
export type XDocsAiMode = 'prompt' | 'auto'

/** Command names recognized by the CLI. */
export type XDocsCommand = 'init' | 'scan' | 'generate' | 'prompt' | 'merge' | 'tree' | 'list'

/** Raw configuration as parsed from xdocs.config.toml. */
export type XDocsRawConfig = Partial<{
  schema: number
  extensions: Partial<{
    supported: string[]
  }>
  ai: Partial<{
    mode: string
  }>
  scan: Partial<{
    exclude: string[]
  }>
  project: Partial<{
    name: string
  }>
}>

/** Normalized, validated configuration. */
export type XDocsConfig = {
  schema: 1
  cwd: string
  configPath?: string
  extensions: {
    supported: string[]
  }
  ai: {
    mode: XDocsAiMode
  }
  scan: {
    exclude: string[]
  }
  project: {
    name: string
  }
}

/** YAML frontmatter metadata from an xdocs file. */
export type XDocsMetadata = {
  subject: string
  description: string
  parent: string | null
  children: string[]
  files: Record<string, string>
  tags: string[]
  flags: string[]
  status?: string
}

/** A discovered xdocs file with its path and parsed metadata. */
export type XDocsFile = {
  path: string
  relativePath: string
  directory: string
  metadata: XDocsMetadata | null
  body: string
  valid: boolean
  errors: string[]
}

/** A node in the xdocs hierarchy tree. */
export type XDocsTreeNode = {
  subject: string
  description: string
  path: string | null
  children: XDocsTreeNode[]
}

/** Result of a tree integrity check. */
export type XDocsTreeValidation = {
  valid: boolean
  warnings: string[]
  errors: string[]
}

/** Parsed CLI arguments. */
export type XDocsParsedArgs = {
  command: string | undefined
  positionals: string[]
  flags: Record<string, string | boolean | string[]>
}

/** Options passed through the CLI to command handlers. */
export type XDocsCliOptions = {
  cwd: string
  config?: string
  format: XDocsFormat
  verbose: boolean
}

/** Scan result for a single directory. */
export type XDocsScanResult = {
  totalFiles: number
  totalDirectories: number
  coveredDirectories: number
  uncoveredDirectories: number
  xdocsFiles: XDocsFile[]
  uncoveredPaths: string[]
}

/** Available prompt names for xdocs prompt --name. */
export type XDocsPromptName = 'write' | 'update' | 'agents' | 'generate'

/** A parsed prompt loaded from a .md file. */
export type XDocsPrompt = {
  name: string
  description: string
  body: string
}
