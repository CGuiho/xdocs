---
subject: xdocs-source
description: TypeScript source for the xdocs CLI, library exports, command handlers, metadata parsing, tree building, and agent automation.
parent: xdocs-package
children:
  - xdocs-commands
files:
  guiho-xdocs.ts: Public library export surface for xdocs types, functions, and skill metadata helpers.
  guiho-xdocs-bin.ts: Bun source CLI entrypoint used in development checkouts.
  guiho-xdocs-native-bin.ts: Bun-compiled native binary entrypoint that registers embedded resources before importing the CLI.
  embedded-resources.ts: Bun text imports for embedding prompts, the versioned agent skill, and package version into native binaries.
  cli.ts: CLI argument parsing, command dispatch, and config-gated agent automation for bare and data-command invocations.
  self-management.ts: Self-sufficient native CLI helpers for background update checks, cached update notices, `xdocs upgrade`, and `xdocs uninstall`.
  config.ts: TOML configuration discovery, Bun-native TOML parsing, validation, defaults, and [agents] settings normalization.
  discovery.ts: Project scanning, named xdocs descriptor discovery, sibling Markdown document discovery, and descriptor/document validation.
  metadata.ts: YAML frontmatter extraction, Bun-native YAML parsing, xdocs metadata validation including required keywords, and nameless descriptor rejection.
  tree.ts: Parent-child hierarchy construction, validation, and rendering.
  prompts.ts: Runtime prompt loader for package-manager/library use; native binaries can use embedded resources.
  agents.ts: Versioned agent skill installation, legacy skill-name removal, AGENTS.md section management, tool detection, and automation.
  help.ts: Data-driven help, help-tree, and Markdown help-doc rendering for the root CLI and each command.
  flags.ts: CLI flag parsing utilities, including command-aware `upgrade --version` parsing and help-tree/help-docs flags.
  errors.ts: XDocsError and invariant helper.
  types.ts: Public and internal TypeScript type definitions, including xdocs metadata keywords, skill install version, self-management cache/result types, and legacy-cleanup result fields.
  guiho-xdocs.spec.ts: Bun test suite covering flags, package metadata, metadata parsing, descriptor/document discovery, tree, config, agents, CLI automation, self-management helpers, skill migration/version refresh, and resource behavior.
documents: {}
tags:
  - source
  - typescript
  - cli
keywords:
  - TypeScript
  - CLI
  - metadata parsing
  - agent automation
  - self management
flags: []
status: stable
---

The `source/` directory is the TypeScript implementation for both the source CLI
path and native compiled CLI path. The source CLI entrypoint runs through Bun in
development checkouts; the native entrypoint embeds prompt/skill/package resources so
direct installer binaries do not require adjacent files at runtime. Agent skill
installation now treats the bundled `guiho-s-xdocs` skill as source of truth,
removing legacy `guiho-as-xdocs` installs and replacing stale copies when the
bundled version or content differs. Bare CLI invocations also run that global
skill refresh before printing help, using standard defaults when no config is
present. Native binary installs can also check for updates in the background,
cache update notices, upgrade themselves from GitHub Releases, and uninstall the
current executable.
