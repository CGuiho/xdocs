---
name: xdocs-repository-agent-instructions
purpose: Define mandatory engineering, documentation, validation, and release behavior for agents working in the xdocs repository.
description: Repository-local instructions for the GUIHO SWE agent, CLI Engineer skill, Bun tooling, XDocs metadata, and Mirror releases.
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
- Load and follow the `guiho-s-0034-cli-engineer` agent skill whenever creating,
  upgrading, refactoring, reviewing, testing, packaging, installing, or
  releasing the xdocs CLI.
- `guiho-s-0034-cli-engineer` is a skill, not an agent. It supplements the SWE
  agent and does not replace its lifecycle controller.
- During RFC 0034 implementation, also use the Bun, TypeScript, TypeBox, xdocs,
  Mirror, documentation, TODO, plan execution, implementation review, cloud,
  and validation skills named in the approved plan.
- The approved RFC 0034 migration may make breaking changes. xdocs is pre-1.0;
  do not keep TOML configuration, Node-based core compatibility, plural agent
  commands, root prompt syntax, automatic agent mutations, or legacy release
  names when they conflict with the plan.


- `xdocs` is almost always written lowercase (CLI, code, text). Only capitalize as `XDocs` when used in a title or heading.
- The real package lives at the repository root; run package commands from `C:\GUIHO\xdocs`.
- `@guiho/xdocs` is a Bun/TypeScript ESM CLI/library. The library entrypoint is `source/guiho-xdocs.ts` and the CLI entrypoint is `source/guiho-xdocs-bin.ts`; `tsc` emits `library/` for `main`/`types`, and Bun compiles `bin/` for the CLI binary.
- New library entrypoints must use the full library name instead of generic `index.ts` files. For XDocs v3, use `guiho-xdocs.ts`.
- Use Bun, not npm/pnpm/yarn. Install from the repository root with `bun install`. Private `@guiho40` packages use Google Artifact Registry from `.npmrc`; auth helper is `bun _gaa` or `bunx google-artifactregistry-auth`.

## Commands

- Typecheck: `bun run typecheck`
- Test all: `bun test`
- Test one file: `bun test source/guiho-xdocs.spec.ts`
- Build library: `bun run build` (writes ignored `library/`)
- Compile CLI binary: `bun run binary` (writes ignored `bin/`)
- Compile release binary matrix: `bun run binaries` (writes ignored `bin/xdocs-*`)
- Dev mode: `bun run dev` (watches and re-runs the CLI entrypoint)
- Avoid `bun _ci` and `bun clean-installation` unless intentionally resetting dependencies; they remove `node_modules` and `bun.lock`.

## CLI Behavior

- The xdocs CLI is a structured documentation tool, not a versioning tool. It does not bump versions or mutate `package.json` versions.
- Supported commands: `init`, `scan`, `generate`, `merge`, `tree`, `list`, `meta`, `context`, `doctor`, `agent`, `upgrade`, `uninstall`.
- `xdocs init` creates `XDOCS.md` and `xdocs.yaml`. Agent resources change only through explicit `xdocs agent` actions.
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
- Citty owns the single command catalog and routing. TypeBox validates configuration, metadata, cache, release responses, and structured values.
- Every scope supports `-h`/`--help`, `--help-tree`, `--help-tree-depth`, and `--help-docs`. Only root version uses `-v`/`--version`.
- Configuration uses `xdocs.yaml`; global state uses `~/.guiho/xdocs/`.

## Source Structure

