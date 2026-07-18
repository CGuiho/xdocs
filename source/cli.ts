/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { resolve } from 'node:path'
import { defineCommand, parseArgs as parseCittyArgs, renderUsage, runCommand } from 'citty'

import type { ArgDef, ArgsDef, CommandDef } from 'citty'
import type { XDocsCliOptions, XDocsFormat, XDocsSkillScope } from './types.js'

import { XDocsError } from './errors.js'
import { readPackageVersion, showCommandHelpDocs, showCommandHelpTree, showHelpDocs, showHelpTree, showVersion } from './help.js'
import { runAgentAutomation } from './agents.js'
import { readUpdateCache, runBackgroundUpdateCheck, scheduleBackgroundUpdateCheck } from './self-management.js'
import { compareSemanticVersions } from './upgrade-catalog.js'
import { runInit } from './commands/init.js'
import { runScan } from './commands/scan.js'
import { runGenerate } from './commands/generate.js'
import { runPrompt } from './commands/prompt.js'
import { runMerge } from './commands/merge.js'
import { runTree } from './commands/tree.js'
import { runList } from './commands/list.js'
import { runMeta } from './commands/meta.js'
import { runContext } from './commands/context.js'
import { runDoctor } from './commands/doctor.js'
import { runAgentsInstall, runAgentsInstructions } from './commands/agents.js'
import { runUpgrade, runUpgradeCheck, runUpgradeList } from './commands/upgrade.js'
import { runUninstall } from './commands/uninstall.js'

export {
  createXDocsCommand,
  runCli,
  runCliWithErrorHandling,
}

const formatOptions = ['text', 'json', 'markdown']
const toolOptions = ['agents', 'claude', 'all']
const promptOptions = ['write', 'update', 'agents', 'generate']
const archOptions = ['x64', 'arm64']
const variantOptions = ['baseline', 'default', 'modern']

const commonArgs = {
  help: { type: 'boolean', alias: 'h', description: 'Show command usage.' },
  version: { type: 'boolean', alias: 'v', description: 'Show the xdocs version.' },
  'help-tree': { type: 'boolean', description: 'Show the extended command tree.' },
  'help-docs': { type: 'boolean', description: 'Show extended Markdown command documentation.' },
  cwd: { type: 'string', valueHint: 'path', description: 'Run as if started in this directory.' },
  config: { type: 'string', valueHint: 'path', description: 'Path to xdocs.config.toml.' },
  format: { type: 'enum', options: formatOptions, description: 'Output format.' },
  verbose: { type: 'boolean', description: 'Show detailed output.' },
} satisfies ArgsDef

const usageDiscoveryArgs = {
  ...commonArgs,
  format: { type: 'string', valueHint: 'format', description: 'Output format.' },
} satisfies ArgsDef

const initArgs = {
  ...commonArgs,
  tool: { type: 'enum', options: toolOptions, description: 'Agent skill target.' },
  global: { type: 'boolean', description: 'Install the agent skill globally.' },
} satisfies ArgsDef

const scanArgs = { ...commonArgs } satisfies ArgsDef

const generateArgs = {
  ...commonArgs,
  path: { type: 'positional', required: false, description: 'Directory to document.' },
  output: { type: 'string', valueHint: 'path', description: 'Write output to a file.' },
} satisfies ArgsDef

const promptArgs = {
  ...commonArgs,
  name: { type: 'enum', options: promptOptions, required: true, description: 'Prompt name.' },
} satisfies ArgsDef

const mergeArgs = {
  ...commonArgs,
  path: { type: 'positional', required: false, description: 'Directory to merge.' },
  output: { type: 'string', valueHint: 'path', description: 'Write output to a file.' },
} satisfies ArgsDef

const treeArgs = {
  ...commonArgs,
  output: { type: 'string', valueHint: 'path', description: 'Write output to a file.' },
} satisfies ArgsDef

const listArgs = {
  ...commonArgs,
  path: { type: 'positional', required: false, description: 'Directory to list.' },
} satisfies ArgsDef

