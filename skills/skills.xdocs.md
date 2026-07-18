---
subject: xdocs-skills
description: Bundled AI-agent skills shipped with @guiho/xdocs and installed by the singular xdocs agent skill commands.
parent: xdocs-package
children:
  - xdocs-guiho-s-xdocs-skill
files: {}
documents: {}
tags:
  - skills
  - agents
  - documentation
keywords:
  - agent skills
  - bundled skill
  - skill installation
flags: []
status: stable
---

The `skills/` directory contains the bundled `guiho-s-xdocs` agent skill. The
installer treats this packaged skill as the current source of truth, removes
legacy `guiho-as-xdocs` install directories, and refreshes installed copies when
their frontmatter version or content differs from the bundled file.
