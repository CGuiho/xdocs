/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

// Errors
export { XDocsError, invariant } from './errors.js'

// Types
export type {
  XDocsAgentAutomationResult,
  XDocsAgentSettings,
  XDocsAgentTool,
  XDocsAgentsInstructionsResult,
  XDocsAiMode,
  XDocsCliOptions,
  XDocsCommand,
  XDocsConfig,
  XDocsContextEntry,
  XDocsContextEntryKind,
  XDocsContextOptions,
  XDocsContextResult,
  XDocsDoctorIssue,
  XDocsDoctorOptions,
  XDocsDoctorResult,
  XDocsDoctorSeverity,
  XDocsFile,
  XDocsFrontmatter,
  XDocsFormat,
  XDocsMetaDescriptor,
  XDocsMetaDocument,
  XDocsMetaFilters,
  XDocsMetaScanOptions,
  XDocsMetaScanResult,
  XDocsMarkdownDocument,
  XDocsMetadata,
  XDocsParsedArgs,
  XDocsPrompt,
  XDocsPromptName,
  XDocsRawConfig,
  XDocsScanResult,
  XDocsSkillInstallResult,
  XDocsSkillScope,
  XDocsTreeNode,
  XDocsTreeValidation,
  XDocsUninstallResult,
  XDocsUpdateCache,
  XDocsUpgradeResult,
} from './types.js'

// Flags
export { parseArgs, stringFlag, booleanFlag, listFlag } from './flags.js'

// Config
export {
  createDefaultConfigContent,
  DEFAULT_AGENT_SETTINGS,
  defaultConfig,
  discoverConfig,
  loadConfig,
  loadConfigOrDefaults,
  normalizeAgentSettings,
  normalizeConfig,
  resolvePath,
  writeDefaultConfig,
} from './config.js'

// Discovery
export { isPlainMarkdownDocument, isXDocsDescriptorFile, isXDocsFile, listDirectoryFiles, scanDirectory, scanProject } from './discovery.js'

// Metadata
export { extractFrontmatter, parseFrontmatterObject, parseXDocsFile, readFrontmatterFromFile, validateMetadata } from './metadata.js'

// Metadata-only scans
export { collectMetaErrors, scanMetadata } from './meta.js'

// Context lookup
export { findContext } from './context.js'

// Doctor checks
export { doctorProject } from './doctor.js'

// Tree
export { buildTree, renderTree, renderTreeMarkdown, validateTree } from './tree.js'

// Help
export { readPackageVersion, showCommandHelp, showCommandHelpDocs, showCommandHelpTree, showHelp, showHelpDocs, showHelpTree, showVersion } from './help.js'

// Prompts
export { getPrompt, getPromptNames, prompts } from './prompts.js'

// Self-management
export {
  checkForLatestVersion,
  detectNativeArch,
  detectNativePlatform,
  listAvailableVersions,
  readUpdateCache,
  resolveCachePath,
  resolveExecutablePath,
  runBackgroundUpdateCheck,
  scheduleBackgroundUpdateCheck,
  uninstallSelf,
  upgradeSelf,
} from './self-management.js'

// Agents
export {
  detectAgentTools,
  ensureAgentsInstructions,
  findAgentsFile,
  installSkill,
  installSkills,
  isSkillInstalled,
  legacyXdocsSkillNames,
  parseAgentTools,
  readSkillVersion,
  resolveAgentSettings,
  resolveInstallTools,
  resolveSkillPath,
  runAgentAutomation,
  standardAgentTool,
  xdocsAgentsSection,
  xdocsAgentTools,
  xdocsSkillContent,
  xdocsSkillName,
  xdocsSkillVersion,
} from './agents.js'

// CLI
export { runCli, runCliWithErrorHandling } from './cli.js'
