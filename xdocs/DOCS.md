# GUIHO XDocs Documentation -- @guiho/xdocs

GUIHO XDocs is a deterministic CLI and TypeScript library for structured documentation of codebases. Each directory carries a small Markdown file with YAML frontmatter that describes its subject, purpose, files, and place in a parent-child hierarchy, so an AI agent (or a human) can understand a project without reading every source file.

```text
source tree -> xdocs files (.docs.md / .xdocs.md) -> tree + metadata -> AI-readable map
```

XDocs is a documentation tool, not a versioning tool. It never bumps versions or mutates `package.json` version fields. Versioning for this project is handled separately by GUIHO Mirror.

## Package Overview

- Package name: `@guiho/xdocs`
- Runtime target: Bun (ESM)
- Package type: ESM
- Library entrypoint: `source/guiho-xdocs.ts`
- CLI entrypoint: `source/guiho-xdocs-bin.ts`
- TypeScript build output: `library/` (used by `main` and `types`)
- Standalone binary output: `bin/xdocs` or `bin/xdocs.exe`
- Dependencies: `smol-toml` (TOML config parsing), `yaml` (YAML frontmatter parsing)

The public package exposes a CLI named `xdocs` and a TypeScript API for discovering xdocs files, parsing metadata, building the hierarchy tree, generating documentation, and installing the agent skill.

## Core Model

XDocs describes a project as a containment hierarchy of documented modules.

- Project: the repository or directory being documented.
- xdocs file: a Markdown file with YAML frontmatter that documents one directory/module.
- Root file: `XDOCS.md` (uppercase, no prefix) at the project root, the top of the tree.
- Tree: a parent-child containment hierarchy (not a dependency graph) assembled from each file's `subject` / `parent` / `children` fields.
- AI mode: how an agent should behave when documentation needs updating, configured by `[ai].mode`.

The tree is the main mental model. A module's xdocs file names the module (`subject`), points up to its container (`parent`), and lists the modules it contains (`children`). Reading metadata first, and the body only when needed, lets an agent navigate a project cheaply.

## xdocs Files and Metadata

An xdocs file is Markdown with a YAML frontmatter block delimited by `---`. The body below the frontmatter is free-form Markdown.

```markdown
---
subject: auth
description: Authentication and session handling.
parent: src
children:
  - login
  - register
files:
  login.ts: Email/password login handler.
  session.ts: Session creation and validation.
tags:
  - security
flags: []
status: stable
---

Longer prose about the module goes here.
```

Frontmatter fields:

| Field         | Type                | Meaning                                                       |
| ------------- | ------------------- | ------------------------------------------------------------ |
| `subject`     | string              | Unique identifier/name of this module in the tree.           |
| `description` | string              | One-line summary of what the module does.                    |
| `parent`      | string \| null      | `subject` of the containing module (`null` for the root).    |
| `children`    | string[]            | `subject`s of directly contained modules.                    |
| `files`       | map<string,string>  | Filename -> short description of each significant file.       |
| `tags`        | string[]            | Free-form classification labels.                             |
| `flags`       | string[]            | Behavioral markers for tools/agents.                         |
| `status`      | string (optional)   | Lifecycle marker, for example `stable`, `draft`, `deprecated`. |

Keep `subject` values unique across the project, keep `parent`/`children` consistent in both directions, and keep `files` in sync with what is on disk.

## File Discovery and Extensions

XDocs discovers documentation files by extension. The default recognized extensions are `.docs.md` and `.xdocs.md`, configurable in `[extensions].supported`. The root `XDOCS.md` is always recognized.

Scanning walks the project tree and skips directories listed in `[scan].exclude`. The default exclusions are `node_modules`, `.git`, `dist`, `build`, `library`, `bin`, and `bundle`.

## Installation

Install XDocs as a development dependency:

```bash
bun add -d @guiho/xdocs
```

Or with npm:

```bash
npm install -D @guiho/xdocs
```

