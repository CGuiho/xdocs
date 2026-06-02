/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsParsedArgs, XDocsPromptName } from '../types.js'
import { XDocsError } from '../errors.js'
import { stringFlag } from '../flags.js'

const validPromptNames = new Set<XDocsPromptName>(['write', 'update', 'agents', 'generate'])

const prompts: Record<XDocsPromptName, string> = {
  write: `
# xdocs: Write Documentation

You are an AI assistant tasked with writing xdocs documentation for a directory/module.

## Instructions

1. Scan the target directory and all its subdirectories.
2. Read every source file to understand what it does.
3. Identify the purpose of this module/directory.
4. Create an xdocs file with YAML frontmatter containing:
   - subject: A short identifier for this module
   - description: A concise description of what this module does
   - parent: The parent module's subject (or null if this is a root module)
   - children: List of child module subjects
   - files: Map of filename to short description for each file
   - tags: Relevant tags (empty array if none)
   - flags: Relevant flags (empty array if none)
5. Write a Markdown body below the frontmatter with:
   - An overview section explaining the module in more detail
   - Usage examples if relevant
   - Any important notes or caveats
6. Name the file as \`<module-name>.xdocs.md\` in the target directory.

## Frontmatter Template

\`\`\`yaml
---
subject: module-name
description: What this module does in one sentence.
parent: parent-module
children:
  - child-a
  - child-b
files:
  - file-a.ts: What file-a does.
  - file-b.ts: What file-b does.
tags: []
flags: []
---
\`\`\`
`.trim(),

  update: `
# xdocs: Update Documentation

You are an AI assistant tasked with updating existing xdocs documentation after code changes.

## Instructions

1. Identify which files have changed in the recent modifications.
2. Find the xdocs files that document the directories containing those changes.
3. For each affected xdocs file:
   a. Re-read the files listed in the metadata to check if descriptions are still accurate.
   b. Check if new files were added that need to be listed.
   c. Check if files were removed that should be unlisted.
   d. Update the description if the module's purpose has changed.
   e. Update children if subdirectories were added or removed.
   f. Update the body content if significant changes occurred.
4. Preserve the existing structure and style of the xdocs file.
5. Do not remove information that is still accurate.

## Checklist

- [ ] All new files are listed in the files metadata
- [ ] Removed files are no longer listed
- [ ] File descriptions are accurate
- [ ] Module description reflects current state
- [ ] Children list matches actual subdirectories
- [ ] Parent reference is still correct
`.trim(),

  agents: `
# xdocs: Update AGENTS.md

You are an AI assistant tasked with updating the AGENTS.md file to include xdocs instructions.

## Instructions

1. Read the existing AGENTS.md file.
2. Check if there is already an xdocs section (between \`<!-- BEGIN XDOCS -->\` and \`<!-- END XDOCS -->\` markers).
3. If the section exists, update it with the current xdocs configuration.
4. If the section does not exist, add it at the end of the file.
5. The xdocs section should instruct AI agents to:
   - Read XDOCS.md and xdocs files when entering the project
   - Respect the configured AI behavior mode (prompt or auto)
   - Use the xdocs CLI for documentation operations
   - Maintain xdocs files when modifying code
   - Follow the metadata schema for frontmatter
`.trim(),

  generate: `
# xdocs: Generate Comprehensive Documentation

You are an AI assistant tasked with generating comprehensive documentation for a domain or the entire project.

## Instructions

1. Scan all xdocs files in the target scope (directory or project).
2. Read every source file in the scope.
3. Build a complete understanding of:
   - The module hierarchy
   - The purpose of each module
   - How modules relate to each other
   - What each file does
4. Generate a single comprehensive Markdown document that includes:
   - Project or domain overview
   - Complete hierarchy tree
   - Detailed description of each module
   - File listings with descriptions
   - Cross-references between related modules
5. The output should be a self-contained document that fully describes the scope.
6. Use clear headings, consistent formatting, and concise language.
`.trim(),
}

/** Run the prompt command. */
export const runPrompt = async (_options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const name = stringFlag(parsed.flags, 'name')

  if (!name) {
    throw new XDocsError('Missing --name flag. Usage: xdocs prompt --name=write\n\nAvailable prompts: write, update, agents, generate')
  }

  if (!validPromptNames.has(name as XDocsPromptName)) {
    throw new XDocsError(`Unknown prompt name: "${name}"\n\nAvailable prompts: write, update, agents, generate`)
  }

  const prompt = prompts[name as XDocsPromptName]

  process.stdout.write(prompt + '\n')
}
