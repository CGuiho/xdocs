/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsSkillInstallResult, XDocsSkillScope } from '../types.js'
import { ensureAgentsInstructions, installSkills, resolveInstallTools, xdocsSkillName } from '../agents.js'

type XDocsAgentsInstallInput = {
  scope: XDocsSkillScope
  tool?: string
}

/** Install the guiho-s-xdocs skill for one or more tools. */
export const runAgentsInstall = async (options: XDocsCliOptions, input: XDocsAgentsInstallInput): Promise<void> => {
  const tools = resolveInstallTools(options.cwd, input.tool)

  const results = await installSkills(tools, input.scope, { cwd: options.cwd })

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(results, null, 2) + '\n')
    return
  }

  for (const result of results) {
    process.stdout.write(formatInstall(result))
  }
}

/** Insert or refresh the xdocs section in AGENTS.md. */
export const runAgentsInstructions = async (options: XDocsCliOptions): Promise<void> => {
  const result = await ensureAgentsInstructions(options.cwd, true)

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  process.stdout.write(`agents_md: ${result.path}\n`)
  process.stdout.write(`exists: ${result.exists}\n`)
  process.stdout.write(`changed: ${result.changed}\n`)
}

const formatInstall = (result: XDocsSkillInstallResult): string =>
  [
    `skill: ${xdocsSkillName}`,
    `tool: ${result.tool}`,
    `scope: ${result.scope}`,
    `path: ${result.path}`,
    `installed: ${result.installed}`,
    `updated: ${result.updated}`,
    `bundled_version: ${result.bundledVersion ?? ''}`,
    `previous_version: ${result.previousVersion ?? ''}`,
    `removed_legacy: ${result.removedLegacyPaths.join(', ')}`,
    '',
  ].join('\n')
