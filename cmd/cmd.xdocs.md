---
subject: xdocs-cmd
description: One Cobra command tree and thin adapters for public and hidden XDocs CLI behavior, including the isolated plain-invocation agent bootstrap.
parent: xdocs-package
children: []
files:
  root.go: Root command, persistent flags, invocation-time legacy XDOCS.md cleanup, deferred help/version rendering, plain-invocation agent bootstrap routing, startup lifecycle, exit mapping, and hidden worker routes.
  help.go: Command-tree and Markdown help generated from live Cobra definitions.
  domain.go: Adapters for init, scan, generate, merge, tree, list, meta, context, doctor, and frontmatter-policy output.
  agent.go: Explicit skill, instruction, and prompt commands.
  upgrade.go: Release listing, checking, upgrading, and uninstall command adapters.
  uninstall_unix.go: Unix executable removal behavior.
  uninstall_windows.go: Windows deferred executable removal behavior.
  root_test.go: Root bootstrap, legacy-index cleanup, ignore defaults, frontmatter-policy JSON, exclusion, idempotence, marker safety, banner, version, catalog, depth, upgrade-completion, and recovery tests.
  resources_test.go: Deterministic embedded-resource fixtures for command tests.
documents: {}
tags:
  - cobra
  - cli
keywords:
  - command catalog
  - help tree
  - exit codes
  - startup bootstrap
  - frontmatter policy
flags: []
status: stable
---

Cobra is the only parser, router, catalog, and help metadata source.
