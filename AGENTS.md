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
- Supported commands: `init`, `scan`, `generate`, `prompt`, `merge`, `tree`, `list`, `agents`.
- `xdocs init` creates `XDOCS.md`, `xdocs.config.toml`, updates `AGENTS.md` (the xdocs section pointing AI at the skill), and installs the `guiho-as-xdocs` skill to the standard location (`.agents/skills`); `--tool` and `--global` are supported.
- `xdocs scan` walks the project tree (respecting `[scan].exclude`) and reports xdocs file coverage.
- `xdocs generate [path]` generates documentation for a specific directory or the entire project.
- `xdocs prompt --name=<name>` outputs a ready-made prompt for AI agents. Available prompts: `write`, `update`, `agents`, `generate`. Prompts are selected via `--name` flag, not subcommands.
- `xdocs merge [path]` merges xdocs files from a directory into a single consolidated document.
- `xdocs tree` builds and displays the project hierarchy from xdocs metadata.
- `xdocs list [path]` lists files in a scope with descriptions from xdocs metadata.
- `xdocs agents install <local|global> [--tool <agents|claude|all>]` installs the `guiho-as-xdocs` skill; `xdocs agents instructions` inserts/refreshes the xdocs section in `AGENTS.md`.
- Skill install is standard-first: the default `agents` target is `AGENTS.md` + `.agents/skills` (local) / `~/.agents/skills` (global). The non-standard `claude` target (`.claude/skills`) is used only when `--tool` requests it or a `.claude`/`CLAUDE.md` is detected. Codex, Jules, and other AGENTS.md tools read the standard target.
- Data commands (`scan`, `generate`, `merge`, `tree`, `list`) run config-gated agent automation first: when an `xdocs.config.toml` is present, `[agents].auto_agents_md` keeps the AGENTS.md section fresh and `[agents].auto_skill_install` installs the global skill if missing.
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
- `xdocs/source/agents.ts` -- skill install (local/global, multi-tool), AGENTS.md section, config-gated automation; reads `skills/guiho-as-xdocs/SKILL.md` from disk at runtime (`readFileSync` via `import.meta.url`)
- `xdocs/source/commands/` -- one file per CLI command (`init.ts`, `scan.ts`, `generate.ts`, `prompt.ts`, `merge.ts`, `tree.ts`, `list.ts`, `agents.ts`)
- `xdocs/prompts/` -- Markdown prompt templates (`write.md`, `update.md`, `agents.md`, `generate.md`); imported at build time and embedded in the binary
- `xdocs/skills/guiho-as-xdocs/SKILL.md` -- the bundled agent skill; shipped via `package.json` `files` and `jsr.json` include, read from disk at runtime
- `xdocs/DOCS.md` -- canonical full user-facing documentation for `@guiho/xdocs`; update it before every release with the same discipline as the changelog (ships via `package.json` `files`)

## Key Concepts

- xdocs files use Markdown with YAML frontmatter. Default extensions: `.docs.md`, `.xdocs.md`. The root file is always `XDOCS.md` (uppercase, no prefix).
- Metadata fields: `subject`, `description`, `parent`, `children`, `files`, `tags`, `flags`, and optional `status`.
- The tree is a parent-child containment hierarchy, not a dependency graph. Built from `subject`/`parent`/`children` fields.
- Configuration lives in `xdocs.config.toml`. Sections: `extensions`, `ai`, `scan`, `project`, `agents`.
- Agent automation (`[agents]`): `auto_agents_md` (keep the AGENTS.md section fresh), `auto_skill_install` (install the global skill when missing), and `skill_tool` (default install target: `agents` standard, or `claude`). All default on / `agents`.
- AI mode (`ai.mode`): `"prompt"` (default, AI announces updates and waits) or `"auto"` (AI updates docs automatically).
- Dependencies: `smol-toml` (TOML parsing), `yaml` (YAML frontmatter parsing).

## Gotchas

- There is no lint or formatter config. Existing TS uses strict `tsconfig.json`, single quotes, and no semicolons; match nearby style.
- Generated outputs (`xdocs/library/`, `xdocs/bundle/`, `xdocs/bin/`, `*.tgz`) are ignored; do not hand-edit them.
- Prompt files in `xdocs/prompts/` are read from disk at runtime (`readFileSync` relative to `import.meta.url`) so the compiled library runs under Node and Bun; they ship via `package.json` `files`. Each prompt `.md` file has YAML frontmatter with `name` and `description`. Adding a new prompt requires creating the `.md` file and adding its name to `PROMPT_NAMES` in `xdocs/source/prompts.ts`.
- The shipped agent skill lives at `xdocs/skills/guiho-as-xdocs/SKILL.md` (inside the package) and is read from disk at runtime (`readFileSync` relative to `import.meta.url`) in `xdocs/source/agents.ts`; it ships via `package.json` `files` and `jsr.json` `publish.include`. `xdocs agents install` writes it into the standard `.agents/skills` directory by default, and into `.claude/skills` only when the non-standard claude target is requested or detected.
- The empty `skills/` directory at the repository root is a placeholder; the canonical skill source is the package-internal `xdocs/skills/`.
- Versioning is handled by `@guiho/mirror` via `xdocs/mirror.config.toml`, not by xdocs itself. Do not confuse xdocs (documentation) with mirror (versioning).

## Semantic Project Versioning -- GUIHO Mirror

Invoke the guiho-as-mirror agent skill every time the user wants to bump, tag, release, plan, initialize, configure, or troubleshoot semantic project versioning with GUIHO Mirror.

Before editing release docs or changelogs, inspect mirror.config.toml. If [agents].write_changelog is false, skip changelog edits. If it is missing or true, changelog edits are allowed when the project has a changelog.

Use [agents].changelog_path as the changelog file path. If it is missing, use CHANGELOG.md in the project root.

Before publishing a new version, update `xdocs/DOCS.md` -- the canonical full documentation for `@guiho/xdocs` -- to capture every behavior change in the release, written the same way as the changelog. Treat `DOCS.md` as a required release artifact: keep it current with CLI commands and flags, configuration fields, the metadata schema, the TypeScript API, and agent skill behavior. Do not publish when `DOCS.md` is stale relative to the shipping code.

