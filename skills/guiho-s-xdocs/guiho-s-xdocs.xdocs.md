---
subject: xdocs-guiho-s-xdocs-skill
description: Packaged guiho-s-xdocs agent skill that teaches AI agents how to maintain xdocs projects.
parent: xdocs-skills
children: []
files: {}
documents:
  SKILL.md: Versioned xdocs workflow skill installed into .agents/skills or .claude/skills; defines descriptor, companion-document metadata, native CLI usage, metadata-only scans, context recommendations, doctor checks, scan, tree, and maintenance rules.
tags:
  - skills
  - agents
  - documentation
keywords:
  - xdocs skill
  - companion metadata
  - metadata-only scan
  - context recommendations
  - doctor checks
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
`flags`, `tags`, `keywords`, and `owner`. It includes both the legacy top-level
`version` and `metadata.version`, which must stay aligned with the package
version during release preparation. The skill instructs agents to use
`xdocs context "<query>" --documents --files --format json` before opening broad
code/documentation, `xdocs meta [path] --documents --format json` before opening
full Markdown bodies, and `xdocs doctor` before finishing documentation-heavy
changes. It also instructs agents to use the installed native `xdocs` CLI first,
reserving Bun source execution for xdocs development checkouts.