Use the CLI through the package manager or through the installed `xdocs` binary.

## Quick Start

Initialize XDocs in a project:

```bash
xdocs init
```

Report documentation coverage:

```bash
xdocs scan
```

Show the module hierarchy:

```bash
xdocs tree
```

Draft documentation for a directory:

```bash
xdocs generate ./src/auth
```

Print a ready-made AI prompt:

```bash
xdocs prompt --name=write
```

## CLI Reference

### Global Flags

- `-h`, `--help`: Show help for the CLI or a command.
- `-v`, `--version`: Show the xdocs version.
- `--cwd <path>`: Run as if XDocs started in this directory.
- `--config <path>`: Use an explicit `xdocs.config.toml` path.
- `--format <text|json|markdown>`: Output format (command-dependent; defaults to `text`).
- `--verbose`: Show detailed output, including tree validation warnings.

### `xdocs init`

Initializes XDocs in a project. It:

- Creates `xdocs.config.toml` with defaults (skips if it already exists).
- Creates the root `XDOCS.md` (skips if it already exists).
- Updates `AGENTS.md` with the xdocs section that points AI agents at the `guiho-as-xdocs` skill (creates `AGENTS.md` if absent; refreshes the section in place if present).
- Installs the `guiho-as-xdocs` skill to the standard `.agents/skills` location.

```bash
xdocs init
xdocs init --tool all        # also install non-standard targets explicitly
xdocs init --global          # install the skill under the user home directory
```

Flags: `--tool <agents|claude|all>`, `--global`, `--cwd`, `--verbose`.

### `xdocs scan`

Walks every directory (respecting `[scan].exclude`), matches files against the configured extensions, and reports coverage: total files, total directories, covered vs uncovered directories, and the discovered xdocs files with validity status. Use `--verbose` to list per-file errors and uncovered directories.

```bash
xdocs scan
xdocs scan --format json
```

Flags: `--format <text|json>`, `--cwd`, `--config`, `--verbose`.

### `xdocs generate [path]`

Generates Markdown documentation. With no path, it produces a project-level document containing the hierarchy and a section per module. With a path, it produces a module-level document for that directory. Output goes to stdout unless `--output <path>` is given.

```bash
xdocs generate                       # whole project to stdout
xdocs generate ./src/auth            # one module to stdout
xdocs generate --output PROJECT.md   # write to a file
```

Flags: `--output <path>`, `--cwd`, `--config`, `--verbose`.

### `xdocs merge [path]`

Concatenates all xdocs files within a directory into a single Markdown document, each section prefixed with a `<!-- source: ... -->` marker. Output goes to stdout unless `--output <path>` is given.

```bash
xdocs merge ./src/domain
xdocs merge ./src/domain --output DOMAIN.md
```

Flags: `--output <path>`, `--cwd`, `--config`, `--verbose`.

### `xdocs tree`

Scans all xdocs files, reads their metadata, and assembles the parent-child hierarchy (modules only, not individual files). With `--verbose`, tree integrity warnings and errors (duplicate subjects, orphans, missing children) are printed to stderr.

```bash
xdocs tree
xdocs tree --format markdown
xdocs tree --format json --output tree.json
```

Flags: `--format <text|markdown|json>`, `--output <path>`, `--cwd`, `--config`, `--verbose`.

### `xdocs list [path]`

Lists every documented file in a scope with a short description pulled from the `files` metadata field.

```bash
xdocs list
xdocs list ./src/auth
xdocs list --format json
```

Flags: `--format <text|json>`, `--cwd`, `--config`.

### `xdocs prompt --name=<name>`

Outputs a ready-made, self-contained instruction prompt for an AI agent. The prompt is printed to stdout for piping into an agent.

Available prompts:

- `write`: Scan a directory and write xdocs documentation.
- `update`: Update existing xdocs files after code changes.
- `agents`: Update `AGENTS.md` with xdocs instructions.
- `generate`: Generate comprehensive documentation.

```bash
xdocs prompt --name=write
xdocs prompt --name update
```

