# Repository Notes

- `xdocs` is almost always written lowercase (CLI, code, text). Only capitalize as `XDocs` when used in a title or heading.
- The real package lives in `xdocs/`; run package commands there unless editing root docs or `devops/`.
- `@guiho/xdocs` is a Bun/TypeScript ESM CLI/library. The library entrypoint is `xdocs/source/guiho-xdocs.ts` and the CLI entrypoint is `xdocs/source/guiho-xdocs-bin.ts`; `tsc` emits `xdocs/library/` for `main`/`types`, and Bun compiles `xdocs/bin/` for the CLI binary.
- New library entrypoints must use the full library name instead of generic `index.ts` files. For XDocs v3, use `guiho-xdocs.ts`.
- Use Bun, not npm/pnpm/yarn. Install from `xdocs/` with `bun install`. Private `@guiho40` packages use Google Artifact Registry from `xdocs/.npmrc`; auth helper is `bun _gaa` or `bunx google-artifactregistry-auth`.

## Commands

- Typecheck: `cd xdocs && bun run typecheck`
- Test all: `cd xdocs && bun test`
- Test one file: `cd xdocs && bun test source/guiho-xdocs.spec.ts`
- Build library: `cd xdocs && bun run build` (writes ignored `xdocs/library/`)
- Compile CLI binary: `cd xdocs && bun run binary` (writes ignored `xdocs/bin/`)
- Dev mode: `cd xdocs && bun run dev` (watches and re-runs the CLI entrypoint)
- Avoid `bun _ci` and `bun clean-installation` unless intentionally resetting dependencies; they remove `node_modules` and `bun.lock`.

## CLI Behavior

- The xdocs CLI is a structured documentation tool, not a versioning tool. It does not bump versions or mutate `package.json` versions.
- Supported commands: `init`, `scan`, `generate`, `prompt`, `merge`, `tree`, `list`.
- `xdocs init` creates `XDOCS.md`, `xdocs.config.toml`, updates `AGENTS.md`, and installs agent skill files.
- `xdocs scan` walks the project tree (respecting `[scan].exclude`) and reports xdocs file coverage.
- `xdocs generate [path]` generates documentation for a specific directory or the entire project.
- `xdocs prompt --name=<name>` outputs a ready-made prompt for AI agents. Available prompts: `write`, `update`, `agents`, `generate`. Prompts are selected via `--name` flag, not subcommands.
- `xdocs merge [path]` merges xdocs files from a directory into a single consolidated document.
- `xdocs tree` builds and displays the project hierarchy from xdocs metadata.
- `xdocs list [path]` lists files in a scope with descriptions from xdocs metadata.
- Global flags: `--help`, `--version`, `--cwd <path>`, `--config <path>`, `--format <text|json|markdown>`, `--verbose`.

## Source Structure

- `xdocs/source/guiho-xdocs.ts` -- library entrypoint, re-exports all public API
- `xdocs/source/guiho-xdocs-bin.ts` -- CLI entrypoint
- `xdocs/source/cli.ts` -- CLI argument parsing and command dispatch
- `xdocs/source/config.ts` -- TOML config loading, validation, and defaults
- `xdocs/source/discovery.ts` -- filesystem scanning and xdocs file matching
- `xdocs/source/metadata.ts` -- YAML frontmatter parsing and validation
- `xdocs/source/tree.ts` -- tree assembly, integrity checks, and rendering
- `xdocs/source/prompts.ts` -- prompt loader (imports `.md` files as text via Bun)
- `xdocs/source/help.ts` -- help text and version display
- `xdocs/source/flags.ts` -- argument/flag parsing utilities
- `xdocs/source/errors.ts` -- XDocsError class and invariant helper
- `xdocs/source/types.ts` -- all TypeScript type definitions
- `xdocs/source/commands/` -- one file per CLI command (`init.ts`, `scan.ts`, `generate.ts`, `prompt.ts`, `merge.ts`, `tree.ts`, `list.ts`)
- `xdocs/prompts/` -- Markdown prompt templates (`write.md`, `update.md`, `agents.md`, `generate.md`); imported at build time and embedded in the binary

## Key Concepts

- xdocs files use Markdown with YAML frontmatter. Default extensions: `.docs.md`, `.xdocs.md`. The root file is always `XDOCS.md` (uppercase, no prefix).
- Metadata fields: `subject`, `description`, `parent`, `children`, `files`, `tags`, `flags`, and optional `status`.
- The tree is a parent-child containment hierarchy, not a dependency graph. Built from `subject`/`parent`/`children` fields.
- Configuration lives in `xdocs.config.toml`. Sections: `extensions`, `ai`, `scan`, `project`.
- AI mode (`ai.mode`): `"prompt"` (default, AI announces updates and waits) or `"auto"` (AI updates docs automatically).
- Dependencies: `smol-toml` (TOML parsing), `yaml` (YAML frontmatter parsing).

## Gotchas

- There is no lint or formatter config. Existing TS uses strict `tsconfig.json`, single quotes, and no semicolons; match nearby style.
- Generated outputs (`xdocs/library/`, `xdocs/bundle/`, `xdocs/bin/`, `*.tgz`) are ignored; do not hand-edit them.
- Prompt files in `xdocs/prompts/` are imported with `with { type: 'text' }` (Bun text imports). Each prompt `.md` file has its own YAML frontmatter with `name` and `description` fields. Adding a new prompt requires creating the `.md` file and adding an import in `xdocs/source/prompts.ts`.
- The `skills/` directory at the repository root holds agent skill templates for different AI tools (OpenCode, Claude Code, Codex, Jules). These are generated files, not code packages.
- Versioning is handled by `@guiho/mirror` via `xdocs/mirror.config.toml`, not by xdocs itself. Do not confuse xdocs (documentation) with mirror (versioning).

<!-- BEGIN AGENT KANBAN — DO NOT EDIT THIS SECTION -->
## Agent Kanban

Read `.agentkanban/INSTRUCTION.md` for task workflow rules.
Read `.agentkanban/memory.md` for project context.

If a task file (`.agentkanban/tasks/**/*.md`) was referenced earlier in this conversation, re-read it before responding and always respond in and at the end the task file.
<!-- END AGENT KANBAN -->

## Semantic Project Versioning -- GUIHO Mirror

Invoke the guiho-as-mirror agent skill every time the user wants to bump, tag, release, plan, initialize, configure, or troubleshoot semantic project versioning with GUIHO Mirror.

Before editing release docs or changelogs, inspect mirror.config.toml. If [agents].write_changelog is false, skip changelog edits. If it is missing or true, changelog edits are allowed when the project has a changelog.

Use [agents].changelog_path as the changelog file path. If it is missing, use CHANGELOG.md in the project root.

