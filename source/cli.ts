/**
 * The single raw Citty command tree for xdocs.
 */

import { defineCommand, renderUsage, runCommand } from 'citty'
import type { ArgsDef, CommandDef } from 'citty'
import { Value } from '@sinclair/typebox/value'
import type { XDocsCliOptions, XDocsFormat, XDocsSkillScope } from './types.js'
import { XDocsError } from './errors.js'
import { PositiveIntegerSchema } from './schemas.js'
import { readPackageVersion, showHelpDocs, showHelpTree, showVersion } from './help.js'
import { readUpdateCache, runBackgroundUpdateCheck, scheduleBackgroundUpdateCheck } from './self-management.js'
import { resolvePath } from './runtime/path.js'
import { discoverConfig } from './config.js'
import { runInit } from './commands/init.js'
import { runScan } from './commands/scan.js'
import { runGenerate } from './commands/generate.js'
import { runMerge } from './commands/merge.js'
import { runTree } from './commands/tree.js'
import { runList } from './commands/list.js'
import { runMeta } from './commands/meta.js'
import { runContext } from './commands/context.js'
import { runDoctor } from './commands/doctor.js'
import {
  runAgentInstructionMutation,
  runAgentInstructionShow,
  runAgentPromptList,
  runAgentPromptShow,
  runAgentSkillList,
  runAgentSkillMutation,
  runAgentSkillShow,
} from './commands/agent.js'
import { runUpgrade, runUpgradeCheck, runUpgradeList } from './commands/upgrade.js'
import { runUninstall } from './commands/uninstall.js'

export { createXDocsCommand, runCli, runCliWithErrorHandling }

type ParsedArgs = { _: string[] } & Record<string, unknown>
type AnyCommand = CommandDef<any>

const formatOptions = ['text', 'json', 'markdown']
const archOptions = ['x64', 'arm64']
const variantOptions = ['baseline', 'default', 'modern']

const developerArgs = {
  help: { type: 'boolean', alias: 'h', description: 'Show command usage.' },
  'help-tree': { type: 'boolean', description: 'Show the command subtree.' },
  'help-tree-depth': { type: 'string', valueHint: 'depth', description: 'Limit command-tree recursion to a positive depth.' },
  'help-docs': { type: 'boolean', description: 'Show Markdown documentation for this command scope.' },
} satisfies ArgsDef

const executionArgs = {
  ...developerArgs,
  cwd: { type: 'string', valueHint: 'path', description: 'Run as if started in this directory.' },
  config: { type: 'string', valueHint: 'path', description: 'Path to xdocs.yaml.' },
  format: { type: 'enum', options: formatOptions, description: 'Output format.' },
  verbose: { type: 'boolean', description: 'Show detailed diagnostics.' },
} satisfies ArgsDef

const rootArgs = {
  ...executionArgs,
  version: { type: 'boolean', alias: 'v', description: 'Show the xdocs version.' },
} satisfies ArgsDef

