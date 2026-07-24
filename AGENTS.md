---
name: xdocs-repository-agent-instructions
purpose: Define mandatory engineering, documentation, validation, and release behavior for agents working in the xdocs repository.
description: Repository-local instructions for the GUIHO SWE agent, Go CLI Engineer skill, XDocs metadata, and Git-native Mirror releases.
created: 2026-06-01
owner: xdocs-package
flags: []
tags:
  - agents
  - repository-instructions
  - cli-engineering
keywords:
  - GUIHO SWE agent
  - CLI Engineer skill
  - xdocs workflow
---

# Repository Notes

## Agent

Always read this: /c/GUIHO/superiority/agents/guiho-a-0001-swe.AGENTS.md (C:\GUIHO\superiority\agents\guiho-a-0001-swe.AGENTS.md)
Stop if you can not find it.

## Required CLI Engineering

- Use `guiho-a-0001-swe` as the coordinating GUIHO Software Engineer/SWE agent
  for xdocs CLI architecture, planning, execution, review, validation, and
  release work.
- Load and follow the `guiho-s-0035-cli-engineer-go` agent skill whenever creating,
  upgrading, refactoring, reviewing, testing, packaging, installing, or
  releasing the xdocs CLI.
- `guiho-s-0035-cli-engineer-go` is a skill, not an agent. It supplements the SWE
  agent and does not replace its lifecycle controller.
- Use Go 1.26.5, Cobra, `go.yaml.in/yaml/v3`, typed structs, explicit semantic
  validation, standard-library runtime services, `go:embed`, and
  `CGO_ENABLED=0`.
- The approved Go rewrite is breaking. The historical TypeScript tree remains
  only as migration reference; it is not the shipping runtime, CI path,
  release path, installer path, or version source.


- `xdocs` is almost always written lowercase (CLI, code, text). Only capitalize as `XDocs` when used in a title or heading.
- The real package lives at the repository root; run package commands from `C:\GUIHO\xdocs`.
- XDocs ships as a native Go CLI from `main.go` and `cmd/`; domain packages
  live under `internal/`.
- Use Go commands for active implementation and validation. Do not add Bun,
  Node, npm, pnpm, yarn, or TypeScript dependencies to the Go runtime.

## Commands

- Format: `gofmt -w main.go cmd internal devops`
- Test all: `go test ./...`
- Vet: `go vet ./...`
- Build native: `go build -trimpath -o bin/xdocs.exe .`
- Build release matrix:
  `go run ./devops/build-binaries.go --version <version> --commit <sha> --build-date <RFC3339>`

## CLI Behavior

- The xdocs CLI is a structured documentation tool, not a versioning tool. It
  does not bump versions or mutate package manifests.
- Supported commands: `init`, `scan`, `generate`, `merge`, `tree`, `list`, `meta`, `context`, `doctor`, `agent`, `upgrade`, `uninstall`.
- `xdocs init` creates `XDOCS.md` and `xdocs.yaml` and, as an explicit
  first-run setup action, installs the bundled skill for both supported agent
  tools. After initialization, agent resources change only through explicit
  `xdocs agent` actions.
- `xdocs scan` walks the project tree (respecting `[scan].exclude`) and reports named `*.xdocs.md` descriptor coverage plus same-directory Markdown companion-document coverage.
- `xdocs generate [path]` generates documentation for a specific directory or the entire project.
- `xdocs merge [path]` merges xdocs descriptors from a directory into a single consolidated document.
- `xdocs tree` builds and displays the project hierarchy from xdocs metadata.
- `xdocs list [path]` lists files in a scope with descriptions from xdocs metadata.
- `xdocs meta [path]` scans top-down and reads only YAML frontmatter from named `*.xdocs.md` descriptors; `--documents` also reads associated companion `.md` frontmatter, while `--owner`, `--tag`, and `--keyword` filter metadata before agents read full files.
- `xdocs context <query> [path]` recommends a minimal reading set for a task from descriptor, file, and companion-document metadata; use `--documents`, `--files`, `--limit`, and `--explain` for agent workflows.
- `xdocs doctor [path]` runs CI-friendly health checks for descriptor validity, companion-document metadata, tree integrity, and documented file existence.
- `xdocs agent skill install|uninstall|update|list|show`, `agent instruction apply|remove|update|show`, and `agent prompt list|show` implement explicit RFC 0034 agent integration.
- Skill mutations default global, use `--local` for project scope, and always target both `.agents/skills` and `.claude/skills`.
- A bare xdocs invocation prints the exact startup banner and data commands never mutate agent files.
- Cobra owns the single command catalog and routing. Typed Go structs, strict
  YAML/JSON decoding, and explicit validation protect structured boundaries.
- Every scope supports `-h`/`--help`, `--help-tree`, `--help-tree-depth`, and `--help-docs`. Only root version uses `-v`/`--version`.
- Configuration uses `xdocs.yaml`; global state uses `~/.guiho/xdocs/`.

## Source Structure

- `main.go` -- thin entrypoint, embedded resources, and linker metadata.
- `cmd/` -- one Cobra tree, help, domain adapters, agents, upgrades, and
  uninstall.
- `internal/config/` -- strict YAML configuration and precedence.
- `internal/xdocs/` -- metadata, discovery, tree, context, doctor, generation,
  merge, and list services.
- `internal/agent/` -- embedded resources and idempotent local/global mutations.
- `internal/update/` -- cached notices, detached worker, SemVer, and release
  catalog.