const metaArgs = {
  ...commonArgs,
  path: { type: 'positional', required: false, description: 'Directory to scan.' },
  documents: { type: 'boolean', description: 'Include companion document frontmatter.' },
  strict: { type: 'boolean', description: 'Fail when metadata is invalid.' },
  owner: { type: 'string', valueHint: 'subject', description: 'Filter by descriptor subject or document owner.' },
  tag: { type: 'string', valueHint: 'tag', description: 'Filter by tag.' },
  keyword: { type: 'string', valueHint: 'keyword', description: 'Filter by keyword.' },
} satisfies ArgsDef

const contextArgs = {
  ...commonArgs,
  query: { type: 'positional', description: 'Task or topic to find context for.' },
  path: { type: 'positional', required: false, description: 'Directory to search.' },
  documents: { type: 'boolean', description: 'Include companion documents.' },
  files: { type: 'boolean', description: 'Include documented implementation files.' },
  limit: { type: 'string', valueHint: 'count', description: 'Maximum number of entries.' },
  owner: { type: 'string', valueHint: 'subject', description: 'Filter by descriptor subject or document owner.' },
  tag: { type: 'string', valueHint: 'tag', description: 'Filter by tag.' },
  keyword: { type: 'string', valueHint: 'keyword', description: 'Filter by keyword.' },
  explain: { type: 'boolean', description: 'Include match reasons.' },
} satisfies ArgsDef

const doctorArgs = {
  ...commonArgs,
  path: { type: 'positional', required: false, description: 'Directory to validate.' },
  'no-documents': { type: 'boolean', description: 'Skip companion-document validation.' },
  'warnings-as-errors': { type: 'boolean', description: 'Treat warnings as errors.' },
} satisfies ArgsDef

const agentsGroupArgs = { ...commonArgs } satisfies ArgsDef

const agentsInstallArgs = {
  ...commonArgs,
  scope: { type: 'positional', description: 'Install scope: local or global.' },
  tool: { type: 'enum', options: toolOptions, description: 'Agent skill target.' },
} satisfies ArgsDef

const agentsInstructionsArgs = { ...commonArgs } satisfies ArgsDef

const upgradeArgs = {
  ...commonArgs,
  version: { type: 'string', alias: 'v', valueHint: 'version', description: 'Install a specific version.' },
  arch: { type: 'enum', options: archOptions, description: 'Override the detected architecture.' },
  variant: { type: 'enum', options: variantOptions, description: 'Override the x64 binary variant.' },
  'dry-run': { type: 'boolean', description: 'Preview without replacing the binary.' },
} satisfies ArgsDef

const upgradeInfoArgs = { ...commonArgs } satisfies ArgsDef

const uninstallArgs = {
  ...commonArgs,
  'dry-run': { type: 'boolean', description: 'Preview without removing the binary.' },
} satisfies ArgsDef

const homeArgs = { ...commonArgs } satisfies ArgsDef
const workerArgs = { ...commonArgs } satisfies ArgsDef

type AnyParsedArgs = {
  _: string[]
} & Record<string, string | number | boolean | string[] | undefined>
type AnyCommand = CommandDef<any>
type UsageTarget = {
  command: AnyCommand
  path: string[]
}

class XDocsUsageError extends XDocsError {}

