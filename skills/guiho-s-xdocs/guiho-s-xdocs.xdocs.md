---
subject: xdocs-guiho-s-xdocs-skill
description: Packaged guiho-s-xdocs agent skill that teaches AI agents how to maintain xdocs projects.
parent: xdocs-skills
children: []
files: {}
documents:
  SKILL.md: Versioned xdocs workflow skill installed into .agents/skills or .claude/skills; defines descriptor, companion-document, scan, tree, and maintenance rules.
tags:
  - skills
  - agents
  - documentation
flags: []
status: stable
---

The `guiho-s-xdocs/` directory contains the bundled agent skill shipped with the
package. The installer treats `SKILL.md` as the source of truth and refreshes
installed copies when the bundled version or content changes.