- `internal/upgrade/` -- checksums and platform-safe executable replacement.
- `internal/release/` -- exact eight-binary and eleven-asset release matrix.
- `source/` -- historical TypeScript migration reference; not active runtime.
- `skills/guiho-s-xdocs/SKILL.md` -- canonical embedded skill source.
- `devops/build-binaries.go` -- reproducible pure-Go release matrix.
- `devops/install.sh` / `devops/install.ps1` -- checksum-verifying native Go
  installers.
- `DOCS.md` -- canonical full user-facing documentation; update before release.

## Key Concepts

- xdocs descriptors use Markdown with YAML frontmatter and must be named `*.xdocs.md`; `.docs.md` is not supported and `.xdocs.md` by itself is invalid. Same-directory plain `*.md` files are companion documents listed in the descriptor's `documents` metadata. The root file is always `XDOCS.md` (uppercase, no prefix, no frontmatter). Use `xdocs meta [path] --documents --format json` when an agent needs descriptor and companion-document frontmatter without reading full Markdown bodies.
- Metadata fields: `subject`, `description`, `parent`, `children`, `files`, `documents`, `tags`, `keywords`, `flags`, and optional `status`.
- The tree is a parent-child containment hierarchy, not a dependency graph. Built from `subject`/`parent`/`children` fields.
- Configuration lives in `xdocs.yaml`. Sections: `extensions`, `ai`, `scan`, and `project`.
- Agent resource operations are always explicit and are not configuration-driven.
- AI mode (`ai.mode`): `"prompt"` (default, AI announces updates and waits) or `"auto"` (AI updates docs automatically).
- Runtime CLI dependencies: Cobra and `go.yaml.in/yaml/v3`.

## Gotchas

- Run `gofmt`, `go test ./...`, and `go vet ./...` for every Go change.
- Generated outputs (`dist/`, `bin/`) are ignored; do not hand-edit them.
- Prompt files and the agent skill are embedded into native binaries and packaged
  as `guiho-i-xdocs.md` and `guiho-s-xdocs.zip`. Skill mutation always
  addresses both supported tool paths. Releases contain exactly eleven assets.
- The skill `metadata.version` must match the Git release version.
- Versioning is handled by Mirror through Git only. The canonical tag format
  is `xdocs/vX.Y.Z`; `package.json` and `jsr.json` are not version sources or
  outputs.

## Semantic Project Versioning -- GUIHO Mirror

Invoke the guiho-s-mirror agent skill every time the user wants to bump, tag, release, plan, initialize, configure, or troubleshoot semantic project versioning with GUIHO Mirror.

Before editing release docs or changelogs, inspect `mirror.yaml`. If `agents.write_changelog` is false, skip changelog edits. If it is missing or true, changelog edits are allowed when the project has a changelog.

Use [agents].changelog_path as the changelog file path. If it is missing, use CHANGELOG.md in the project root.

Before publishing a new version, update `DOCS.md` -- the canonical full
documentation for the native xdocs CLI -- to capture every behavior change in
the release, written the same way as the changelog. Treat `DOCS.md` as a
required release artifact: keep it current with CLI commands and flags,
configuration fields, the metadata schema, Go runtime behavior, and agent skill
behavior. Do not publish when `DOCS.md` is stale relative to the shipping code.

GitHub Release descriptions contain only the exact version section extracted
from `CHANGELOG.md`; never pass the full changelog to release creation.

## GUIHO Project

### Identity

| Field | Value |
| --- | --- |
| GUIHO Project ID | g0000 observed in current GUIHO runtime artifacts; confirm before using as a formal registry ID |
| GUIHO Subject ID | TBD - formal subject ID for this component is not declared yet |
| GUIHO Subject Name | XDocs |
| Project Family | guiho |
| Repository Directory | C:\GUIHO\xdocs |
| Repository Kind | shared package |
| Parent Project | GUIHO Root (C:\GUIHO\guiho) |
| Parent Component | GUIHO Root |

### Component Purpose

Native Go structured-documentation CLI for XDocs.

### Parent Context

- Parent AGENTS: [../guiho/AGENTS.md](../guiho/AGENTS.md)
- Parent TODO: [../guiho/TODO.md](../guiho/TODO.md)
- Local TODO: [./TODO.md](./TODO.md)

For the full project map, sibling components, package index, service index,
project-wide TODOs, and cross-repository coordination rules, read the parent
repository's AGENTS.md GUIHO Project section.

### Local Scope

- Kind: shared package
- Work directory: .
- Primary skills: guiho-s-0035-cli-engineer-go, guiho-s-xdocs
- Baseline checks: `gofmt`, `go test ./...`, `go vet ./...`

### Coordination Rules

- This repository is a child of C:\GUIHO\guiho.
- Keep component-specific implementation tasks in the local TODO file.
- Keep cross-component planning and parent delegation in the parent TODO file.
- Read this component's existing local instructions before editing source code.
- Do not publish, deploy, run migrations, rotate secrets, or mutate production resources without explicit user approval.

<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->
## XDocs Structured Documentation

This project uses **xdocs** (`@guiho/xdocs`) for structured, machine-readable
documentation. Load the `guiho-s-xdocs` agent skill before creating,
updating, scanning, merging, validating, or navigating xdocs descriptors.

The project configuration is `xdocs.yaml`. Respect `ai.mode`: `prompt`
requires confirmation before documentation writes, while `auto` permits
immediate descriptor maintenance. Use `xdocs meta`, `xdocs context`,
`xdocs tree`, and `xdocs doctor` to discover and validate documentation.
<!-- END XDOCS -->
