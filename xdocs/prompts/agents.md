---
name: agents
description: Update AGENTS.md with xdocs instructions for AI agents.
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
   - Use the xdocs CLI for documentation operations
   - Maintain xdocs descriptors and companion-document metadata when modifying code
   - Use only named `*.xdocs.md` descriptors, never nameless `.xdocs.md` files
   - List every same-directory plain `*.md` companion document in the descriptor's `documents` metadata map
   - Follow the metadata schema for frontmatter
