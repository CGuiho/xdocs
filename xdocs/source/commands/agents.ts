/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsParsedArgs, XDocsSkillInstallResult, XDocsSkillScope } from '../types.js'
import { XDocsError } from '../errors.js'
import { stringFlag } from '../flags.js'
import { ensureAgentsInstructions, installSkills, resolveInstallTools, xdocsSkillName } from '../agents.js'

const USAGE = `Usage:
  xdocs agents install <local|global> [--tool <agents|claude|all>]
  xdocs agents instructions`

/** Run the agents command. */
export const runAgents = async (options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const sub = parsed.positionals[0]

  if (sub === 'install') {
    await runInstall(options, parsed)
    return
  }

  if (sub === 'instructions') {
    await runInstructions(options)
    return
  }

  if (!sub) throw new XDocsError(`Missing agents subcommand.\n\n${USAGE}`)
  throw new XDocsError(`Unknown agents subcommand: "${sub}"\n\n${USAGE}`)
}

/** Install the guiho-as-xdocs skill for one or more tools. */
const runInstall = async (options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const scope = parseScope(parsed.positionals[1])
  const tools = resolveInstallTools(options.cwd, stringFlag(parsed.flags, 'tool'))

  const results = await installSkills(tools, scope, { cwd: options.cwd })

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(results, null, 2) + '\n')
    return
  }

  for (const result of results) {
    process.stdout.write(formatInstall(result))
  }
}

/** Insert or refresh the xdocs section in AGENTS.md. */
const runInstructions = async (options: XDocsCliOptions): Promise<void> => {
  const result = await ensureAgentsInstructions(options.cwd, true)

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  process.stdout.write(`agents_md: ${result.path}\n`)
  process.stdout.write(`exists: ${result.exists}\n`)
  process.stdout.write(`changed: ${result.changed}\n`)
}

const parseScope = (value: string | undefined): XDocsSkillScope => {
  if (value === 'local' || value === 'global') return value
  if (!value) throw new XDocsError(`Missing install scope.\n\n${USAGE}`)
  throw new XDocsError(`Invalid install scope: "${value}". Expected local or global.`)
}

const formatInstall = (result: XDocsSkillInstallResult): string =>
  [
    `skill: ${xdocsSkillName}`,
    `tool: ${result.tool}`,
    `scope: ${result.scope}`,
    `path: ${result.path}`,
    `installed: ${result.installed}`,
    `updated: ${result.updated}`,
    '',
  ].join('\n')
