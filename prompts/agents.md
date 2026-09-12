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

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# xdocs: Update AGENTS.md

You are an AI assistant tasked with applying the bounded, managed xdocs
instruction block to an agent instruction file. This is an agent-resource
setup operation, separate from documentation-corpus writes.

## Instructions

1. Read the existing AGENTS.md file.
2. Check for the exact managed markers
   `<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->` and
   `<!-- END XDOCS -->`. Preserve every byte outside that bounded block and
   refuse malformed, duplicated, or reversed markers.
3. If the section exists, replace only its body with the current managed
   instruction. If it does not exist, add the block at the end of the file.
4. Do not add YAML frontmatter to AGENTS.md, CLAUDE.md, README.md, or any
   other ordinary Markdown file as part of this operation. The setup exception
   permits only the bounded instruction block and the explicitly requested
   agent-resource files.
5. The xdocs section should instruct AI agents to:
   - Read XDOCS.md and named `*.xdocs.md` descriptor files when entering the project
   - Use one named descriptor per directory, such as
     `technologies/technologies.xdocs.md`; never use bare `.xdocs.md` or
     legacy `.docs.md`
   - Read `documentation.directories` before descriptor writes; directory
     entries grant their non-excluded subtrees and `.` grants the project
   - Treat an empty directory list as no write authorization
   - Respect the configured AI behavior mode (prompt or auto) as timing only;
     it never grants permission
   - Read `documentation.frontmatter` before changing ordinary Markdown
     frontmatter; it requires an explicit `{pattern, kind}` rule inside an
     authorized directory
   - Respect `ignore.gitignore` exclusions and every file or directory rule in
     `ignore.rules`
   - Let legacy `frontmatter: false` denials override frontmatter opt-ins
   - Use the xdocs CLI for documentation operations
   - Keep ordinary Markdown listed in descriptor `documents` metadata even
     when it has no frontmatter, without adding headers by default
   - Keep directory context in the descriptor body; do not create extra
     summary, overview, detail, or report files
   - Use `xdocs tree` without `--output` as the read-only complete tree of
     every non-excluded descriptor at every depth, including the root
     `XDOCS.md` path
   - Print `generate`, `merge`, and `tree` reports to stdout unless one exact
     `--output` path is requested; a report is never a descriptor
   - List every same-directory plain `*.md` companion document in the descriptor's `documents` metadata map
   - Use `meta --existing-frontmatter` and `doctor --existing-frontmatter` for
     read-only audits of existing headers; missing headers remain valid
   - Follow the metadata schema for frontmatter
