---
subject: xdocs-skills
description: Bundled AI-agent skills shipped with @guiho/xdocs and installed by the xdocs agents commands.
parent: xdocs-package
children: []
files:
  guiho-s-xdocs/SKILL.md: Versioned xdocs workflow skill installed into .agents/skills or .claude/skills; replaces legacy guiho-as-xdocs installs when refreshed.
tags:
  - skills
  - agents
  - documentation
flags: []
status: stable
---

The `skills/` directory contains the bundled `guiho-s-xdocs` agent skill. The
installer treats this packaged skill as the current source of truth, removes
legacy `guiho-as-xdocs` install directories, and refreshes installed copies when
their frontmatter version or content differs from the bundled file.