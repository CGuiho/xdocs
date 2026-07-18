---
subject: xdocs-commands
description: Framework-independent CLI command handlers that accept focused inputs for scan, metadata, context, doctor, generation, agent operations, and self-management.
parent: xdocs-source
children: []
files:
  agents.ts: Implements focused skill-installation and AGENTS.md-instruction operations routed by the Citty `agents` command group.
  context.ts: Handles `xdocs context`, rendering deterministic task-specific reading-set recommendations.
  doctor.ts: Handles `xdocs doctor`, rendering descriptor, companion-document, tree, and documented-file health checks.
  generate.ts: Handles `xdocs generate`, producing project or module Markdown output from descriptor metadata, including keywords.
  init.ts: Handles `xdocs init`, creating root files, config, AGENTS.md instructions, and local/global skill installs.
  list.ts: Handles `xdocs list`, listing documented implementation files and companion Markdown documents.
  meta.ts: Handles `xdocs meta`, reading descriptor and optional associated companion-document frontmatter only, with strict validation and owner/tag/keyword filters.
  merge.ts: Handles `xdocs merge`, consolidating descriptor metadata, keywords, and bodies into one Markdown document.
  prompt.ts: Handles `xdocs prompt`, loading named prompt templates.
  scan.ts: Handles `xdocs scan`, reporting descriptor coverage, validity, metadata keywords, and companion-document coverage.
  tree.ts: Handles `xdocs tree`, rendering the descriptor hierarchy in text, Markdown, or JSON.
  uninstall.ts: Handles `xdocs uninstall`, removing or scheduling removal of the current native xdocs binary.
  upgrade.ts: Streams upgrade plans and transaction phases, renders fixed JSON/Markdown/text envelopes with pinned recovery guidance, and lists the complete SemVer release catalog.
documents: {}
tags:
  - cli
  - commands
keywords:
  - command handlers
  - scan
  - meta
  - context
  - doctor
  - tree
  - generate
  - upgrade
  - uninstall
flags: []
status: stable
---

The `commands/` directory contains focused xdocs operations. Handlers accept
command-specific inputs rather than parsed CLI tokens or Citty types, load
normalized config where needed, call shared discovery/meta/context/doctor/tree/prompt/agent
or self-management helpers, and render command-specific text, Markdown, or JSON output.
