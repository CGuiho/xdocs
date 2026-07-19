/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

/** Supported output formats for CLI commands. */
export type XDocsFormat = 'text' | 'json' | 'markdown'

/** AI behavior mode for documentation updates. */
export type XDocsAiMode = 'prompt' | 'auto'

/** Command names recognized by the CLI. */
export type XDocsCommand = 'init' | 'scan' | 'generate' | 'merge' | 'tree' | 'list' | 'meta' | 'context' | 'doctor' | 'agent' | 'upgrade' | 'uninstall'

/** AI tools the guiho-s-xdocs skill can be installed for.
 *
 * `agents` is the standard target (AGENTS.md + .agents/skills) and the default.
 * `claude` is a non-standard target (.claude/skills) used only when explicitly
 * requested or auto-detected. */
export type XDocsAgentTool = 'agents' | 'claude'

/** Scope of an agent-skill installation. */
export type XDocsSkillScope = 'local' | 'global'

/** Raw configuration as parsed from xdocs.yaml. */
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

/** Parsed YAML frontmatter as a generic key-value store. */
export type XDocsFrontmatter = Record<string, unknown>

/** Filters available to metadata-only scans. */
export type XDocsMetaFilters = {
  owner?: string
  tag?: string
  keyword?: string
}

/** Options for a metadata-only scan. */
export type XDocsMetaScanOptions = XDocsMetaFilters & {
  targetPath?: string
  includeDocuments?: boolean
  strict?: boolean
}

/** Parsed metadata for a companion Markdown document. */
export type XDocsMetaDocument = {
  path: string
  relativePath: string
  directory: string
  name: string
  owner: string | null
  valid: boolean
  frontmatter: XDocsFrontmatter | null
  errors: string[]
}

/** Parsed metadata for an xdocs descriptor. */
export type XDocsMetaDescriptor = {
  path: string
  relativePath: string
  directory: string
  subject: string | null
  valid: boolean
  frontmatter: XDocsFrontmatter | null
  metadata: XDocsMetadata | null
  documents: XDocsMetaDocument[]
  errors: string[]
}

/** Result of a metadata-only scan. */
export type XDocsMetaScanResult = {
  root: string
  targetPath: string
  includeDocuments: boolean
  strict: boolean
  filters: XDocsMetaFilters
  descriptors: XDocsMetaDescriptor[]
  errors: string[]
}

/** Kinds of entries returned by context lookup. */
export type XDocsContextEntryKind = 'descriptor' | 'file' | 'document'

/** Options for deterministic context lookup. */
export type XDocsContextOptions = XDocsMetaFilters & {
  targetPath?: string
  includeDocuments?: boolean
  includeFiles?: boolean
  limit?: number
}

/** One recommended item for an agent to read. */
export type XDocsContextEntry = {
  kind: XDocsContextEntryKind
  path: string
  source: string
  owner: string | null
  score: number
  reasons: string[]
  description: string | null
}

/** Result of deterministic context lookup. */
export type XDocsContextResult = {
  root: string
  targetPath: string
  query: string
  tokens: string[]
  includeDocuments: boolean
  includeFiles: boolean
  filters: XDocsMetaFilters
  entries: XDocsContextEntry[]
}

/** Severity levels emitted by xdocs doctor. */
export type XDocsDoctorSeverity = 'error' | 'warning'

/** One health-check issue emitted by xdocs doctor. */
export type XDocsDoctorIssue = {
  severity: XDocsDoctorSeverity
  code: string
  path: string | null
  message: string
}

/** Options for project health checks. */
export type XDocsDoctorOptions = {
  targetPath?: string
  includeDocuments?: boolean
  warningsAsErrors?: boolean
}

/** Result of project health checks. */
export type XDocsDoctorResult = {
  root: string
  targetPath: string
  valid: boolean
  summary: {
    errors: number
    warnings: number
  }
  issues: XDocsDoctorIssue[]
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

/** Available embedded prompt identifiers. */
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

/** Cached latest-version information written by the background update checker. */
export type XDocsUpdateCache = {
  newVersionAvailable: boolean
  latestVersion: string
  upgradeCommand?: string
  lastCheck: string
}

/** Supported native binary platform labels. */
export type XDocsNativePlatform = 'linux' | 'darwin' | 'windows'

/** Supported native binary architecture labels. */
export type XDocsNativeArch = 'x64' | 'arm64'

/** x64 binary variant preference. */
export type XDocsNativeVariant = 'baseline' | 'default' | 'modern'

/** Release channel derived from a semantic version. */
export type XDocsReleaseChannel = string

/** One native asset attached to an xdocs GitHub release. */
export type XDocsReleaseAsset = {
  name: string
  downloadUrl: string
  size: number | null
}

/** One normalized xdocs GitHub release. */
export type XDocsRelease = {
  version: string
  tag: string
  channel: XDocsReleaseChannel
  prerelease: boolean
  publishedAt: string | null
  releaseUrl: string
  assets: XDocsReleaseAsset[]
  compatibleAsset: XDocsReleaseAsset | null
}

/** Complete machine-readable release-catalog response. */
export type XDocsUpgradeListEnvelope = {
  schemaVersion: 1
  command: 'xdocs upgrade list'
  currentVersion: string
  latestStableVersion: string | null
  releases: XDocsRelease[]
}

/** Immutable plan resolved before an upgrade asset body is downloaded. */
export type XDocsUpgradePlan = {
  currentVersion: string
  targetVersion: string
  platform: XDocsNativePlatform
  arch: XDocsNativeArch
  variant: XDocsNativeVariant | null
  assetName: string
  downloadUrl: string
  executablePath: string
  temporaryPath: string
  backupPath: string
  releaseUrl: string
}

/** Ordered upgrade transaction phase. */
export type XDocsUpgradePhase = 'plan' | 'download' | 'validate' | 'replace' | 'verify' | 'cache' | 'cleanup'

/** One stable upgrade transaction event. */
export type XDocsUpgradeEvent = {
  sequence: number
  phase: XDocsUpgradePhase
  status: 'started' | 'succeeded' | 'skipped' | 'failed'
  message: string
}

/** Exact recovery guidance shown after every upgrade result. */
export type XDocsUpgradeRecovery = {
  targetVersion: string
  targetSource: 'release' | 'explicit' | 'fallback-current'
  installCommand: string
  stopProcessCommand: string
}

/** Stable machine-readable upgrade error. */
export type XDocsUpgradeError = {
  code: string
  message: string
}

/** Verified mutation and cleanup details. */
export type XDocsUpgradeMutationResult = {
  verifiedVersion: string | null
  cacheUpdated: boolean
  cleanup: {
    backupPath: string | null
    scheduled: boolean
  }
}

/** Terminal self-upgrade outcome. */
export type XDocsUpgradeOutcome = 'upgraded' | 'up-to-date' | 'dry-run' | 'rolled-back' | 'failed'

/** Fixed schema version 1 self-upgrade envelope. */
export type XDocsUpgradeEnvelope = {
  schemaVersion: 1
  command: 'xdocs upgrade'
  outcome: XDocsUpgradeOutcome
  plan: XDocsUpgradePlan | null
  events: XDocsUpgradeEvent[]
  result: XDocsUpgradeMutationResult | null
  recovery: XDocsUpgradeRecovery
  error: XDocsUpgradeError | null
}

/** Public self-upgrade result alias for the fixed schema version 1 envelope. */
export type XDocsUpgradeResult = XDocsUpgradeEnvelope

/** Result of a self-uninstall operation. */
export type XDocsUninstallResult = {
  executablePath: string
  dryRun: boolean
  scheduled: boolean
}