/** Build one declarative Citty command tree for an invocation. */
function createXDocsCommand(rootArgs: AnyParsedArgs = parseCittyArgs([], commonArgs)): AnyCommand {
  let rootCommand: AnyCommand

  const withOptions = (args: AnyParsedArgs): XDocsCliOptions => resolveOptions(rootArgs, args)
  const withAutomation = async (args: AnyParsedArgs, action: (options: XDocsCliOptions) => Promise<void>): Promise<void> => {
    const options = withOptions(args)
    await runAgentAutomation(options, (message) => process.stderr.write(message + '\n'))
    await action(options)
  }

  const homeCommand = defineCommand({
    meta: { name: 'home', hidden: true },
    args: homeArgs,
    run: async ({ args }) => {
      assertValidArgs(args, homeArgs)
      const options = withOptions(args)
      await runAgentAutomation(options, (message) => process.stderr.write(message + '\n'))
      await printCachedUpdateNotice()
      void scheduleBackgroundUpdateCheck()
      process.stdout.write(await renderUsage(rootCommand) + '\n')
    },
  })

  const initCommand = defineCommand({
    meta: { name: 'init', description: 'Initialize xdocs in a project.' },
    args: initArgs,
    run: async ({ args }) => {
      assertValidArgs(args, initArgs)
      await runInit(withOptions(args), { global: Boolean(args.global), tool: optionalString(args.tool) })
    },
  })

  const scanCommand = defineCommand({
    meta: { name: 'scan', description: 'Scan descriptor and companion-document coverage.' },
    args: scanArgs,
    run: async ({ args }) => {
      assertValidArgs(args, scanArgs)
      await withAutomation(args, runScan)
    },
  })

  const generateCommand = defineCommand({
    meta: { name: 'generate', description: 'Generate documentation for a directory or project.' },
    args: generateArgs,
    run: async ({ args }) => {
      assertValidArgs(args, generateArgs)
      await withAutomation(args, (options) => runGenerate(options, {
        targetPath: optionalString(args.path),
        outputPath: optionalString(args.output),
      }))
    },
  })

  const promptCommand = defineCommand({
    meta: { name: 'prompt', description: 'Output a ready-made prompt for AI.' },
    args: promptArgs,
    run: async ({ args }) => {
      assertValidArgs(args, promptArgs)
      await runPrompt(withOptions(args), { name: requiredString(args.name, '--name') })
    },
  })

  const mergeCommand = defineCommand({
    meta: { name: 'merge', description: 'Merge descriptors into one document.' },
    args: mergeArgs,
    run: async ({ args }) => {
      assertValidArgs(args, mergeArgs)
      await withAutomation(args, (options) => runMerge(options, {
        targetPath: optionalString(args.path),
        outputPath: optionalString(args.output),
      }))
    },
  })

  const treeCommand = defineCommand({
    meta: { name: 'tree', description: 'Display the project hierarchy.' },
    args: treeArgs,
    run: async ({ args }) => {
      assertValidArgs(args, treeArgs)
      await withAutomation(args, (options) => runTree(options, { outputPath: optionalString(args.output) }))
    },
  })

  const listCommand = defineCommand({
    meta: { name: 'list', description: 'List documented files and documents.' },
    args: listArgs,
    run: async ({ args }) => {
      assertValidArgs(args, listArgs)
      await withAutomation(args, (options) => runList(options, { targetPath: optionalString(args.path) }))
    },
  })

  const metaCommand = defineCommand({
    meta: { name: 'meta', description: 'Read descriptor and companion-document frontmatter.' },
    args: metaArgs,
    run: async ({ args }) => {
      assertValidArgs(args, metaArgs)
      await withAutomation(args, (options) => runMeta(options, {
        targetPath: optionalString(args.path),
        includeDocuments: Boolean(args.documents),
        strict: Boolean(args.strict),
        owner: optionalString(args.owner),
        tag: optionalString(args.tag),
        keyword: optionalString(args.keyword),
      }))
    },
  })

  const contextCommand = defineCommand({
    meta: { name: 'context', description: 'Recommend a minimal reading set for a task.' },
    args: contextArgs,
    run: async ({ args }) => {
      assertValidArgs(args, contextArgs)
      const input = {
        query: requiredString(args.query, 'query'),
        targetPath: optionalString(args.path),
        includeDocuments: Boolean(args.documents),
        includeFiles: Boolean(args.files),
        limit: parsePositiveInteger(optionalString(args.limit), 'limit'),
        owner: optionalString(args.owner),
        tag: optionalString(args.tag),
        keyword: optionalString(args.keyword),
        explain: Boolean(args.explain),
      }
      await withAutomation(args, (options) => runContext(options, input))
    },
  })

  const doctorCommand = defineCommand({
    meta: { name: 'doctor', description: 'Run strict xdocs health checks.' },
    args: doctorArgs,
    run: async ({ args }) => {
      assertValidArgs(args, doctorArgs)
      await withAutomation(args, (options) => runDoctor(options, {
        targetPath: optionalString(args.path),
        includeDocuments: !Boolean(args['noDocuments']),
        warningsAsErrors: Boolean(args['warningsAsErrors']),
      }))
    },
  })

  const agentsInstallCommand = defineCommand({
    meta: { name: 'install', description: 'Install or refresh the bundled agent skill.' },
    args: agentsInstallArgs,
    run: async ({ args }) => {
      assertValidArgs(args, agentsInstallArgs)
      await runAgentsInstall(withOptions(args), {
        scope: parseScope(requiredString(args.scope, 'scope')),
        tool: optionalString(args.tool),
      })
    },
  })

  const agentsInstructionsCommand = defineCommand({
    meta: { name: 'instructions', description: 'Insert or refresh AGENTS.md xdocs instructions.' },
    args: agentsInstructionsArgs,
    run: async ({ args }) => {
      assertValidArgs(args, agentsInstructionsArgs)
      await runAgentsInstructions(withOptions(args))
    },
  })

  const agentsCommand = defineCommand({
    meta: { name: 'agents', description: 'Manage the xdocs agent skill and AGENTS.md instructions.' },
    args: agentsGroupArgs,
    subCommands: {
      install: agentsInstallCommand,
      instructions: agentsInstructionsCommand,
    },
  })

  const upgradeApplyCommand = defineCommand({
    meta: { name: 'apply', hidden: true },
    args: upgradeArgs,
    run: async ({ args }) => {
      assertValidArgs(args, upgradeArgs)
      await runUpgrade(withOptions(args), {
        version: optionalString(args.version),
        arch: optionalString(args.arch),
        variant: optionalString(args.variant),
        dryRun: Boolean(args['dryRun']),
      })
    },
  })

  const upgradeCheckCommand = defineCommand({
    meta: { name: 'check', description: 'Check whether a newer native release exists.' },
    args: upgradeInfoArgs,
    run: async ({ args }) => {
      assertValidArgs(args, upgradeInfoArgs)
      await runUpgradeCheck(withOptions(args))
    },
  })

  const upgradeListCommand = defineCommand({
    meta: { name: 'list', description: 'List available native release versions.' },
    args: upgradeInfoArgs,
    run: async ({ args }) => {
      assertValidArgs(args, upgradeInfoArgs)
      await runUpgradeList(withOptions(args))
    },
  })

  const upgradeCommand = defineCommand({
    meta: { name: 'upgrade', description: 'Upgrade the installed xdocs native binary.' },
    args: upgradeArgs,
    default: 'apply',
    subCommands: {
      apply: upgradeApplyCommand,
      check: upgradeCheckCommand,
      list: upgradeListCommand,
    },
  })

  const uninstallCommand = defineCommand({
    meta: { name: 'uninstall', description: 'Remove the installed xdocs native binary.' },
    args: uninstallArgs,
    run: async ({ args }) => {
      assertValidArgs(args, uninstallArgs)
      await runUninstall(withOptions(args), { dryRun: Boolean(args['dryRun']) })
    },
  })

  const workerCommand = defineCommand({
    meta: { name: 'xdocs-update-check-worker', hidden: true },
    args: workerArgs,
    run: async ({ args }) => {
      assertValidArgs(args, workerArgs)
      await runBackgroundUpdateCheck()
    },
  })

  rootCommand = defineCommand({
    meta: {
      name: 'xdocs',
      version: readPackageVersion(),
      description: 'Structured documentation for codebases and AI agents.',
    },
    args: commonArgs,
    default: 'home',
    subCommands: {
      home: homeCommand,
      init: initCommand,
      scan: scanCommand,
      generate: generateCommand,
      prompt: promptCommand,
      merge: mergeCommand,
      tree: treeCommand,
      list: listCommand,
      meta: metaCommand,
      context: contextCommand,
      doctor: doctorCommand,
      agents: agentsCommand,
      upgrade: upgradeCommand,
      uninstall: uninstallCommand,
      'xdocs-update-check-worker': workerCommand,
    },
  })

  return rootCommand
}