function createXDocsCommand(): AnyCommand {
  let root: AnyCommand
  const options = (args: ParsedArgs): XDocsCliOptions => ({
    cwd: resolvePath(optionalString(args['cwd']) ?? process.cwd()),
    config: optionalString(args['config']),
    format: (optionalString(args['format']) ?? 'text') as XDocsFormat,
    verbose: Boolean(args['verbose']),
  })

  const leaf = (
    name: string,
    description: string,
    args: ArgsDef,
    path: string,
    action: (args: ParsedArgs) => Promise<void> | void,
    configAware = false,
    startupLifecycle = true,
  ): AnyCommand => {
    let command: AnyCommand
    command = defineCommand({
      meta: { name, description },
      args,
      run: async ({ args: parsed, rawArgs }) => {
        if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
          process.stdout.write(await renderScopedUsage(command, path) + '\n')
          return
        }
        if (handleDeveloperHelp(parsed, command, path)) return
        const resolvedOptions = options(parsed)
        if (startupLifecycle) await reportCachedUpdateNotice(resolvedOptions.format)
        if (configAware) await reportLoadedConfiguration(resolvedOptions)
        if (startupLifecycle) void scheduleBackgroundUpdateCheck()
        await action(parsed)
      },
    })
    return command
  }

  const init = leaf('init', 'Initialize xdocs in a project.', executionArgs, 'xdocs init', (args) => runInit(options(args), {}))
  const scan = leaf('scan', 'Scan descriptor and companion-document coverage.', executionArgs, 'xdocs scan', (args) => runScan(options(args)), true)
  const generate = leaf('generate', 'Generate documentation for a directory or project.', {
    ...executionArgs,
    path: { type: 'positional', required: false, description: 'Directory to document.' },
    output: { type: 'string', valueHint: 'path', description: 'Write output to a file.' },
  }, 'xdocs generate', (args) => runGenerate(options(args), {
    targetPath: optionalString(args['path']),
    outputPath: optionalString(args['output']),
  }), true)
  const merge = leaf('merge', 'Merge descriptors into one document.', {
    ...executionArgs,
    path: { type: 'positional', required: false, description: 'Directory to merge.' },
    output: { type: 'string', valueHint: 'path', description: 'Write output to a file.' },
  }, 'xdocs merge', (args) => runMerge(options(args), {
    targetPath: optionalString(args['path']),
    outputPath: optionalString(args['output']),
  }), true)
  const tree = leaf('tree', 'Display the project hierarchy.', {
    ...executionArgs,
    output: { type: 'string', valueHint: 'path', description: 'Write output to a file.' },
  }, 'xdocs tree', (args) => runTree(options(args), { outputPath: optionalString(args['output']) }), true)
  const list = leaf('list', 'List documented files and documents.', {
    ...executionArgs,
    path: { type: 'positional', required: false, description: 'Directory to list.' },
  }, 'xdocs list', (args) => runList(options(args), { targetPath: optionalString(args['path']) }), true)
  const meta = leaf('meta', 'Read descriptor and companion-document frontmatter.', {
    ...executionArgs,
    path: { type: 'positional', required: false, description: 'Directory to scan.' },
    documents: { type: 'boolean', description: 'Include companion document frontmatter.' },
    strict: { type: 'boolean', description: 'Fail when metadata is invalid.' },
    owner: { type: 'string', valueHint: 'subject', description: 'Filter by descriptor subject or document owner.' },
    tag: { type: 'string', valueHint: 'tag', description: 'Filter by tag.' },
    keyword: { type: 'string', valueHint: 'keyword', description: 'Filter by keyword.' },
  }, 'xdocs meta', (args) => runMeta(options(args), {
    targetPath: optionalString(args['path']),
    includeDocuments: Boolean(args['documents']),
    strict: Boolean(args['strict']),
    owner: optionalString(args['owner']),
    tag: optionalString(args['tag']),
    keyword: optionalString(args['keyword']),
  }), true)
  const context = leaf('context', 'Recommend a minimal reading set for a task.', {
    ...executionArgs,
    query: { type: 'positional', required: false, description: 'Task or topic to find context for.' },
    path: { type: 'positional', required: false, description: 'Directory to search.' },
    documents: { type: 'boolean', description: 'Include companion documents.' },
    files: { type: 'boolean', description: 'Include documented implementation files.' },
    limit: { type: 'string', valueHint: 'count', description: 'Maximum number of entries.' },
    owner: { type: 'string', valueHint: 'subject', description: 'Filter by owner.' },
    tag: { type: 'string', valueHint: 'tag', description: 'Filter by tag.' },
    keyword: { type: 'string', valueHint: 'keyword', description: 'Filter by keyword.' },
    explain: { type: 'boolean', description: 'Include match reasons.' },
  }, 'xdocs context', (args) => runContext(options(args), {
    query: requiredString(args['query'], 'query'),
    targetPath: optionalString(args['path']),
    includeDocuments: Boolean(args['documents']),
    includeFiles: Boolean(args['files']),
    limit: parsePositiveInteger(optionalString(args['limit']), 'limit'),
    owner: optionalString(args['owner']),
    tag: optionalString(args['tag']),
    keyword: optionalString(args['keyword']),
    explain: Boolean(args['explain']),
  }), true)
  const doctor = leaf('doctor', 'Run strict xdocs health checks.', {
    ...executionArgs,
    path: { type: 'positional', required: false, description: 'Directory to validate.' },
    'no-documents': { type: 'boolean', description: 'Skip companion-document validation.' },
    'warnings-as-errors': { type: 'boolean', description: 'Treat warnings as errors.' },
  }, 'xdocs doctor', (args) => runDoctor(options(args), {
    targetPath: optionalString(args['path']),
    includeDocuments: !Boolean(args['noDocuments']),
    warningsAsErrors: Boolean(args['warningsAsErrors']),
  }), true)

  const scopeArgs = { ...executionArgs, local: { type: 'boolean', description: 'Use project-local scope instead of global scope.' } } satisfies ArgsDef
  const skillInstall = leaf('install', 'Install the bundled skill in both tool locations.', scopeArgs, 'xdocs agent skill install', (args) =>
    runAgentSkillMutation(options(args), 'install', scope(args)))
  const skillUninstall = leaf('uninstall', 'Uninstall the skill from both tool locations.', scopeArgs, 'xdocs agent skill uninstall', (args) =>
    runAgentSkillMutation(options(args), 'uninstall', scope(args)))
  const skillUpdate = leaf('update', 'Refresh the skill in both tool locations.', scopeArgs, 'xdocs agent skill update', (args) =>
    runAgentSkillMutation(options(args), 'update', scope(args)))
  const skillList = leaf('list', 'List embedded agent skills.', {
    ...executionArgs,
    filter: { type: 'string', valueHint: 'keyword', description: 'Filter skill metadata.' },
  }, 'xdocs agent skill list', (args) => runAgentSkillList(options(args), optionalString(args['filter'])))
  const skillShow = leaf('show', 'Show embedded skill metadata.', {
    ...executionArgs,
    id: { type: 'positional', required: false, description: 'Skill id.' },
  }, 'xdocs agent skill show', (args) => runAgentSkillShow(options(args), requiredString(args['id'], 'id')))
  const skill = group('skill', 'Manage the embedded xdocs skill.', executionArgs, 'xdocs agent skill', {
    install: skillInstall,
    uninstall: skillUninstall,
    update: skillUpdate,
    list: skillList,
    show: skillShow,
  })

  const instructionApply = leaf('apply', 'Apply canonical instructions idempotently.', executionArgs, 'xdocs agent instruction apply', (args) =>
    runAgentInstructionMutation(options(args), 'apply'))
  const instructionRemove = leaf('remove', 'Remove managed xdocs instructions.', executionArgs, 'xdocs agent instruction remove', (args) =>
    runAgentInstructionMutation(options(args), 'remove'))
  const instructionUpdate = leaf('update', 'Refresh stale managed instructions.', executionArgs, 'xdocs agent instruction update', (args) =>
    runAgentInstructionMutation(options(args), 'update'))
  const instructionShow = leaf('show', 'Show the raw canonical instruction template.', executionArgs, 'xdocs agent instruction show', () =>
    runAgentInstructionShow())
  const instruction = group('instruction', 'Manage AGENTS.md and CLAUDE.md instructions.', executionArgs, 'xdocs agent instruction', {
    apply: instructionApply,
    remove: instructionRemove,
    update: instructionUpdate,
    show: instructionShow,
  })

  const promptList = leaf('list', 'List embedded prompts.', {
    ...executionArgs,
    names: { type: 'boolean', description: 'Print prompt names only.' },
  }, 'xdocs agent prompt list', (args) => runAgentPromptList(options(args), Boolean(args['names'])))
  const promptShow = leaf('show', 'Print a raw embedded prompt body.', {
    ...executionArgs,
    id: { type: 'positional', required: false, description: 'Prompt id.' },
  }, 'xdocs agent prompt show', (args) => runAgentPromptShow(requiredString(args['id'], 'id')))
  const prompt = group('prompt', 'Discover and print embedded prompts.', executionArgs, 'xdocs agent prompt', {
    list: promptList,
    show: promptShow,
  })
  const agent = group('agent', 'Manage xdocs agent resources.', executionArgs, 'xdocs agent', { skill, instruction, prompt })

  const upgradeArgs = {
    ...executionArgs,
    version: { type: 'string', valueHint: 'version', description: 'Install a specific version.' },
    arch: { type: 'enum', options: archOptions, description: 'Override architecture.' },
    variant: { type: 'enum', options: variantOptions, description: 'Override x64 variant.' },
    'dry-run': { type: 'boolean', description: 'Preview without replacing the binary.' },
  } satisfies ArgsDef
  const upgradeApply = leaf('apply', 'Apply an xdocs native upgrade.', upgradeArgs, 'xdocs upgrade', (args) => runUpgrade(options(args), {
    version: optionalString(args['version']),
    arch: optionalString(args['arch']),
    variant: optionalString(args['variant']),
    dryRun: Boolean(args['dryRun']),
  }))
  const upgradeCheck = leaf('check', 'Check whether a newer release exists.', executionArgs, 'xdocs upgrade check', (args) =>
    runUpgradeCheck(options(args)))
  const upgradeList = leaf('list', 'List available releases.', {
    ...executionArgs,
    page: { type: 'string', valueHint: 'number', description: 'Release page.' },
    'per-page': { type: 'string', valueHint: 'number', description: 'Releases per page.' },
    'pre-releases': { type: 'boolean', description: 'Include prereleases.' },
  }, 'xdocs upgrade list', (args) => runUpgradeList(options(args), {
    page: parsePositiveInteger(optionalString(args['page']), 'page') ?? 1,
    perPage: parsePositiveInteger(optionalString(args['perPage']), 'per-page') ?? 30,
    preReleases: Boolean(args['preReleases']),
  }))
  const upgrade = group('upgrade', 'Upgrade the installed xdocs binary.', upgradeArgs, 'xdocs upgrade', {
    check: upgradeCheck,
    list: upgradeList,
  }, upgradeApply)
  const uninstall = leaf('uninstall', 'Remove the installed native xdocs binary.', {
    ...executionArgs,
    'dry-run': { type: 'boolean', description: 'Preview without removing the binary.' },
  }, 'xdocs uninstall', (args) => runUninstall(options(args), { dryRun: Boolean(args['dryRun']) }))
  const worker = leaf('--check-updates-worker', 'Internal detached update worker.', executionArgs, 'xdocs --check-updates-worker', () =>
    runBackgroundUpdateCheck(), false, false)

  const home = leaf('home', 'Show the xdocs startup banner.', rootArgs, 'xdocs', async (args) => {
    if (Boolean(args['version'])) {
      process.stdout.write(showVersion() + '\n')
      return
    }
    await reportCachedUpdateNotice(options(args).format)
    void scheduleBackgroundUpdateCheck()
    process.stdout.write(`Hello Windows - xdocs v${readPackageVersion()}\n`)
  }, false, false)

  root = defineCommand({
    meta: { name: 'xdocs', version: readPackageVersion(), description: 'Structured documentation for codebases and AI agents.' },
    args: rootArgs,
    default: 'home',
    subCommands: {
      home,
      init,
      scan,
      generate,
      merge,
      tree,
      list,
      meta,
      context,
      doctor,
      agent,
      upgrade,
      uninstall,
      '--check-updates-worker': worker,
    },
  })
  return root
}

