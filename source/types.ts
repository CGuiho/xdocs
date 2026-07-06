/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

/** Supported output formats for CLI commands. */
export type XDocsFormat = 'text' | 'json' | 'markdown'

/** AI behavior mode for documentation updates. */
export type XDocsAiMode = 'prompt' | 'auto'

/** Command names recognized by the CLI. */
export type XDocsCommand = 'init' | 'scan' | 'generate' | 'prompt' | 'merge' | 'tree' | 'list' | 'agents'

/** AI tools the guiho-s-xdocs skill can be installed for.
 *
 * `agents` is the standard target (AGENTS.md + .agents/skills) and the default.
 * `claude` is a non-standard target (.claude/skills) used only when explicitly
 * requested or auto-detected. */
export type XDocsAgentTool = 'agents' | 'claude'

/** Scope of an agent-skill installation. */
export type XDocsSkillScope = 'local' | 'global'

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
  agents: Partial<{
    auto_agents_md: boolean
    auto_skill_install: boolean
    skill_tool: string
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
  agents: XDocsAgentSettings
}

/** Normalized agent automation settings. */
export type XDocsAgentSettings = {
  autoAgentsMd: boolean
  autoSkillInstall: boolean
  skillTool: XDocsAgentTool
}

/** YAML frontmatter metadata from an xdocs descriptor. */
export type XDocsMetadata = {
  subject: string
  description: string
  parent: string | null
  children: string[]
  files: Record<string, string>
  documents: Record<string, string>
  tags: string[]
  keywords: string[]
  flags: string[]
  status?: string
}

/** A sibling Markdown document listed by a module descriptor. */
export type XDocsMarkdownDocument = {
  path: string
  relativePath: string
  directory: string
  name: string
}

/** A discovered xdocs descriptor with its path and parsed metadata. */
export type XDocsFile = {
  path: string
  relativePath: string
  directory: string
  metadata: XDocsMetadata | null
  documents: XDocsMarkdownDocument[]
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
  totalMarkdownDocuments: number
  coveredDirectories: number
  uncoveredDirectories: number
  xdocsFiles: XDocsFile[]
  markdownDocuments: XDocsMarkdownDocument[]
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

/** Result of installing the guiho-s-xdocs skill for one tool/scope. */
export type XDocsSkillInstallResult = {
  tool: XDocsAgentTool
  scope: XDocsSkillScope
  path: string
  installed: boolean
  updated: boolean
  removedLegacyPaths: string[]
  previousVersion?: string
  bundledVersion?: string
}

/** Result of ensuring the xdocs section exists in AGENTS.md. */
export type XDocsAgentsInstructionsResult = {
  path: string
  exists: boolean
  changed: boolean
}

/** Result of the config-gated agent automation that runs on normal commands. */
export type XDocsAgentAutomationResult = {
  settings: XDocsAgentSettings
  agentsMd?: XDocsAgentsInstructionsResult
  globalSkill?: XDocsSkillInstallResult
}