Both `--name=value` and `--name value` forms are supported.

### `xdocs agents`

Installs the `guiho-as-xdocs` agent skill and maintains the `AGENTS.md` instruction section.

```bash
xdocs agents install local            # install under the project (.agents/skills)
xdocs agents install global           # install under ~/.agents/skills
xdocs agents install local --tool claude   # explicit non-standard Claude target
xdocs agents install local --tool all      # standard + claude
xdocs agents instructions             # insert/refresh the AGENTS.md section
```

- `install local`: Writes the skill under the current project's skills directory.
- `install global`: Writes the skill under the user home skills directory.
- `instructions`: Creates or refreshes the xdocs section in `AGENTS.md`.

Flags: `--tool <agents|claude|all>`, `--format <text|json>`, `--cwd`.

When `--tool` is omitted, XDocs installs the standard target and adds the Claude target only when a `.claude/` directory or `CLAUDE.md` is detected in the project. Global skill installation uses the user home directory; tests and automation can override that home root with `XDOCS_AGENT_HOME`.

## Configuration Reference

XDocs discovers configuration in this order:

1. Explicit `--config <path>`
2. `xdocs.config.toml` in the effective current working directory
3. `config/xdocs.config.toml` in the effective current working directory

Root configuration takes precedence over the nested `config/xdocs.config.toml`.

Full configuration example:

```toml
schema = 1

[extensions]
supported = [".docs.md", ".xdocs.md"]

[ai]
mode = "prompt"

[scan]
exclude = ["node_modules", ".git", "dist", "build", "library", "bin", "bundle"]

[project]
name = "my-project"

[agents]
auto_agents_md = true
auto_skill_install = true
skill_tool = "agents"
```

### `schema`

Optional. When present, must be `1`.

### `[extensions]`

- `supported`: Array of file extensions recognized as xdocs files. Default: `[".docs.md", ".xdocs.md"]`.

### `[ai]`

- `mode`: How an AI agent handles documentation updates. `"prompt"` (default) means the agent announces the updates it would make and waits for confirmation; `"auto"` means the agent updates documentation immediately.

### `[scan]`

- `exclude`: Array of directory names to skip while scanning. Default: `["node_modules", ".git", "dist", "build", "library", "bin", "bundle"]`.

### `[project]`

- `name`: Project name used in the root `XDOCS.md` and tree output. Defaults to the current directory name.

### `[agents]`

Agent settings control skill installation and the automation that runs on data commands.

- `auto_agents_md`: Keep the `AGENTS.md` xdocs section fresh on normal commands when `AGENTS.md` already exists. Default: `true`.
- `auto_skill_install`: Install the standard skill globally when it is missing. Default: `true`.
- `skill_tool`: Default target for auto-install. Supported values are `agents` (standard) and `claude`. Default: `agents`.

## Agent Skills and Automation

XDocs ships the `guiho-as-xdocs` skill inside the package at `skills/guiho-as-xdocs/SKILL.md`. The skill is a large, on-demand instruction document; a small section in `AGENTS.md` tells an agent to load it.

Installation is standard-first:

| Target                    | Skill location                              | When installed                                                  |
| ------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| `agents` (standard)       | `.agents/skills/guiho-as-xdocs/SKILL.md`    | Always (default). Read by OpenCode, Codex, Jules, and any AGENTS.md tool. |
| `claude` (non-standard)   | `.claude/skills/guiho-as-xdocs/SKILL.md`    | Only when requested via `--tool`, or detected (a `.claude/` directory or `CLAUDE.md`). |

`local` scope installs under the project root; `global` scope installs under the user home directory (`~/.agents/skills/...`).

The rule is: default to the standard target. Only write non-standard files (`.claude`, `CLAUDE.md`, etc.) when the user asks for them or when those files already exist.

### Automation

When an `xdocs.config.toml` is present, the data commands (`scan`, `generate`, `merge`, `tree`, `list`) run config-gated agent automation before executing:

- If `auto_agents_md` is true and `AGENTS.md` exists, the xdocs section is kept fresh.
- If `auto_skill_install` is true and the global skill is missing, XDocs installs it for the configured `skill_tool` and prints a one-line notice to stderr.

Automation does nothing outside an xdocs project (no config discovered). `init` and `agents` do not run this automation; they manage agent files explicitly.

## AI Usage Workflow

The intended agent workflow with XDocs:

1. On entering a project, read `XDOCS.md`, run `xdocs tree`, and run `xdocs scan` to understand the structure and coverage.
2. On navigating to a module, read that module's xdocs file (frontmatter first, body only if needed) instead of reading every source file.
3. On modifying code, respect `[ai].mode`: in `prompt` mode announce which xdocs files need updating and wait; in `auto` mode update them immediately.
4. On creating a module, write a new xdocs file with correct metadata and update the parent's `children`.
5. On request, use `xdocs generate`, `xdocs merge`, and `xdocs tree` to produce documentation artifacts.

## Prompts

Prompt templates live in `prompts/*.md` and are embedded at build time via Bun text imports. Each prompt file has its own YAML frontmatter with `name` and `description`. The CLI exposes them through `xdocs prompt --name=<name>`. Available names: `write`, `update`, `agents`, `generate`.

## TypeScript API

XDocs exports types and functions from `source/guiho-xdocs.ts`.

Discovery and tree:

```ts
import { loadConfigOrDefaults, scanProject, buildTree, renderTree } from '@guiho/xdocs'

const config = await loadConfigOrDefaults({ cwd: process.cwd(), format: 'text', verbose: false })
const scan = await scanProject(config)
const tree = buildTree(scan.xdocsFiles)

console.log(renderTree(tree))
```

Metadata parsing:

```ts
import { extractFrontmatter, parseXDocsFile, validateMetadata } from '@guiho/xdocs'
```

Agent skill and AGENTS.md automation:

```ts
import { installSkill, ensureAgentsInstructions, runAgentAutomation } from '@guiho/xdocs'

await installSkill('agents', 'local', { cwd: process.cwd() })
await ensureAgentsInstructions(process.cwd(), true)
await runAgentAutomation({ cwd: process.cwd(), format: 'text', verbose: false })
```

Configuration:

```ts
import { discoverConfig, loadConfig, defaultConfig, normalizeConfig } from '@guiho/xdocs'
```

The API uses the same configuration discovery and validation as the CLI.

## Internal Source Map

- `source/guiho-xdocs.ts`: public library export surface.
- `source/guiho-xdocs-bin.ts`: CLI binary entrypoint.
- `source/cli.ts`: argument parsing, command dispatch, config-gated automation, and process-facing error handling.
- `source/config.ts`: TOML discovery, schema validation, defaulting, default config generation, and agent-settings normalization.
- `source/discovery.ts`: filesystem scanning and xdocs file matching.
- `source/metadata.ts`: YAML frontmatter extraction and metadata validation.
- `source/tree.ts`: tree assembly, integrity checks, and rendering (text, markdown).
- `source/prompts.ts`: prompt loader (imports `prompts/*.md` as text via Bun).
- `source/help.ts`: help text and version display.
- `source/flags.ts`: argument/flag parsing utilities.
- `source/errors.ts`: `XDocsError` with stable exit codes and the `invariant` helper.
- `source/types.ts`: public and internal TypeScript types.
- `source/agents.ts`: agent skill installation (standard/claude, local/global), AGENTS.md section management, detection, and config-gated automation. Embeds `skills/guiho-as-xdocs/SKILL.md` via a Bun text import.
- `source/commands/*.ts`: one file per CLI command (`init`, `scan`, `generate`, `prompt`, `merge`, `tree`, `list`, `agents`).
- `prompts/*.md`: prompt templates embedded at build time.
- `skills/guiho-as-xdocs/SKILL.md`: bundled AI-agent skill installed by `xdocs agents` commands.