function group(
  name: string,
  description: string,
  args: ArgsDef,
  path: string,
  subCommands: Record<string, AnyCommand>,
  defaultCommand?: AnyCommand,
): AnyCommand {
  let command: AnyCommand
  command = defineCommand({
    meta: { name, description },
    args,
    subCommands: defaultCommand ? { apply: defaultCommand, ...subCommands } : subCommands,
    default: defaultCommand ? 'apply' : undefined,
    run: async ({ args: parsed, rawArgs }) => {
      if (Array.isArray(parsed._) && parsed._.length > 0) return
      if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        process.stdout.write(await renderScopedUsage(command, path) + '\n')
        return
      }
      if (handleDeveloperHelp(parsed, command, path)) return
      process.stdout.write(await renderUsage(command) + '\n')
    },
  })
  return command
}

function handleDeveloperHelp(args: ParsedArgs, command: AnyCommand, path: string): boolean {
  const depth = parsePositiveInteger(optionalString(args['helpTreeDepth']), 'help-tree-depth')
  if (Boolean(args['helpTree']) || depth !== undefined) {
    process.stdout.write(showHelpTree(command, path, depth) + '\n')
    return true
  }
  if (Boolean(args['helpDocs'])) {
    process.stdout.write(showHelpDocs(command, path, depth))
    return true
  }
  return false
}

