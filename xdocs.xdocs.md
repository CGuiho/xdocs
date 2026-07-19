---
subject: xdocs-package
description: Package root for the @guiho/xdocs CLI, native binary builders, prompts, skills, and TypeScript source.
parent: null
children:
  - xdocs-source
  - xdocs-devops
  - xdocs-scripts
  - xdocs-skills
  - xdocs-prompts
  - xdocs-docs
files:
  package.json: npm package metadata, Citty and TypeBox dependencies, Node bootstrap bin mapping, build/test scripts, and publish file list.
  jsr.json: JSR package metadata and publish include list.
  tsconfig.json: Strict TypeScript settings for source development.
  tsconfig.build.json: Build-specific TypeScript settings for library output, including Bun and Node types.
  mirror.config.toml: GUIHO Mirror release/versioning configuration for package.json, jsr.json, and Git tag outputs.
  xdocs.yaml: YAML configuration for xdocs documentation workflows in this repository.
documents:
  AGENTS.md: Repository instructions requiring the GUIHO SWE agent and CLI engineer skill for xdocs CLI work, including commands, metadata workflows, release rules, and the approved breaking RFC 0034 migration.
  ARCHITECTURE.md: Architecture and technical design notes for xdocs file conventions, metadata, CLI behavior, verified upgrade transactions, complete release catalogs, distribution, and agent workflows.
  BRAINSTORM.md: Product and design brainstorming notes for the xdocs structured documentation model and future directions.
  CHANGELOG.md: Release changelog including global-by-default initialization skill setup, RFC 0034 corrections, validated Markdown release assets, literal-safe installer PATH handling, and exact-version release notes.
  DOCS.md: Canonical full documentation including global-by-default initialization, live-root help, streamed upgrade/installer progress, transaction ordering, complete release listing, exact recovery, validated .md agent assets, and agent-skill behavior.
  LICENSE.md: Package license document shipped with @guiho/xdocs.
  README.md: Public package overview with global-by-default initialization skill setup, validated Markdown agent assets, live Citty help/catalog behavior, observable verified self-upgrade, exact-version recovery, complete release listing, CLI reference, metadata schema, and API examples.
  TECHNICAL.md: Short technical notes placeholder for xdocs implementation context.
  TODO.md: Local task list for pending xdocs repository work.
tags:
  - package
  - cli
  - documentation
keywords:
  - xdocs
  - cli
  - structured documentation
  - metadata-only scan
  - context recommendations
  - doctor checks
  - native binary
  - self management
  - verified upgrade
  - exact recovery
  - RFC 0034
  - cli engineer
flags: []
status: stable
---

The repository root is the actual `@guiho/xdocs` package. Core implementation
uses Bun, strict ESM TypeScript, raw Citty, and TypeBox. A thin Node bootstrap
supports npm users. Mirror owns versioning through `mirror.config.toml`.