- `source/guiho-xdocs.ts` -- library entrypoint, re-exports all public API
- `source/guiho-xdocs-bin.ts` -- CLI entrypoint
- `source/guiho-xdocs-native-bin.ts` -- Bun-compiled native binary entrypoint; registers embedded prompt/skill/package resources before importing the CLI
- `source/embedded-resources.ts` -- Bun text imports used only for native binary embedding
- `scripts/xdocs-bin.mjs` -- thin Node-compatible npm bootstrap that downloads, caches, and delegates to the native binary
- `source/cli.ts` -- single declarative Citty command tree, Developer Context routing, startup lifecycle, and process-facing error handling
- `source/config.ts` -- YAML discovery, TypeBox validation, and defaults
- `source/schemas.ts` -- TypeBox contracts for configuration, metadata, cache, GitHub releases, skills, prompts, and numeric values
- `source/runtime/` -- Bun-only filesystem, path, and home helpers
- `source/context.ts` -- deterministic reading-set recommendation from xdocs metadata for `xdocs context`
- `source/doctor.ts` -- CI-friendly xdocs health checks for descriptors, companion metadata, tree links, and documented files
- `source/discovery.ts` -- filesystem scanning, xdocs descriptor matching, companion Markdown discovery, and descriptor/document validation
- `source/meta.ts` -- metadata-only top-down scanner for descriptor and companion-document frontmatter, with strict validation and owner/tag/keyword filters
- `source/metadata.ts` -- YAML frontmatter parsing and validation
- `source/tree.ts` -- tree assembly, integrity checks, and rendering
- `source/prompts.ts` -- TypeBox-decoded embedded prompt catalog
- `source/help.ts` -- help tree and Markdown generated from the live Citty definitions
- `source/errors.ts` -- XDocsError class and invariant helper
- `source/types.ts` -- all TypeScript type definitions
- `source/agents.ts` -- explicit both-target skill operations and exact idempotent AGENTS/CLAUDE instruction actions
- `source/release-assets.ts` -- exact twelve binary plus two agent asset contract
- `source/commands/` -- focused adapters for domain, agent, upgrade, and uninstall commands
- `skills/guiho-s-xdocs/SKILL.md` -- the bundled versioned agent skill; shipped via `package.json` `files` and `jsr.json` include, read from disk at runtime
- `devops/install.sh` / `devops/install.ps1` -- direct native binary installers for users who do not want Node.js or Bun at runtime
- `DOCS.md` -- canonical full user-facing documentation for `@guiho/xdocs`; update it before every release with the same discipline as the changelog (ships via `package.json` `files`)

## Key Concepts

- xdocs descriptors use Markdown with YAML frontmatter and must be named `*.xdocs.md`; `.docs.md` is not supported and `.xdocs.md` by itself is invalid. Same-directory plain `*.md` files are companion documents listed in the descriptor's `documents` metadata. The root file is always `XDOCS.md` (uppercase, no prefix, no frontmatter). Use `xdocs meta [path] --documents --format json` when an agent needs descriptor and companion-document frontmatter without reading full Markdown bodies.
- Metadata fields: `subject`, `description`, `parent`, `children`, `files`, `documents`, `tags`, `keywords`, `flags`, and optional `status`.
- The tree is a parent-child containment hierarchy, not a dependency graph. Built from `subject`/`parent`/`children` fields.
- Configuration lives in `xdocs.yaml`. Sections: `extensions`, `ai`, `scan`, and `project`.
- Agent resource operations are always explicit and are not configuration-driven.
- AI mode (`ai.mode`): `"prompt"` (default, AI announces updates and waits) or `"auto"` (AI updates docs automatically).
- Runtime CLI dependencies: `citty` and `@sinclair/typebox`. YAML parsing uses `Bun.YAML.parse`.

## Gotchas

- There is no lint or formatter config. Existing TS uses strict `tsconfig.json`, single quotes, and no semicolons; match nearby style.
- Generated outputs (`library/`, `bundle/`, `bin/`, `vendor/`, `*.tgz`) are ignored; do not hand-edit them.
- Prompt files and the agent skill are embedded into native binaries and packaged as `guiho-i-xdocs` and `guiho-s-xdocs`. Skill mutation always addresses both supported tool paths.
- The skill frontmatter top-level `version` and `metadata.version` must match the package version for a release.
- Versioning is handled by `@guiho/mirror` via `mirror.config.toml`, not by xdocs itself. Do not confuse xdocs (documentation) with mirror (versioning).

## Semantic Project Versioning -- GUIHO Mirror

Invoke the guiho-s-mirror agent skill every time the user wants to bump, tag, release, plan, initialize, configure, or troubleshoot semantic project versioning with GUIHO Mirror.

Before editing release docs or changelogs, inspect mirror.config.toml. If [agents].write_changelog is false, skip changelog edits. If it is missing or true, changelog edits are allowed when the project has a changelog.

Use [agents].changelog_path as the changelog file path. If it is missing, use CHANGELOG.md in the project root.

Before publishing a new version, update `DOCS.md` -- the canonical full documentation for `@guiho/xdocs` -- to capture every behavior change in the release, written the same way as the changelog. Treat `DOCS.md` as a required release artifact: keep it current with CLI commands and flags, configuration fields, the metadata schema, the TypeScript API, and agent skill behavior. Do not publish when `DOCS.md` is stale relative to the shipping code.

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

Structured documentation package and CLI for @guiho/xdocs.

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
- Primary skills: guiho-s-xdocs, guiho-s-0015-bun
- Baseline checks: package-local typecheck/test scripts when present

### Coordination Rules

- This repository is a child of C:\GUIHO\guiho.
- Keep component-specific implementation tasks in the local TODO file.
- Keep cross-component planning and parent delegation in the parent TODO file.
- Read this component's existing local instructions before editing source code.
- Do not publish, deploy, run migrations, rotate secrets, or mutate production resources without explicit user approval.
