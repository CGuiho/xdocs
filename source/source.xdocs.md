---
subject: xdocs-source
description: TypeScript source for the xdocs CLI, library exports, command handlers, metadata parsing, tree building, and agent automation.
parent: xdocs-package
children:
  - xdocs-commands
files:
  guiho-xdocs.ts: Public library export surface for xdocs types, functions, and skill metadata helpers.
  guiho-xdocs-bin.ts: Node-compatible source CLI entrypoint.
  guiho-xdocs-native-bin.ts: Bun-compiled native binary entrypoint that registers embedded resources before importing the CLI.
  embedded-resources.ts: Bun text imports for embedding prompts, the versioned agent skill, and package version into native binaries.
  cli.ts: CLI argument parsing, command dispatch, and config-gated agent automation for bare and data-command invocations.
  config.ts: TOML configuration discovery, Bun-native TOML parsing, validation, defaults, and [agents] settings normalization.
  discovery.ts: Project scanning, named xdocs descriptor discovery, sibling Markdown document discovery, and descriptor/document validation.
  metadata.ts: YAML frontmatter extraction, Bun-native YAML parsing, xdocs metadata validation including required keywords, and nameless descriptor rejection.
  tree.ts: Parent-child hierarchy construction, validation, and rendering.
  prompts.ts: Runtime prompt loader for package-manager/library use; native binaries can use embedded resources.
  agents.ts: Versioned agent skill installation, legacy skill-name removal, AGENTS.md section management, tool detection, and automation.
  help.ts: Help text and version display.
  flags.ts: CLI flag parsing utilities.
  errors.ts: XDocsError and invariant helper.
  types.ts: Public and internal TypeScript type definitions, including xdocs metadata keywords, skill install version, and legacy-cleanup result fields.
  guiho-xdocs.spec.ts: Bun test suite covering flags, package metadata, metadata parsing, descriptor/document discovery, tree, config, agents, CLI automation, skill migration/version refresh, and resource behavior.
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
flags: []
status: stable
---

The `source/` directory is the TypeScript implementation for both the source CLI
path and native compiled CLI path. The source CLI entrypoint is Node-compatible;
the native entrypoint embeds prompt/skill/package resources so
direct installer binaries do not require adjacent files at runtime. Agent skill
installation now treats the bundled `guiho-s-xdocs` skill as source of truth,
removing legacy `guiho-as-xdocs` installs and replacing stale copies when the
bundled version or content differs. Bare CLI invocations also run that global
skill refresh before printing help, using standard defaults when no config is
present.
