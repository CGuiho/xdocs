---
name: agents
purpose: Guide an agent through applying the canonical managed xdocs instruction block.
description: Update AGENTS.md with xdocs instructions for AI agents.
created: 2026-06-02
owner: xdocs-prompts
flags: []
tags:
  - prompt
  - agent-instructions
keywords:
  - AGENTS.md
  - agent instructions
  - xdocs skill
---

# xdocs: Update AGENTS.md

You are an AI assistant tasked with updating the AGENTS.md file to include xdocs instructions.

## Instructions

1. Read the existing AGENTS.md file.
2. Check if there is already an xdocs section (between `<!-- BEGIN XDOCS -->` and `<!-- END XDOCS -->` markers).
3. If the section exists, update it with the current xdocs configuration.
4. If the section does not exist, add it at the end of the file.
5. The xdocs section should instruct AI agents to:
   - Read XDOCS.md and named `*.xdocs.md` descriptor files when entering the project
   - Respect the configured AI behavior mode (prompt or auto)
   - Respect `ignore.gitignore` exclusions and every file or directory rule in
     `ignore.rules`
   - Use the xdocs CLI for documentation operations
   - Maintain xdocs descriptors and companion-document metadata when modifying code
   - Use only named `*.xdocs.md` descriptors, never nameless `.xdocs.md` files
   - List every same-directory plain `*.md` companion document in the descriptor's `documents` metadata map
   - Maintain `keywords` in descriptor and required companion Markdown
     frontmatter, but never add or require frontmatter when a matching rule sets
     `frontmatter: false`
   - Follow the metadata schema for frontmatter