async function renderScopedUsage(command: AnyCommand, path: string): Promise<string> {
  const parentName = path.split(' ').slice(0, -1).join(' ')
  if (!parentName) return renderUsage(command)
  return renderUsage(command, defineCommand({ meta: { name: parentName } }))
}

async function reportLoadedConfiguration(options: XDocsCliOptions): Promise<void> {
  const discovered = await discoverConfig(options.cwd, options.config)
  if (!discovered.path) return
  const message = `configuration file loaded: ${discovered.path}\n`
  if (options.format === 'json') process.stderr.write(message)
  else process.stdout.write(message)
}

async function reportCachedUpdateNotice(format: XDocsFormat): Promise<void> {
  const notice = await readUpdateCache()
  if (!notice?.newVersionAvailable) return
  const message = `New version available. Run this command to upgrade: ${notice.upgradeCommand ?? 'xdocs upgrade'}\n`
  if (format === 'json') process.stderr.write(message)
  else process.stdout.write(message)
}

async function runCli(rawArgs: string[] = process.argv.slice(2)): Promise<void> {
  await runCommand(createXDocsCommand(), { rawArgs })
}

async function runCliWithErrorHandling(rawArgs?: string[]): Promise<void> {
  try {
    await runCli(rawArgs)
  } catch (error) {
    if (error instanceof XDocsError) {
      process.stderr.write(`error: ${error.message}\n`)
      process.exitCode = error.exitCode
      return
    }
    if (error instanceof Error && error.name === 'CLIError') {
      process.stderr.write(`error: ${error.message}\n`)
      process.exitCode = 2
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`error: ${message}\n`)
    process.exitCode = 1
  }
}

function scope(args: ParsedArgs): XDocsSkillScope {
  return args['local'] ? 'local' : 'global'
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function requiredString(value: unknown, name: string): string {
  const result = optionalString(value)
  if (!result) throw new XDocsError(`Missing required argument: ${name}`, 2)
  return result
}

function parsePositiveInteger(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined
  const number = Number(value)
  try {
    return Value.Decode(PositiveIntegerSchema, number)
  } catch {
    throw new XDocsError(`Invalid --${name} value: "${value}". Expected a positive integer.`, 2)
  }
}
