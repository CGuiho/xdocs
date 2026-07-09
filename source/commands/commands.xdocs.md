---
subject: xdocs-commands
description: CLI command handlers for scan, tree, list, generate, merge, prompt, init, self-management, and agent-skill operations.
parent: xdocs-source
children: []
files:
  agents.ts: Handles `xdocs agents` subcommands for skill installation and AGENTS.md instruction refresh.
  generate.ts: Handles `xdocs generate`, producing project or module Markdown output from descriptor metadata, including keywords.
  init.ts: Handles `xdocs init`, creating root files, config, AGENTS.md instructions, and local/global skill installs.
  list.ts: Handles `xdocs list`, listing documented implementation files and companion Markdown documents.
  merge.ts: Handles `xdocs merge`, consolidating descriptor metadata, keywords, and bodies into one Markdown document.
  prompt.ts: Handles `xdocs prompt`, loading named prompt templates.
  scan.ts: Handles `xdocs scan`, reporting descriptor coverage, validity, metadata keywords, and companion-document coverage.
  tree.ts: Handles `xdocs tree`, rendering the descriptor hierarchy in text, Markdown, or JSON.
  uninstall.ts: Handles `xdocs uninstall`, removing or scheduling removal of the current native xdocs binary.
  upgrade.ts: Handles `xdocs upgrade`, `xdocs upgrade check`, and `xdocs upgrade list` for native CLI self-updates from GitHub Releases.
documents: {}
tags:
  - cli
  - commands
keywords:
  - command handlers
  - scan
  - tree
  - generate
  - upgrade
  - uninstall
flags: []
status: stable
---

The `commands/` directory contains one handler per xdocs CLI command. Handlers
load normalized config where needed, call shared discovery/tree/prompt/agent or
self-management helpers, and render command-specific text or JSON output.
