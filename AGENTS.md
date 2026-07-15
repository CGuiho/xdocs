# Repository Notes

## Agent

Always read this: /c/GUIHO/superiority/agents/guiho-a-0001-swe.AGENTS.md (C:\GUIHO\superiority\agents\guiho-a-0001-swe.AGENTS.md)
Stop if you can not find it.


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
- Supported commands: `init`, `scan`, `generate`, `prompt`, `merge`, `tree`, `list`, `meta`, `context`, `doctor`, `agents`, `upgrade`, `uninstall`.
- `xdocs init` creates `XDOCS.md`, `xdocs.config.toml`, updates `AGENTS.md` (the xdocs section pointing AI at the skill), and installs or refreshes the `guiho-s-xdocs` skill to the standard location (`.agents/skills`); `--tool` and `--global` are supported.
- `xdocs scan` walks the project tree (respecting `[scan].exclude`) and reports named `*.xdocs.md` descriptor coverage plus same-directory Markdown companion-document coverage.
- `xdocs generate [path]` generates documentation for a specific directory or the entire project.
- `xdocs prompt --name=<name>` outputs a ready-made prompt for AI agents. Available prompts: `write`, `update`, `agents`, `generate`. Prompts are selected via `--name` flag, not subcommands.
- `xdocs merge [path]` merges xdocs descriptors from a directory into a single consolidated document.
- `xdocs tree` builds and displays the project hierarchy from xdocs metadata.
- `xdocs list [path]` lists files in a scope with descriptions from xdocs metadata.
- `xdocs meta [path]` scans top-down and reads only YAML frontmatter from named `*.xdocs.md` descriptors; `--documents` also reads associated companion `.md` frontmatter, while `--owner`, `--tag`, and `--keyword` filter metadata before agents read full files.
- `xdocs context <query> [path]` recommends a minimal reading set for a task from descriptor, file, and companion-document metadata; use `--documents`, `--files`, `--limit`, and `--explain` for agent workflows.
- `xdocs doctor [path]` runs CI-friendly health checks for descriptor validity, companion-document metadata, tree integrity, and documented file existence.
- `xdocs agents install <local|global> [--tool <agents|claude|all>]` installs or refreshes the `guiho-s-xdocs` skill; `xdocs agents instructions` inserts/refreshes the xdocs section in `AGENTS.md`.
- Skill install is standard-first: the default `agents` target is `AGENTS.md` + `.agents/skills` (local) / `~/.agents/skills` (global). The non-standard `claude` target (`.claude/skills`) is used only when `--tool` requests it or a `.claude`/`CLAUDE.md` is detected. Codex, Jules, and other AGENTS.md tools read the standard target.
- A bare `xdocs` invocation and data commands (`scan`, `generate`, `merge`, `tree`, `list`, `meta`, `context`, `doctor`) run agent automation first: global skill refresh uses the standard `agents` target without config, and when an `xdocs.config.toml` is present, `[agents].auto_agents_md` keeps the AGENTS.md section fresh while `[agents].auto_skill_install` / `[agents].skill_tool` control global skill refresh from the bundled copy. Refresh removes legacy `guiho-as-xdocs` installs for that target.
- Citty owns CLI parsing, nested command routing, aliases, enum/required-value validation, and ordinary `--help` usage. `source/cli.ts` defines the single declarative command tree and adapts typed Citty values to focused command-handler inputs; do not reintroduce a handwritten parser or switch router.
- Global flags: `--help`, `--help-tree`, `--help-docs`, `--version`, `--cwd <path>`, `--config <path>`, `--format <text|json|markdown>`, `--verbose`.

## Source Structure

