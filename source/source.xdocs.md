---
subject: xdocs-source
description: Bun-first TypeScript implementation of the RFC 0034 CLI and structured-documentation library.
parent: xdocs-package
children:
  - xdocs-commands
  - xdocs-runtime
files:
  agents.ts: Explicit both-target skill operations and exact idempotent AGENTS/CLAUDE instruction management.
  cli.ts: Single raw Citty catalog whose root action owns no-argument startup, init exposes global-by-default skill setup with --local, and every root help mode renders the true public command tree.
  cli.spec.ts: RFC command catalog, root/group/leaf Unicode help trees, depth/redirect safety, subprocess root-help, isolated global/local init, startup, YAML, agent, prompt, upgrade-routing/recovery JSON, and domain CLI regressions.
  config.ts: YAML precedence, Bun parsing, TypeBox decoding, defaults, and writing.
  context.ts: Deterministic minimal reading-set recommendation.
  context-doctor.spec.ts: Context and doctor domain regression tests.
  discovery.ts: Descriptor and companion-document discovery.
  doctor.ts: CI-friendly structured-documentation health checks.
  embedded-resources.ts: Bun text imports for native skill, prompt catalog, prompt bodies, and version resources.
  errors.ts: XDocsError with stable exit code and invariant helper.
  guiho-xdocs-bin.ts: Bun source CLI entrypoint.
  guiho-xdocs-native-bin.ts: Native entrypoint that registers embedded resources.
  guiho-xdocs.spec.ts: TypeBox configuration/metadata, exact YAML precedence, and agent-resource tests.
  guiho-xdocs.ts: Public Bun-first library export surface.
  help.ts: Unicode tree and Markdown documentation generated from live Citty definitions while excluding hidden internal commands.
  meta.ts: Metadata-only scanning and filters.
  metadata.ts: YAML frontmatter parsing and TypeBox descriptor validation.
  npm-bootstrap.spec.ts: Node-only bootstrap smoke tests without Bun in PATH.
  prompts.ts: TypeBox-decoded embedded prompt catalog.
  release-assets.spec.ts: Exact fourteen-asset, Markdown agent-payload validation, and prohibited-import tests.
  release-assets.ts: Exact native and .md agent release asset contract with frontmatter, identity, and Markdown guards.
  schemas.ts: TypeBox schemas and shared decoding diagnostics.
  self-management.ts: RFC cache, detached worker, upgrade, agent reconciliation, and uninstall orchestration.
  tree.ts: Containment tree assembly, validation, and rendering.
  types.ts: Public and internal domain/platform TypeScript types.
  upgrade-catalog.spec.ts: GitHub pagination, TypeBox response, SemVer, exact channel, prerelease retention, and missing/compatible asset tests.
  upgrade-catalog.ts: TypeBox-decoded GitHub release catalog and recovery commands.
  upgrade-transaction.spec.ts: Upgrade transaction, rollback, cache, locking, and recovery tests.
  upgrade-transaction.ts: Observable journaled replacement, verification, rollback, and cleanup.
  windows-upgrade.spec.ts: Running-Windows-executable replacement regression.
documents: {}
tags:
  - source
  - typescript
  - cli
keywords:
  - Bun
  - Citty
  - TypeBox
  - RFC 0034
  - structured documentation
flags: []
status: stable
---

Core source is Bun-only. The npm bootstrap is isolated under `scripts/`.
