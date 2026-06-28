---
name: guiho-s-xdocs
version: 0.3.0-alpha.2
description: Use this skill whenever the user works with xdocs (`@guiho/xdocs`) structured documentation, AND proactively whenever you create a new module or subdirectory or add/change/remove files in a directory of an xdocs project, so you create or update that directory's `.xdocs.md` as part of the change. This includes creating, updating, or regenerating `.docs.md` / `.xdocs.md` files, the root `XDOCS.md`, the project tree, scanning documentation coverage, merging docs, or maintaining xdocs metadata and AGENTS.md guidance, even when the user only says "document this module", "update the docs", or "what does this folder do" without naming xdocs.
---

# GUIHO XDocs

GUIHO XDocs is a deterministic CLI and TypeScript library for **structured documentation of codebases**. It lets an AI agent understand a project without reading every source file: each directory carries a small Markdown file with YAML frontmatter that describes its subject, purpose, files, and place in a parent-child hierarchy.

```text
source tree -> xdocs files (.docs.md / .xdocs.md) -> tree + metadata -> AI-readable map
```

Use xdocs for documentation work instead of ad hoc README sprawl or re-reading the whole codebase. The value of xdocs is that the structure (subjects, descriptions, files, parent/child links) is machine-readable and stays close to the code it describes.

## Command Selection

Choose the xdocs command in this order:

1. Use `bun @guiho/xdocs` when the package is installed locally and Bun is available.
2. Use `xdocs` when a global binary is available.
3. Use `bunx @guiho/xdocs` when running without installation.

When unsure, run a cheap availability check (`bun @guiho/xdocs --help`, `xdocs --help`, or `bunx @guiho/xdocs --help`) and then reuse the working command consistently. Run `xdocs --help` or `xdocs <command> --help` for command-specific details when needed.

xdocs is a Bun/TypeScript ESM tool. Bun is the recommended runtime. The CLI never bumps versions or mutates `package.json` — it only reads and writes documentation files. (Versioning is a separate concern handled by GUIHO Mirror.)

## Core Concepts

- **xdocs file**: a Markdown file with YAML frontmatter that documents one directory/module. Default extensions are `.docs.md` and `.xdocs.md`. Extensions are configurable in `xdocs.config.toml`.
- **Repository root index**: there is exactly one `XDOCS.md` per repository, at the repo root. It has **no frontmatter** — it is a plain index that lists the repository's packages and applications, and it is not itself a tree node.
- **Package/application root**: each package or application has its own root `.xdocs.md` file (with frontmatter and `parent: null`) that is the top of that package's documentation tree. `XDOCS.md` lists these package roots.
- **Tree**: a parent-child **containment** hierarchy (not a dependency graph), assembled from each `.xdocs.md` / `.docs.md` file's `subject` / `parent` / `children` fields. A module's `parent` is the `subject` of the module that contains it; a package/application root uses `parent: null`.
- **AI mode**: `xdocs.config.toml` `[ai].mode` is either `"prompt"` (announce the documentation updates, then write them) or `"auto"` (write immediately). It governs *how* you write docs, not *whether* — documenting a changed module is always required (see Automatic Documentation Maintenance).

### Metadata schema (YAML frontmatter)

Every `.xdocs.md` / `.docs.md` file carries frontmatter with these fields. The repository's single `XDOCS.md` is the exception: it has no frontmatter and is just an index.

| Field         | Type                  | Meaning                                                       |
| ------------- | --------------------- | ------------------------------------------------------------ |
| `subject`     | string                | Unique identifier/name of this module in the tree.           |
| `description` | string                | One-line summary of what the module does.                    |
| `parent`      | string \| null        | `subject` of the containing module; `null` for a package/application root. |
| `children`    | string[]              | `subject`s of directly contained modules.                    |
| `files`       | map<string,string>    | Filename -> short description of each significant file.      |
| `tags`        | string[]              | Free-form classification labels.                             |
| `flags`       | string[]              | Behavioral markers for tools/agents.                         |
| `status`      | string (optional)     | Lifecycle marker (e.g. `stable`, `draft`, `deprecated`).     |

Keep `subject` values unique across the project, keep `parent`/`children` consistent in both directions, and keep `files` in sync with what is actually on disk.

## Automatic Documentation Maintenance (core responsibility)

Maintaining xdocs files is an **automatic, built-in responsibility — not a task the user has to request.** Treat it as part of the definition of done for every code change in an xdocs project. The user should never have to ask you to document a module; you do it as a reflex whenever you touch one.

**Trigger.** Whenever you, as the agent, do any of the following, you must create or update the affected directory's xdocs file in the *same unit of work*, before you consider the task finished:

- Create a new directory, module, or subpackage.
- Add, rename, move, or delete significant files in a directory.
- Change what a module does, what it exposes, or how it relates to its parent or children.

