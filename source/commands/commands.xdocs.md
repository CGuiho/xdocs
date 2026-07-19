---
subject: xdocs-commands
description: Focused handlers for xdocs domain, agent resource, upgrade, and uninstall commands.
parent: xdocs-source
children: []
files:
  agent.ts: Implements explicit skill, instruction, and prompt actions for the singular RFC agent namespace.
  context.ts: Renders deterministic task-specific reading sets.
  doctor.ts: Renders descriptor, companion, tree, and documented-file health checks.
  generate.ts: Produces project or module Markdown from descriptor metadata.
  init.ts: Creates xdocs.yaml and XDOCS.md, then idempotently installs the bundled skill globally by default or locally with --local.
  upgrade.spec.ts: Human upgrade-plan, known/unknown-length progress rendering, long-running phase ordering, and every-outcome exact-version recovery regression coverage.
  list.ts: Lists documented implementation files and companion documents.
  meta.ts: Reads descriptor and optional companion frontmatter with strict filters.
  merge.ts: Consolidates scoped descriptors into one document.
  scan.ts: Reports descriptor and companion-document coverage.
  tree.ts: Renders containment hierarchy as text, Markdown, or JSON.
  uninstall.ts: Removes or schedules removal of the native executable.
  upgrade.ts: Renders the pre-download upgrade plan, streamed progress, ordered phases, complete all-channel release list, and exact recovery guidance.
documents: {}
tags:
  - cli
  - commands
keywords:
  - command handlers
  - agent namespace
  - documentation domain
  - upgrade
flags: []
status: stable
---

Handlers receive focused values decoded by Citty and TypeBox-aware platform
modules. They do not parse raw command tokens or maintain a second catalog.
