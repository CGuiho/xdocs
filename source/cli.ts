/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { resolve } from 'node:path'
import type { XDocsCliOptions, XDocsCommand, XDocsFormat } from './types.js'
import { XDocsError } from './errors.js'
import { parseArgs, booleanFlag, stringFlag } from './flags.js'
import { readPackageVersion, showCommandHelp, showCommandHelpDocs, showCommandHelpTree, showHelp, showHelpDocs, showHelpTree, showVersion } from './help.js'
import { runAgentAutomation } from './agents.js'
import { readUpdateCache, runBackgroundUpdateCheck, scheduleBackgroundUpdateCheck } from './self-management.js'
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
import { runAgents } from './commands/agents.js'
import { runUpgrade } from './commands/upgrade.js'
import { runUninstall } from './commands/uninstall.js'

const validCommands = new Set<XDocsCommand>(['init', 'scan', 'generate', 'prompt', 'merge', 'tree', 'list', 'meta', 'context', 'doctor', 'agents', 'upgrade', 'uninstall'])

/** Commands that run the config-gated agent automation before executing. */
const automationCommands = new Set<XDocsCommand>(['scan', 'generate', 'merge', 'tree', 'list', 'meta', 'context', 'doctor'])

/** Main CLI entry point. */
export const runCli = async (rawArgs: string[] = process.argv.slice(2)): Promise<void> => {
  const parsed = parseArgs(rawArgs)

  if (booleanFlag(parsed.flags, 'xdocsUpdateCheckWorker')) {
    await runBackgroundUpdateCheck()
    return
  }

  if (booleanFlag(parsed.flags, 'version')) {
    process.stdout.write(showVersion() + '\n')
    return
  }

  if (booleanFlag(parsed.flags, 'helpTree')) {
    process.stdout.write((parsed.command ? showCommandHelpTree(parsed.command) : showHelpTree()) + '\n')
    return
  }

  if (booleanFlag(parsed.flags, 'helpDocs')) {
    process.stdout.write(parsed.command ? showCommandHelpDocs(parsed.command) : showHelpDocs())
    return
  }

  if (booleanFlag(parsed.flags, 'help')) {
    if (parsed.command && validCommands.has(parsed.command as XDocsCommand)) {
      process.stdout.write(showCommandHelp(parsed.command) + '\n')
    } else {
      process.stdout.write(showHelp() + '\n')
    }
    return
  }

  if (parsed.command && !validCommands.has(parsed.command as XDocsCommand)) {
    throw new XDocsError(`Unknown command: ${parsed.command}\n\nRun \`xdocs --help\` for available commands.`)
  }

  const options = resolveOptions(parsed.flags)

  if (!parsed.command) {
    await runAgentAutomation(options, (message) => process.stderr.write(message + '\n'))
    await printCachedUpdateNotice()
    void scheduleBackgroundUpdateCheck()
    process.stdout.write(showHelp() + '\n')
    return
  }

  const command = parsed.command as XDocsCommand

  if (automationCommands.has(command)) {
    await runAgentAutomation(options, (message) => process.stderr.write(message + '\n'))
  }

  switch (command) {
    case 'init':
      await runInit(options, parsed)
      break
    case 'scan':
      await runScan(options, parsed)
      break
    case 'generate':
      await runGenerate(options, parsed)
      break
    case 'prompt':
      await runPrompt(options, parsed)
      break
    case 'merge':
      await runMerge(options, parsed)
      break
    case 'tree':
      await runTree(options, parsed)
      break
    case 'list':
      await runList(options, parsed)
      break
    case 'meta':
      await runMeta(options, parsed)
      break
    case 'context':
      await runContext(options, parsed)
      break
    case 'doctor':
      await runDoctor(options, parsed)
      break
    case 'agents':
      await runAgents(options, parsed)
      break
    case 'upgrade':
      await runUpgrade(options, parsed)
      break
    case 'uninstall':
      await runUninstall(options, parsed)
      break
  }
}

/** Build XDocsCliOptions from parsed flags. */
const resolveOptions = (flags: Record<string, string | boolean | string[]>): XDocsCliOptions => {
  const cwd = stringFlag(flags, 'cwd') ?? process.cwd()
  const format = stringFlag(flags, 'format') ?? 'text'

  if (format !== 'text' && format !== 'json' && format !== 'markdown') {
    throw new XDocsError(`Invalid --format value: "${format}". Expected text, json, or markdown.`)
  }

  return {
    cwd: resolve(cwd),
    config: stringFlag(flags, 'config'),
    format: format as XDocsFormat,
    verbose: booleanFlag(flags, 'verbose'),
  }
}

const printCachedUpdateNotice = async (): Promise<void> => {
  const cache = await readUpdateCache()
  if (!cache?.updateAvailable) return
  if (compareVersions(cache.latestVersion, readPackageVersion()) <= 0) return

  process.stderr.write(`notice: xdocs ${cache.latestVersion} is available. Run \`xdocs upgrade\` to update.\n`)
}

const compareVersions = (a: string, b: string): number => {
  const left = a.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0)
  const right = b.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)
    if (diff !== 0) return diff
  }

  return 0
}

/** Run the CLI with error handling. */
export const runCliWithErrorHandling = async (rawArgs?: string[]): Promise<void> => {
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
