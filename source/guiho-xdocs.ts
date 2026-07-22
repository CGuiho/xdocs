/**
 * Public Bun-first xdocs library entrypoint.
 */

export { XDocsError, invariant } from './errors.js'

export type {
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
  XDocsUpgradeListPagination,
  XDocsUpgradeMutationResult,
  XDocsUpgradeOutcome,
  XDocsUpgradePhase,
  XDocsUpgradePlan,
  XDocsUpgradeRecovery,
} from './types.js'

export {
  CONFIG_FILENAME,
  createDefaultConfigContent,
  defaultConfig,
  discoverConfig,
  loadConfig,
  loadConfigOrDefaults,
  normalizeConfig,
  resolveConfigPath,
  writeDefaultConfig,
} from './config.js'

export { isPlainMarkdownDocument, isXDocsDescriptorFile, isXDocsFile, listDirectoryFiles, scanDirectory, scanProject } from './discovery.js'
export { extractFrontmatter, parseFrontmatterObject, parseXDocsFile, readFrontmatterFromFile, validateMetadata } from './metadata.js'
export { collectMetaErrors, scanMetadata } from './meta.js'
export { findContext } from './context.js'
export { doctorProject } from './doctor.js'
export { buildTree, renderTree, renderTreeMarkdown, validateTree } from './tree.js'
export { readPackageVersion, showHelpDocs, showHelpTree, showVersion } from './help.js'
export { getPrompt, getPromptNames, getPrompts, prompts } from './prompts.js'

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

export {
  buildUpgradeListEnvelope,
  buildUpgradeRecovery,
  classifyReleaseChannel,
  compareSemanticVersions,
  fetchReleaseCatalog,
  normalizeXDocsVersion,
  paginateReleaseCatalog,
} from './upgrade-catalog.js'

export { executeUpgradeTransaction, recoverInterruptedUpgrade, verifyExecutableVersion } from './upgrade-transaction.js'
export { assertExactReleaseAssets, xdocsAgentAssetNames, xdocsNativeTargets, xdocsReleaseAssetNames } from './release-assets.js'

export {
  applyInstructions,
  installSkills,
  legacyXdocsSkillNames,
  listEmbeddedSkills,
  removeInstructions,
  showEmbeddedSkill,
  uninstallSkills,
  updateInstructions,
  updateSkills,
  xdocsAgentTools,
  xdocsInstructionBlock,
  xdocsInstructionTemplate,
  xdocsSkillContent,
  xdocsSkillName,
  xdocsSkillVersion,
} from './agents.js'

export { runCli, runCliWithErrorHandling } from './cli.js'