- `source/guiho-xdocs.ts` -- library entrypoint, re-exports all public API
- `source/guiho-xdocs-bin.ts` -- CLI entrypoint
- `source/guiho-xdocs-native-bin.ts` -- Bun-compiled native binary entrypoint; registers embedded prompt/skill/package resources before importing the CLI
- `source/embedded-resources.ts` -- Bun text imports used only for native binary embedding
- `scripts/xdocs-bin.ts` -- shipped Bun launcher used as the package `bin`; delegates to a native binary when present, falls back to source in checkouts, and installs the native binary on first run for published packages
- `scripts/install-package.ts` -- package-manager install helper that downloads or copies the matching native binary into `vendor/`
- `source/cli.ts` -- single declarative Citty command tree, library-safe `runCli(rawArgs)`, config-gated automation, extended-help routing, contextual usage errors, and process-facing error handling
- `source/config.ts` -- TOML config loading, validation, and defaults
- `source/context.ts` -- deterministic reading-set recommendation from xdocs metadata for `xdocs context`
- `source/doctor.ts` -- CI-friendly xdocs health checks for descriptors, companion metadata, tree links, and documented files
- `source/discovery.ts` -- filesystem scanning, xdocs descriptor matching, companion Markdown discovery, and descriptor/document validation
- `source/meta.ts` -- metadata-only top-down scanner for descriptor and companion-document frontmatter, with strict validation and owner/tag/keyword filters
- `source/metadata.ts` -- YAML frontmatter parsing and validation
- `source/tree.ts` -- tree assembly, integrity checks, and rendering
- `source/prompts.ts` -- prompt loader (reads `.md` files from disk at runtime via `import.meta.url`)
- `source/help.ts` -- extended help-tree/Markdown help records, public help helpers, package-version reads, and version display; ordinary command usage comes from Citty
- `source/errors.ts` -- XDocsError class and invariant helper
- `source/types.ts` -- all TypeScript type definitions
- `source/agents.ts` -- skill install (local/global, multi-tool), legacy skill-name removal, version/content refresh, AGENTS.md section, config-gated automation; reads `skills/guiho-s-xdocs/SKILL.md` from disk at runtime (`readFileSync` via `import.meta.url`)
- `source/commands/` -- one file per CLI command (`init.ts`, `scan.ts`, `generate.ts`, `prompt.ts`, `merge.ts`, `tree.ts`, `list.ts`, `meta.ts`, `context.ts`, `doctor.ts`, `agents.ts`, `upgrade.ts`, `uninstall.ts`)
- `skills/guiho-s-xdocs/SKILL.md` -- the bundled versioned agent skill; shipped via `package.json` `files` and `jsr.json` include, read from disk at runtime
- `devops/install.sh` / `devops/install.ps1` -- direct native binary installers for users who do not want Node.js or Bun at runtime
- `DOCS.md` -- canonical full user-facing documentation for `@guiho/xdocs`; update it before every release with the same discipline as the changelog (ships via `package.json` `files`)

## Key Concepts

- xdocs descriptors use Markdown with YAML frontmatter and must be named `*.xdocs.md`; `.docs.md` is not supported and `.xdocs.md` by itself is invalid. Same-directory plain `*.md` files are companion documents listed in the descriptor's `documents` metadata. The root file is always `XDOCS.md` (uppercase, no prefix, no frontmatter). Use `xdocs meta [path] --documents --format json` when an agent needs descriptor and companion-document frontmatter without reading full Markdown bodies.
- Metadata fields: `subject`, `description`, `parent`, `children`, `files`, `documents`, `tags`, `keywords`, `flags`, and optional `status`.
- The tree is a parent-child containment hierarchy, not a dependency graph. Built from `subject`/`parent`/`children` fields.
- Configuration lives in `xdocs.config.toml`. Sections: `extensions`, `ai`, `scan`, `project`, `agents`.
- Agent automation (`[agents]`): `auto_agents_md` (keep the AGENTS.md section fresh), `auto_skill_install` (install or refresh the configured global skill from the bundled copy), and `skill_tool` (default install target: `agents` standard, or `claude`). All default on / `agents`.
- AI mode (`ai.mode`): `"prompt"` (default, AI announces updates and waits) or `"auto"` (AI updates docs automatically).
- Runtime CLI dependency: `citty`. Descriptor/config content parsing remains dependency-free through Bun-native `Bun.TOML.parse` and `Bun.YAML.parse`.

## Gotchas

- There is no lint or formatter config. Existing TS uses strict `tsconfig.json`, single quotes, and no semicolons; match nearby style.
- Generated outputs (`library/`, `bundle/`, `bin/`, `vendor/`, `*.tgz`) are ignored; do not hand-edit them.
- Prompt files in `prompts/` are read from disk at runtime (`readFileSync` relative to `import.meta.url`) so the compiled library runs under Node and Bun; they ship via `package.json` `files`. Each prompt `.md` file has YAML frontmatter with `name` and `description`. Adding a new prompt requires creating the `.md` file and adding its name to `PROMPT_NAMES` in `source/prompts.ts`.
- The shipped agent skill lives at `skills/guiho-s-xdocs/SKILL.md` and is read from disk at runtime (`readFileSync` relative to `import.meta.url`) in `source/agents.ts`; it ships via `package.json` `files` and `jsr.json` `publish.include`. `xdocs agents install` writes it into the standard `.agents/skills` directory by default, and into `.claude/skills` only when the non-standard claude target is requested or detected. Installs remove the legacy `guiho-as-xdocs` skill directory and replace `guiho-s-xdocs` when the bundled version or content differs. The skill frontmatter keeps the legacy top-level `version` plus `metadata.version`; both must match the current package version when preparing a release.
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