/** Main CLI entry point. Citty owns all parsing and command routing. */
async function runCli(rawArgs: string[] = process.argv.slice(2)): Promise<void> {
  let rootArgs: AnyParsedArgs
  try {
    rootArgs = parseCittyArgs(rawArgs, commonArgs)
  } catch (error) {
    if (!isUsageError(error)) throw error
    const discoveryArgs = parseCittyArgs(rawArgs, usageDiscoveryArgs)
    const discoveryCommand = createXDocsCommand(discoveryArgs)
    const message = error instanceof Error ? error.message : 'Invalid command input.'
    const usage = await renderTargetUsage(discoveryCommand, discoveryArgs._)
    throw new XDocsError(`${message}\n\n${usage}`)
  }

  const command = createXDocsCommand(rootArgs)
  const commandName = rootArgs._[0]

  try {
    assertGlobalPrefixArgs(rawArgs, rootArgs)
  } catch (error) {
    if (!isUsageError(error)) throw error
    const message = error instanceof Error ? error.message : 'Invalid command input.'
    const usage = await renderTargetUsage(command, rootArgs._)
    throw new XDocsError(`${message}\n\n${usage}`)
  }

  if (Boolean(rootArgs['version']) && commandName !== 'upgrade') {
    process.stdout.write(showVersion() + '\n')
    return
  }

  if (Boolean(rootArgs['helpTree'])) {
    process.stdout.write((commandName ? showCommandHelpTree(commandName) : showHelpTree()) + '\n')
    return
  }

  if (Boolean(rootArgs['helpDocs'])) {
    process.stdout.write(commandName ? showCommandHelpDocs(commandName) : showHelpDocs())
    return
  }

  if (Boolean(rootArgs['help'])) {
    process.stdout.write(await renderTargetUsage(command, rootArgs._) + '\n')
    return
  }

  try {
    await runCommand(command, { rawArgs })
  } catch (error) {
    if (error instanceof XDocsError && !(error instanceof XDocsUsageError)) throw error
    if (!isUsageError(error)) throw error

    const message = error instanceof Error ? error.message : 'Invalid command input.'
    const usage = await renderTargetUsage(command, rootArgs._)
    throw new XDocsError(`${message}\n\n${usage}`)
  }
}

