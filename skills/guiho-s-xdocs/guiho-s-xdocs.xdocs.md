---
subject: xdocs-guiho-s-xdocs-skill
description: Packaged guiho-s-xdocs agent skill that teaches AI agents how to maintain xdocs projects.
parent: xdocs-skills
children: []
files: {}
documents:
  SKILL.md: Versioned xdocs workflow skill installed into .agents/skills or .claude/skills; defines descriptor, companion-document metadata, native CLI usage, scan, tree, and maintenance rules.
tags:
  - skills
  - agents
  - documentation
keywords:
  - xdocs skill
  - companion metadata
  - agent workflow
  - native cli
flags: []
status: stable
---

The `guiho-s-xdocs/` directory contains the bundled agent skill shipped with the
package. The installer treats `SKILL.md` as the source of truth and refreshes
installed copies when the bundled version or content changes.
The skill also documents the standard frontmatter fields expected on ordinary
companion Markdown documents: `name`, `purpose`, `description`, `created`,
`flags`, `tags`, `keywords`, and `owner`. The skill now instructs agents to use
the installed native `xdocs` CLI first, reserving Bun source execution for xdocs
development checkouts.