**Action.**

- If the directory has **no** xdocs file, create one (for example `<name>.xdocs.md`) in that directory.
- If it **already** has one, update it so it matches the new reality.
- Then fix the parent/child links and verify with `<xdocs> tree`.

**What every module's xdocs file must capture:**

- `subject` — the module's unique name in the tree.
- `description` — the module's **purpose**: what it is for and what it does.
- `files` — each significant file in the directory mapped to a short description of its responsibility, **including the key functions/exports it provides**.
- `parent` — the `subject` of the containing module (and add this module to that parent's `children`).
- `children` — the `subject`s of the modules contained inside this one.

**Do not wait to be asked.** After you finish creating or modifying a module or directory, create or update its xdocs file as part of the same change. A code change that adds or alters a module is **not complete** until its xdocs file and the affected parent/child links are updated.

**How `[ai].mode` applies.** The mode controls only *how* you write the docs, never *whether* you write them and never whether the user must ask first:

- `auto` — create/update the xdocs files immediately as part of the change, then report what changed.
- `prompt` — state exactly which xdocs files you are creating or updating, then write them (honoring any pending confirmation). Announcing is for transparency; it does not make documentation optional and the user never has to request it.

### Example: documenting a new module

Suppose you just created `src/auth/` with `login.ts` and `session.ts`. As part of that work, create `src/auth/auth.xdocs.md`:

```markdown
---
subject: auth
description: Authentication and session handling for the API.
parent: src
children: []
files:
  login.ts: Email/password login flow; exports `login()` and `verifyPassword()`.
  session.ts: Session lifecycle; exports `createSession()` and `validateSession()`.
tags:
  - security
flags: []
status: stable
---

Auth validates credentials and issues sessions. `login()` delegates password
checks to `verifyPassword()`; sessions are created and validated in `session.ts`.
```

Then add `auth` to the `children` list of the `src` module's xdocs file so the tree stays consistent.

If the directory you are documenting is the **root of a package or application** (not a sub-module), set `parent: null` instead, and list that package's root `.xdocs.md` in the repository's single `XDOCS.md` index rather than in a parent module's `children`.

## Onboarding Workflow (entering a project)

When you start working in a project that uses xdocs:

1. Read the root `XDOCS.md` to learn the project's top-level subject and structure.
2. Run `<xdocs> tree` to see the module hierarchy.
3. Run `<xdocs> scan` to see documentation coverage and which directories are missing xdocs files.
4. Read `xdocs.config.toml` and note `[ai].mode`, the supported `[extensions]`, and `[scan].exclude`.
5. When you navigate into a module, read that module's xdocs file (frontmatter first, body only if you need more) instead of reading every source file.

## Documentation Workflow (writing and updating)

Follow this whenever the automatic trigger above fires, or when the user asks to document a directory:

1. Determine the target directory and whether it already has an xdocs file (`<xdocs> scan` or `<xdocs> list <path>`).
2. Read the directory's actual files so the documentation reflects reality. Never invent files, modules, or behavior that is not present.
3. Respect `[ai].mode` (it controls how you write, not whether you write):
   - **prompt mode**: state exactly which xdocs files you are creating or updating, then write them (honor a pending confirmation, but never skip the documentation).
   - **auto mode**: create or update the xdocs files immediately, then report what changed.
4. Write or update the xdocs file with correct frontmatter:
   - Set `subject` (unique), `description` (the module's purpose), and `files` (each real file -> short purpose, including key functions/exports).
   - Set `parent` to the containing module's `subject`, and add this `subject` to that parent's `children`.
   - Use `tags`/`flags`/`status` where useful.
5. Keep the tree consistent: if you add a module, update its parent's `children`; if you remove one, update both sides.
6. Validate with `<xdocs> tree` (it reports duplicate subjects, orphans, and missing children) and fix any reported issues.

When generating from scratch, prefer `<xdocs> generate <path>` (one directory) or `<xdocs> generate` (whole project) to produce a starting draft, then refine the content by hand.

## Command-to-Task Mapping

- "Set up xdocs here" -> `<xdocs> init`
- "What is documented / what is missing" -> `<xdocs> scan`
- "Show me the structure" -> `<xdocs> tree`
- "What is in this folder" -> `<xdocs> list <path>`
- "Draft docs for this module / project" -> `<xdocs> generate [path]`
- "Give me one combined document" -> `<xdocs> merge [path]`
- "Give me the AI instructions for writing/updating docs" -> `<xdocs> prompt --name=<write|update|agents|generate>`
- "Install the xdocs skill / update AGENTS.md" -> `<xdocs> agents install <local|global>` / `<xdocs> agents instructions`

## Safety Rules

- Never leave a new or changed module undocumented. Creating or updating its xdocs file is part of finishing the work, not a separate request the user must make.
- Never fabricate files, modules, descriptions, or relationships. Documentation must match the repository.
- Never edit generated or build outputs (`library/`, `bundle/`, `bin/`, `*.tgz`). They are ignored and regenerated.
- In prompt mode, announce the xdocs changes you will make and honor a pending confirmation — but still treat documenting the change as required, never optional.
- Do not break tree integrity: every `child` must have a matching `parent`, and every `subject` must be unique.
- Do not silently change a module's `subject` — it is the identity used by `parent`/`children` links across the project.
- When `<xdocs> tree` or `<xdocs> scan` reports warnings, resolve them rather than ignoring them.

## Configuration Reference

xdocs searches for configuration via `--config <path>`, `./xdocs.config.toml`, or `./config/xdocs.config.toml`.

```toml
schema = 1

[extensions]
supported = [".docs.md", ".xdocs.md"]

[ai]
mode = "prompt"            # "prompt" (announce and wait) or "auto" (update immediately)

[scan]
exclude = ["node_modules", ".git", "dist", "build", "library", "bin", "bundle"]

[project]
name = "my-project"

[agents]
auto_agents_md = true      # keep the xdocs section in AGENTS.md up to date on bare and normal commands
auto_skill_install = true  # install or refresh the guiho-s-xdocs skill globally
skill_tool = "agents"      # default tool for auto-install: agents (standard) or claude
```

Agent automation options default to true. A bare `xdocs` invocation and normal data commands run this automation when config is present. Set `auto_agents_md = false` to stop xdocs from touching AGENTS.md, and `auto_skill_install = false` to stop xdocs from installing or refreshing `guiho-s-xdocs` globally.

## CLI Reference

```bash
xdocs init                     # create XDOCS.md + xdocs.config.toml, update AGENTS.md, install the skill
xdocs scan                     # report xdocs coverage across the project
xdocs tree                     # print the module hierarchy
xdocs list <path>              # list files in a scope with descriptions
xdocs generate [path]          # draft documentation for a directory or the whole project
xdocs merge [path]             # merge a directory's xdocs files into one document
xdocs prompt --name=<name>     # print a ready-made AI prompt (write|update|agents|generate)
xdocs agents install local     # install guiho-s-xdocs into this project (.agents/skills/...)
xdocs agents install global    # install guiho-s-xdocs into the user home skills directory
xdocs agents instructions      # insert/refresh the xdocs section in AGENTS.md
```

Global flags: `--help`, `--version`, `--cwd <path>`, `--config <path>`, `--format <text|json|markdown>`, `--verbose`. The `agents install` command also accepts `--tool <agents|claude|all>`.

## Agent Skill Installation

xdocs ships this `guiho-s-xdocs` skill. The **standard** target is `AGENTS.md`
plus `.agents/skills`, which OpenCode, Codex, Jules, and any AGENTS.md-aware tool
read. A **non-standard** Claude Code target exists and is used only when it is
explicitly requested (`--tool claude`) or detected (a `.claude` directory or
`CLAUDE.md` in the project).

| Target                  | Skill location (local)                      |
| ----------------------- | ------------------------------------------- |
| **agents** (standard)   | `.agents/skills/guiho-s-xdocs/SKILL.md`    |
| **claude** (non-standard) | `.claude/skills/guiho-s-xdocs/SKILL.md`  |

`local` scope installs under the current project; `global` scope installs under
the user home directory (`~/.agents/skills/...`). The small section in `AGENTS.md`
written by `xdocs agents instructions` is the standard pointer that tells any
agent to load this skill.

Default to the standard target. Only install or write non-standard files
(`.claude`, `CLAUDE.md`, etc.) when the user asks for them or when those files
already exist in the project.

## TypeScript API

When the user wants automation code rather than CLI usage, use the typed API:

```ts
import { loadConfigOrDefaults, scanProject, buildTree, renderTree } from '@guiho/xdocs'

const config = await loadConfigOrDefaults({ cwd: process.cwd(), format: 'text', verbose: false })
const scan = await scanProject(config)
const tree = buildTree(scan.xdocsFiles)

console.log(renderTree(tree))
```

For agent-skill and AGENTS.md automation:

```ts
import { installSkill, ensureAgentsInstructions } from '@guiho/xdocs'

await installSkill('agents', 'local', { cwd: process.cwd() })
await ensureAgentsInstructions(process.cwd(), true)
```

## Response Style

When reporting an xdocs result, include:

- The command that ran and the target path.
- Which xdocs files were created or changed, if any.
- Tree/coverage status (subjects added, orphans or duplicates resolved).
- The configured AI mode, and — in prompt mode — exactly what you are waiting to write.

Keep the explanation short and operational. The user usually needs to know which docs changed, whether the tree is still consistent, and what (if anything) remains for them to confirm.
