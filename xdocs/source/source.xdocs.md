---
subject: xdocs-source
description: TypeScript source for the xdocs CLI, library exports, command handlers, metadata parsing, tree building, and agent automation.
parent: xdocs-package
children: []
files:
  guiho-xdocs.ts: Public library export surface for xdocs types and functions.
  guiho-xdocs-bin.ts: Node-compatible package-manager CLI entrypoint.
  guiho-xdocs-native-bin.ts: Bun-compiled native binary entrypoint that registers embedded resources before importing the CLI.
  embedded-resources.ts: Bun text imports for embedding prompts, the agent skill, and package version into native binaries.
  cli.ts: CLI argument parsing, command dispatch, and config-gated agent automation.
  config.ts: TOML configuration discovery, validation, defaults, and [agents] settings normalization.
  discovery.ts: Project scanning and xdocs file discovery.
  metadata.ts: YAML frontmatter extraction and xdocs metadata validation.
  tree.ts: Parent-child hierarchy construction, validation, and rendering.
  prompts.ts: Runtime prompt loader for package-manager/library use; native binaries can use embedded resources.
  agents.ts: Agent skill installation, AGENTS.md section management, tool detection, and automation.
  help.ts: Help text and version display.
  flags.ts: CLI flag parsing utilities.
  errors.ts: XDocsError and invariant helper.
  types.ts: Public and internal TypeScript type definitions.
  guiho-xdocs.spec.ts: Bun test suite covering flags, metadata, tree, config, agents, and resource behavior.
tags:
  - source
  - typescript
  - cli
flags: []
status: stable
---

The `source/` directory is the TypeScript implementation for both the package
manager CLI path and native compiled CLI path. The package-manager entrypoint is
Node-compatible; the native entrypoint embeds prompt/skill/package resources so
direct installer binaries do not require adjacent files at runtime.
