/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

// Errors
export { XDocsError, invariant } from './errors.js'

// Types
export type {
  XDocsAiMode,
  XDocsCliOptions,
  XDocsCommand,
  XDocsConfig,
  XDocsFile,
  XDocsFormat,
  XDocsMetadata,
  XDocsParsedArgs,
  XDocsPrompt,
  XDocsPromptName,
  XDocsRawConfig,
  XDocsScanResult,
  XDocsTreeNode,
  XDocsTreeValidation,
} from './types.js'

// Flags
export { parseArgs, stringFlag, booleanFlag, listFlag } from './flags.js'

// Config
export {
  createDefaultConfigContent,
  defaultConfig,
  discoverConfig,
  loadConfig,
  loadConfigOrDefaults,
  normalizeConfig,
  resolvePath,
  writeDefaultConfig,
} from './config.js'

// Discovery
export { isXDocsFile, listDirectoryFiles, scanDirectory, scanProject } from './discovery.js'

// Metadata
export { extractFrontmatter, parseXDocsFile, validateMetadata } from './metadata.js'

// Tree
export { buildTree, renderTree, renderTreeMarkdown, validateTree } from './tree.js'

// Help
export { readPackageVersion, showCommandHelp, showHelp, showVersion } from './help.js'

// Prompts
export { getPrompt, getPromptNames, prompts } from './prompts.js'

// CLI
export { runCli, runCliWithErrorHandling } from './cli.js'
