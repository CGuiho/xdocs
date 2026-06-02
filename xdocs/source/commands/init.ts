/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { writeDefaultConfig } from '../config.js'

const ROOT_XDOCS_CONTENT = `
# GUIHO XDocs Documentation

## Files

## Directories
`.trim() + '\n'

const AGENTS_XDOCS_BLOCK = `
<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->
## XDocs

This project uses xdocs for structured documentation. xdocs files describe
modules, their purpose, files, and hierarchy.

- Configuration: \`xdocs.config.toml\`
- Root documentation: \`XDOCS.md\`
- File extensions: \`.docs.md\`, \`.xdocs.md\`

When modifying code, check the xdocs configuration for AI behavior mode.
In "prompt" mode, announce documentation updates and wait for confirmation.
In "auto" mode, update documentation immediately.

Use the xdocs CLI for operations: \`xdocs scan\`, \`xdocs generate\`, \`xdocs tree\`, etc.
<!-- END XDOCS -->
`.trim()

/** Run the init command. */
export const runInit = async (options: XDocsCliOptions, _parsed: XDocsParsedArgs): Promise<void> => {
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

  // 3. Update AGENTS.md
  const agentsPath = resolve(cwd, 'AGENTS.md')
  if (existsSync(agentsPath)) {
    const content = await readFile(agentsPath, 'utf8')
    if (content.includes('<!-- BEGIN XDOCS')) {
      process.stdout.write(`exists: AGENTS.md (xdocs section already present)\n`)
    } else {
      await writeFile(agentsPath, content.trimEnd() + '\n\n' + AGENTS_XDOCS_BLOCK + '\n', 'utf8')
      process.stdout.write(`updated: AGENTS.md (added xdocs section)\n`)
    }
  } else {
    await writeFile(agentsPath, '# Agent Instructions\n\n' + AGENTS_XDOCS_BLOCK + '\n', 'utf8')
    process.stdout.write(`created: AGENTS.md\n`)
  }

  process.stdout.write(`\nxdocs initialized.\n`)
}