/** Run the CLI with process-level error handling for executable entrypoints. */
async function runCliWithErrorHandling(rawArgs?: string[]): Promise<void> {
  try {
    await runCli(rawArgs)
  } catch (error) {
    if (error instanceof XDocsError) {
      process.stderr.write(`error: ${error.message}\n`)
      process.exit(error.exitCode)
    }

    if (error instanceof Error) {
      process.stderr.write(`error: ${error.message}\n`)
    } else {
      process.stderr.write('error: An unexpected error occurred.\n')
    }

    process.exit(1)
  }
}

function resolveOptions(rootArgs: AnyParsedArgs, commandArgs: AnyParsedArgs): XDocsCliOptions {
  const cwd = optionalString(commandArgs['cwd']) ?? optionalString(rootArgs['cwd']) ?? process.cwd()
  const config = optionalString(commandArgs['config']) ?? optionalString(rootArgs['config'])
  const format = optionalString(commandArgs['format']) ?? optionalString(rootArgs['format']) ?? 'text'

  return {
    cwd: resolve(cwd),
    config,
    format: format as XDocsFormat,
    verbose: Boolean(commandArgs['verbose'] ?? rootArgs['verbose']),
  }
}

function assertValidArgs(args: AnyParsedArgs, definitions: ArgsDef): void {
  const allowed = new Set(['_'])
  let positionalCount = 0

  for (const [name, definition] of Object.entries(definitions)) {
    allowed.add(name)
    allowed.add(toCamelCase(name))
    for (const alias of aliases(definition)) allowed.add(alias)
    if (definition.type === 'positional') positionalCount += 1
  }

  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) throw new XDocsUsageError(`Unknown option: --${key}`)
  }

  if (args._.length > positionalCount) {
    throw new XDocsUsageError(`Unexpected argument: ${args._[positionalCount]}`)
  }
}

