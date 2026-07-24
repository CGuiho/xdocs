---
subject: xdocs-package
description: Native Go XDocs CLI root, release tooling, embedded agent resources, documentation, and historical migration sources.
parent: null
children:
  - xdocs-cmd
  - xdocs-internal
  - xdocs-source
  - xdocs-devops
  - xdocs-scripts
  - xdocs-skills
  - xdocs-prompts
  - xdocs-docs
files:
  main.go: Thin native entrypoint with embedded skill and prompt resources plus linker-injected build metadata.
  main_test.go: Verifies that both embedded skill version fields match the current native Go release.
  go.mod: Authoritative Go module definition for Cobra and strict YAML dependencies.
  go.sum: Reproducible Go dependency checksums.
  mirror.yaml: Git-only Mirror configuration using canonical xdocs/vX.Y.Z tags.
  xdocs.yaml: YAML configuration for xdocs documentation workflows in this repository.
  package.json: Legacy package metadata retained only as TypeScript migration history; it is not a version source or runtime input.
  jsr.json: Legacy JSR metadata retained only as migration history; it is not a version source or release output.
  tsconfig.json: Historical TypeScript source settings.
  tsconfig.build.json: Historical TypeScript library-build settings.
documents:
  AGENTS.md: Repository rules requiring the GUIHO SWE agent, Go CLI Engineer skill, Go checks, XDocs metadata, and Git-only releases.
  ARCHITECTURE.md: Canonical native Go runtime, command, update, upgrade, version, and distribution architecture.
  BRAINSTORM.md: Product and design brainstorming notes for the xdocs structured documentation model and future directions.
  CHANGELOG.md: Exact version-scoped release history.
  DOCS.md: Canonical full documentation for commands, configuration, metadata, agents, upgrades, installers, and releases.
  LICENSE.md: XDocs license.
  README.md: Public native installation, workflow, and command overview.
  TECHNICAL.md: Concise implementation and validation notes for the Go generation.
  TODO.md: Local work ledger.
tags:
  - go
  - cli
  - documentation
keywords:
  - xdocs
  - cli
  - structured documentation
  - Cobra
  - strict YAML
  - Git version
  - native binary
  - self-upgrade
  - agent resources
flags: []
status: stable
---

The repository root ships the native Go XDocs CLI. Git tags in the
`xdocs/vX.Y.Z` namespace are the only version authority. Package manifests and
the TypeScript tree are historical migration references only.
