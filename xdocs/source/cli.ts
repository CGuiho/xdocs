/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { resolve } from 'node:path'
import type { XDocsCliOptions, XDocsCommand, XDocsFormat } from './types.js'
import { XDocsError } from './errors.js'
import { parseArgs, booleanFlag, stringFlag } from './flags.js'
import { showHelp, showCommandHelp, showVersion } from './help.js'
import { runInit } from './commands/init.js'
import { runScan } from './commands/scan.js'
import { runGenerate } from './commands/generate.js'
import { runPrompt } from './commands/prompt.js'
import { runMerge } from './commands/merge.js'
import { runTree } from './commands/tree.js'
import { runList } from './commands/list.js'

const validCommands = new Set<XDocsCommand>(['init', 'scan', 'generate', 'prompt', 'merge', 'tree', 'list'])

/** Main CLI entry point. */
export const runCli = async (rawArgs: string[] = process.argv.slice(2)): Promise<void> => {
  const parsed = parseArgs(rawArgs)

  if (booleanFlag(parsed.flags, 'version')) {
    process.stdout.write(showVersion() + '\n')
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

  if (!parsed.command) {
    process.stdout.write(showHelp() + '\n')
    return
  }

  if (!validCommands.has(parsed.command as XDocsCommand)) {
    throw new XDocsError(`Unknown command: ${parsed.command}\n\nRun \`xdocs --help\` for available commands.`)
  }

  const options = resolveOptions(parsed.flags)

  const command = parsed.command as XDocsCommand

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