## Development Workflow

Run package commands from `xdocs/`.

```bash
bun install
bun run typecheck
bun test
bun run build
bun run binary
```

Generated outputs are ignored and should not be hand-edited.

- `library/`: TypeScript build output used by `main` and `types`.
- `bin/`: compiled standalone CLI binary output.
- `bundle/`: optional bundled output.

There is no lint or formatter config. Existing source style is strict TypeScript, ESM imports, single quotes, and no semicolons.

## Testing

The test suite uses `bun test` and `bun:test`.

Current tests cover:

- CLI flag parsing and short aliases.
- YAML frontmatter extraction and metadata validation.
- Tree construction, rendering, and integrity validation.
- Config discovery, validation, and defaulting.
- Agent settings normalization, skill path resolution, skill installation (local/global), tool detection, and AGENTS.md section insertion.

Run all tests:

```bash
bun test
```

Run one file:

```bash
bun test source/guiho-xdocs.spec.ts
```

## Build and Binary

Build the library:

```bash
bun run build
```

Compile the standalone binary:

```bash
bun run binary
```

The compiled binary embeds the prompt templates and the `guiho-as-xdocs` skill via Bun text imports, so `xdocs prompt` and `xdocs agents install` work without adjacent package files.

## Documentation Requirement Before Publishing

This file (`DOCS.md`) is the canonical, full documentation for `@guiho/xdocs`. It must describe the behavior that actually ships.

Before publishing a new version, update `DOCS.md` the same way a changelog entry is written: capture every behavior change in this release. This includes changes to CLI commands and flags, configuration fields, the metadata schema, the TypeScript API, agent skill installation and automation, package contents, and operational workflows.

Treat `DOCS.md` as a release artifact. If a code change does not require a documentation update, the release preparation should still state why none was needed. Do not publish a new version when `DOCS.md` is stale relative to the code being released.

## Publishing Checklist

Before publishing a new version:

1. Confirm intended changes are committed.
2. Update `DOCS.md` to reflect all changed behavior.
3. Update the changelog (`../CHANGELOG.md`) and other relevant docs (`README.md`, `ARCHITECTURE.md`, `AGENTS.md`) when applicable.
4. Run `bun run typecheck`.
5. Run `bun test`.
6. Run `bun run build`.
7. Run `bun run binary` when the CLI binary is part of release validation.
8. Build the Mirror release plan: `bun x @guiho/mirror version plan <target>`.
9. Commit release-documentation updates before applying the version bump.
10. Apply the bump with GUIHO Mirror: `bun x @guiho/mirror version apply <target> --yes`.

Versioning itself is handled by GUIHO Mirror via `mirror.config.toml`; XDocs never edits version fields directly.

## Troubleshooting

### Configuration not found

Run `xdocs init` from the project root, or pass `--config <path>`.

### A directory shows as uncovered

Add an xdocs file (`.docs.md` or `.xdocs.md`) to the directory, or adjust `[extensions].supported`. Confirm the directory is not in `[scan].exclude`.

### Tree warnings or errors

Run `xdocs tree --verbose`. Resolve duplicate `subject` values, orphaned modules (a `parent` that does not exist), and `children` that reference missing subjects. Every `subject` must be unique and every parent/child link must be consistent in both directions.

### The skill was not installed where expected

The standard target is `.agents/skills` (or `~/.agents/skills` for `--global`). The Claude target (`.claude/skills`) is only used with `--tool claude`/`all` or when a `.claude/` directory or `CLAUDE.md` is detected. Use `XDOCS_AGENT_HOME` to redirect the global home in tests.

### A normal command modified AGENTS.md or installed a global skill unexpectedly

That is the config-gated automation. Set `[agents].auto_agents_md = false` to stop AGENTS.md edits, and `[agents].auto_skill_install = false` to stop global skill installation.

### Prompt not found

Run `xdocs prompt` with one of the supported names: `write`, `update`, `agents`, or `generate`.
