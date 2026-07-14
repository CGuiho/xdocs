---
subject: xdocs-source
description: TypeScript source for the Citty-based xdocs CLI, library exports, focused command handlers, metadata parsing, tree building, and agent automation.
parent: xdocs-package
children:
  - xdocs-commands
files:
  guiho-xdocs.ts: Public library export surface for xdocs domain types/functions, CLI runner, self-management, and skill helpers; parser internals are intentionally private.
  guiho-xdocs-bin.ts: Bun source CLI entrypoint used in development checkouts.
  guiho-xdocs-native-bin.ts: Bun-compiled native binary entrypoint that registers embedded resources before importing the CLI.
  embedded-resources.ts: Bun text imports for embedding prompts, the versioned agent skill, and package version into native binaries.
  cli.ts: Single declarative Citty command tree, focused handler adapters, default/hidden routes, library-safe raw-argument execution, contextual usage errors, and config-gated automation.
  cli.spec.ts: Colocated Citty CLI coverage for root/nested help, routing, validation, outputs, automation boundaries, self-management dry runs, and public parser-API removal.
  context.ts: Deterministic reading-set recommendation from descriptor, file, and companion-document metadata for `xdocs context`.
  doctor.ts: CI-friendly xdocs health checks for descriptor validity, companion metadata, tree integrity, and documented file existence.
  self-management.ts: Self-sufficient native CLI helpers for hidden-command background update checks, cached notices, equal-version no-op upgrades, binary replacement, and uninstall.
  config.ts: TOML configuration discovery, Bun-native TOML parsing, validation, defaults, and [agents] settings normalization.
  discovery.ts: Project scanning, named xdocs descriptor discovery, sibling Markdown document discovery, and descriptor/document validation.
  meta.ts: Metadata-only top-down scanning for descriptor and associated companion-document frontmatter, with strict validation and owner/tag/keyword filters.
  metadata.ts: YAML frontmatter extraction, bounded frontmatter-only file reads, Bun-native YAML parsing, xdocs metadata validation including required keywords, and nameless descriptor rejection.
  tree.ts: Parent-child hierarchy construction, validation, branch-lined text rendering with visual scope markers, and Markdown rendering.
  prompts.ts: Runtime prompt loader for package-manager/library use; native binaries can use embedded resources.
  agents.ts: Versioned agent skill installation, metadata.version-aware skill version reads, legacy skill-name removal, AGENTS.md section management, tool detection, and automation.
  help.ts: Extended versioned help-tree and Markdown help-doc rendering plus public help/version helpers; ordinary CLI usage comes from Citty.
  errors.ts: XDocsError and invariant helper.
  types.ts: Public and internal TypeScript types, including metadata, agent automation, and explicit self-upgrade up-to-date results.
  context-doctor.spec.ts: Bun tests for deterministic context recommendations and doctor health checks.
  guiho-xdocs.spec.ts: Bun test suite covering package metadata, metadata parsing, metadata-only scans, descriptor/document discovery, tree, config, agents, CLI automation, self-management helpers, skill migration/version refresh, and resource behavior.
documents: {}
tags:
  - source
  - typescript
  - cli
keywords:
  - TypeScript
  - CLI
  - metadata parsing
  - metadata-only scanning
  - context recommendations
  - doctor health checks
  - agent automation
  - self management
flags: []
status: stable
---

The `source/` directory is the TypeScript implementation for both the source CLI
path and native compiled CLI path. One Citty command tree owns parsing, aliases,
validation, nested/default/hidden routing, and ordinary usage; focused command
handlers remain independent of Citty types. The source CLI entrypoint runs through
Bun in development checkouts; the native entrypoint embeds prompt/skill/package resources so
direct installer binaries do not require adjacent files at runtime. Agent skill
installation now treats the bundled `guiho-s-xdocs` skill as source of truth,
removing legacy `guiho-as-xdocs` installs and replacing stale copies when the
bundled version or content differs. Bare CLI invocations also run that global
skill refresh before printing help, using standard defaults when no config is
present. Native binary installs can also check for updates in the background,
cache update notices, upgrade themselves from GitHub Releases, and uninstall the
current executable.
