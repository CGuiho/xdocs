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
  XDocsFile,
  XDocsFormat,
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
export { extractFrontmatter, parseXDocsFile, validateMetadata } from './metadata.js'

// Tree
export { buildTree, renderTree, renderTreeMarkdown, validateTree } from './tree.js'

// Help
export { readPackageVersion, showCommandHelp, showHelp, showVersion } from './help.js'

// Prompts
export { getPrompt, getPromptNames, prompts } from './prompts.js'

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
