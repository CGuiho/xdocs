---
subject: xdocs-cmd
description: One Cobra command tree and thin adapters for all public and hidden XDocs CLI behavior.
parent: xdocs-package
children: []
files:
  root.go: Root command, persistent flags, startup lifecycle, exit mapping, and hidden worker routes.
  help.go: Command-tree and Markdown help generated from live Cobra definitions.
  domain.go: Adapters for init, scan, generate, merge, tree, list, meta, context, and doctor.
  agent.go: Explicit skill, instruction, and prompt commands.
  upgrade.go: Release listing, checking, upgrading, and uninstall command adapters.
  uninstall_unix.go: Unix executable removal behavior.
  uninstall_windows.go: Windows deferred executable removal behavior.
  root_test.go: Root banner, version, catalog, depth, JSON, upgrade-completion, and recovery contract tests.
  resources_test.go: Deterministic embedded-resource fixtures for command tests.
documents: {}
tags:
  - cobra
  - cli
keywords:
  - command catalog
  - help tree
  - exit codes
flags: []
status: stable
---

Cobra is the only parser, router, catalog, and help metadata source.
