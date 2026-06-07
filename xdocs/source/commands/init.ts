/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'
import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { loadConfigOrDefaults, writeDefaultConfig } from '../config.js'
import { booleanFlag, stringFlag } from '../flags.js'
import { ensureAgentsInstructions, findAgentsFile, installSkill, parseAgentTools, resolveInstallTools, xdocsSkillName } from '../agents.js'

/**
 * Build the root XDOCS.md content. The root is the tree's root NODE: it carries
 * frontmatter like any other xdocs file, with `parent: null`, and every other
 * `.xdocs.md` / `.docs.md` connects up to it through its `parent` chain.
 */
export const createRootXDocsContent = (projectName: string): string =>
  `---
subject: "${projectName}"
description: "Root of the ${projectName} documentation tree."
parent: null
children: []
files: {}
tags: []
flags: []
---

# ${projectName}

Root of the xdocs documentation tree. Every \`.xdocs.md\` and \`.docs.md\` file in
this repository connects up to this file through its \`parent\` chain: a module's
\`parent\` is the \`subject\` of the module that contains it, and top-level modules
use \`${projectName}\` (this file's \`subject\`) as their \`parent\`.

## Files

## Directories
`

/** Run the init command. */
export const runInit = async (options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const cwd = options.cwd

  // 1. Create xdocs.config.toml
  const configPath = resolve(cwd, 'xdocs.config.toml')
  if (existsSync(configPath)) {
    process.stdout.write(`exists: xdocs.config.toml\n`)
  } else {
    await writeDefaultConfig(cwd)
    process.stdout.write(`created: xdocs.config.toml\n`)
  }

  // 2. Create XDOCS.md
  const xdocsPath = resolve(cwd, 'XDOCS.md')
  if (existsSync(xdocsPath)) {
    process.stdout.write(`exists: XDOCS.md\n`)
  } else {
    await writeFile(xdocsPath, ROOT_XDOCS_CONTENT, 'utf8')
    process.stdout.write(`created: XDOCS.md\n`)
  }

  // 3. Update AGENTS.md (announce xdocs + point AI at the guiho-as-xdocs skill)
  const agentsExisted = findAgentsFile(cwd) !== undefined
  const agentsResult = await ensureAgentsInstructions(cwd, true)
  if (!agentsExisted) {
    process.stdout.write(`created: AGENTS.md\n`)
  } else if (agentsResult.changed) {
    process.stdout.write(`updated: AGENTS.md (xdocs section)\n`)
  } else {
    process.stdout.write(`exists: AGENTS.md (xdocs section already present)\n`)
  }

  // 4. Install the guiho-as-xdocs agent skill (standard by default; non-standard
  //    tools only when explicitly requested via --tool or detected in the project)
  const scope = booleanFlag(parsed.flags, 'global') ? 'global' : 'local'
  const tools = resolveInstallTools(cwd, stringFlag(parsed.flags, 'tool'))
  for (const tool of tools) {
    const result = await installSkill(tool, scope, { cwd })
    const where = scope === 'local' ? relative(cwd, result.path) || result.path : result.path
    if (result.installed) {
      process.stdout.write(`installed: ${xdocsSkillName} skill (${tool}, ${scope}) -> ${where}\n`)
    } else if (result.updated) {
      process.stdout.write(`updated: ${xdocsSkillName} skill (${tool}, ${scope})\n`)
    } else {
      process.stdout.write(`exists: ${xdocsSkillName} skill (${tool}, ${scope})\n`)
    }
  }

  process.stdout.write(`\nxdocs initialized.\n`)
}
