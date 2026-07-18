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
  XDocsPrompt,
  XDocsPromptName,
  XDocsRawConfig,
  XDocsRelease,
  XDocsReleaseAsset,
  XDocsReleaseChannel,
  XDocsScanResult,
  XDocsSkillInstallResult,
  XDocsSkillScope,
  XDocsTreeNode,
  XDocsTreeValidation,
  XDocsUninstallResult,
  XDocsUpdateCache,
  XDocsUpgradeResult,
  XDocsUpgradeError,
  XDocsUpgradeEnvelope,
  XDocsUpgradeEvent,
  XDocsUpgradeListEnvelope,
  XDocsUpgradeMutationResult,
  XDocsUpgradeOutcome,
  XDocsUpgradePhase,
  XDocsUpgradePlan,
  XDocsUpgradeRecovery,
} from './types.js'

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

// Upgrade release catalog and recovery
export {
  buildUpgradeListEnvelope,
  buildUpgradeRecovery,
  classifyReleaseChannel,
  compareSemanticVersions,
  fetchReleaseCatalog,
  normalizeXDocsVersion,
} from './upgrade-catalog.js'

// Verified upgrade transaction
export {
  executeUpgradeTransaction,
  recoverInterruptedUpgrade,
  verifyExecutableVersion,
} from './upgrade-transaction.js'

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