function assertGlobalPrefixArgs(rawArgs: string[], rootArgs: AnyParsedArgs): void {
  const commandName = rootArgs._[0]
  if (!commandName) {
    assertValidArgs(rootArgs, commonArgs)
    return
  }

  for (let length = 1; length <= rawArgs.length; length += 1) {
    const prefix = rawArgs.slice(0, length)
    const parsed = parseCittyArgs(prefix, commonArgs)
    if (parsed._[0] !== commandName) continue
    const globalPrefix = parseCittyArgs(rawArgs.slice(0, length - 1), commonArgs)
    assertValidArgs(globalPrefix, commonArgs)
    return
  }
}

function aliases(definition: ArgDef): string[] {
  if (!('alias' in definition) || !definition.alias) return []
  return Array.isArray(definition.alias) ? definition.alias : [definition.alias]
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function requiredString(value: unknown, name: string): string {
  const parsed = optionalString(value)
  if (!parsed) throw new XDocsUsageError(`Missing required argument: ${name}`)
  return parsed
}

function parsePositiveInteger(value: string | undefined, name: string): number | undefined {
  if (!value) return undefined
  if (!/^\d+$/.test(value)) throw new XDocsUsageError(`Invalid --${name} value: "${value}". Expected a positive integer.`)
  const parsed = Number.parseInt(value, 10)
  if (parsed <= 0) throw new XDocsUsageError(`Invalid --${name} value: "${value}". Expected a positive integer.`)
  return parsed
}

function parseScope(value: string): XDocsSkillScope {
  if (value === 'local' || value === 'global') return value
  throw new XDocsUsageError(`Invalid install scope: "${value}". Expected local or global.`)
}

function isUsageError(error: unknown): boolean {
  return error instanceof XDocsUsageError || (error instanceof Error && error.name === 'CLIError')
}

async function renderTargetUsage(root: AnyCommand, path: string[]): Promise<string> {
  const target = resolveUsageTarget(root, path)
  if (target.path.length === 0) return renderUsage(target.command)

  const parentName = ['xdocs', ...target.path.slice(0, -1)].join(' ')
  const parent = defineCommand({ meta: { name: parentName, version: readPackageVersion() } })
  return renderUsage(target.command, parent)
}

function resolveUsageTarget(root: AnyCommand, path: string[]): UsageTarget {
  let command = root
  const resolvedPath: string[] = []

  for (const segment of path) {
    const subCommands = staticSubCommands(command)
    const subCommand = subCommands?.[segment]
    if (!subCommand || typeof subCommand === 'function' || subCommand instanceof Promise) break
    command = subCommand
    resolvedPath.push(segment)
  }

  return { command, path: resolvedPath }
}

function staticSubCommands(command: AnyCommand): Record<string, AnyCommand> | undefined {
  const subCommands = command.subCommands
  if (!subCommands || typeof subCommands === 'function' || subCommands instanceof Promise) return undefined
  return subCommands as Record<string, AnyCommand>
}

async function printCachedUpdateNotice(): Promise<void> {
  const cache = await readUpdateCache()
  if (!cache?.updateAvailable) return
  if (compareSemanticVersions(cache.latestVersion, readPackageVersion()) <= 0) return

  process.stderr.write(`notice: xdocs ${cache.latestVersion} is available. Run \`xdocs upgrade\` to update.\n`)
}
