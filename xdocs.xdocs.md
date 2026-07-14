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
  package.json: npm package metadata, Citty runtime dependency, CLI bin mapping, build/test scripts, and package publish file list.
  jsr.json: JSR package metadata and publish include list.
  tsconfig.json: Strict TypeScript settings for source development.
  tsconfig.build.json: Build-specific TypeScript settings for library output, including Bun and Node types.
  mirror.config.toml: GUIHO Mirror release/versioning configuration for package.json, jsr.json, and Git tag outputs.
documents:
  AGENTS.md: Repository instructions for agents working on xdocs, including commands, context recommendations, doctor checks, metadata-only scans, source structure, release rules, and xdocs metadata requirements.
  ARCHITECTURE.md: Architecture and technical design notes for xdocs file conventions, metadata, CLI behavior, distribution, and agent workflows.
  BRAINSTORM.md: Product and design brainstorming notes for the xdocs structured documentation model and future directions.
  CHANGELOG.md: Release changelog for xdocs versions and unreleased changes.
  DOCS.md: Canonical full documentation for @guiho/xdocs, including CLI commands, context recommendations, doctor checks, metadata-only scans, API behavior, and agent-skill behavior; release artifact updated before publishing.
  LICENSE.md: Package license document shipped with @guiho/xdocs.
  README.md: Public-facing package overview, installation instructions, CLI reference, metadata schema, and API examples.
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
flags: []
status: stable
---

The repository root is the actual `@guiho/xdocs` package. It contains the
Citty-based TypeScript CLI implementation, package metadata, bundled prompt and skill resources,
package-manager launcher/install scripts, and Bun-native release binary tooling.
It is versioned by GUIHO Mirror using `mirror.config.toml`.
