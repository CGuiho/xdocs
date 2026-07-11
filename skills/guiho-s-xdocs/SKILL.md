---
name: guiho-s-xdocs
version: 0.5.2
metadata:
  version: 0.5.2
purpose: Teach AI agents how to maintain xdocs descriptor files, companion Markdown documents, metadata, and tree integrity.
description: Use this skill whenever the user works with xdocs (`@guiho/xdocs`) structured documentation, AND proactively whenever you create a new module or subdirectory or add/change/remove files in a directory of an xdocs project, so you create or update that directory's named `*.xdocs.md` descriptor as part of the change. This includes creating, updating, or regenerating `*.xdocs.md` descriptor files, companion Markdown documents, the root `XDOCS.md`, the project tree, metadata scans, context recommendations, doctor health checks, scanning documentation coverage, merging docs, or maintaining xdocs metadata and AGENTS.md guidance, even when the user only says "document this module", "update the docs", or "what does this folder do" without naming xdocs.
created: 2026-07-06
flags:
  - automatic-documentation-maintenance
  - companion-document-metadata
tags:
  - xdocs
  - documentation
  - agents
keywords:
  - xdocs
  - structured documentation
  - companion documents
  - agent workflow
owner: xdocs-guiho-s-xdocs-skill
---

# GUIHO XDocs

GUIHO XDocs is a deterministic CLI and TypeScript library for **structured documentation of codebases**. It lets an AI agent understand a project without reading every source file: each documented directory carries one named `*.xdocs.md` descriptor with YAML frontmatter that describes its subject, purpose, files, companion Markdown documents, and place in a parent-child hierarchy.

```text
source tree -> named *.xdocs.md descriptors + companion *.md documents -> tree + metadata -> AI-readable map
```

Use xdocs for documentation work instead of ad hoc README sprawl or re-reading the whole codebase. The value of xdocs is that the structure (subjects, descriptions, files, parent/child links) is machine-readable and stays close to the code it describes.

## Command Selection

Choose the installed native CLI first:

1. Use `xdocs` when the CLI is installed on the system.
2. Use `bun run source/guiho-xdocs-bin.ts` only inside an xdocs source checkout while developing xdocs itself.
3. Use `bunx @guiho/xdocs` only as a last-resort bootstrap path when no native CLI is installed yet.

When unsure, run a cheap availability check (`xdocs --help`) and then reuse the
working command consistently. Run `xdocs --help`, `xdocs <command> --help`,
`xdocs --help-tree`, or `xdocs <command> --help-docs` for command-specific

xdocs ships as a native self-sufficient CLI. It can check for updates, print a
cached upgrade notice, upgrade itself with `xdocs upgrade`, and remove its native
binary with `xdocs uninstall`. The CLI never bumps project versions or mutates
`package.json` version fields for documented projects; versioning is a separate
concern handled by GUIHO Mirror.

## Core Concepts

- **xdocs descriptor**: a named Markdown file ending in `.xdocs.md` with YAML frontmatter that documents one directory/module. There is exactly one descriptor per documented directory. The file must have a name such as `authentication.xdocs.md`; a file named only `.xdocs.md` is invalid.
- **Companion document**: a same-directory plain Markdown file ending in `.md` but not `.xdocs.md` and not `XDOCS.md`. Every companion document must be listed in the descriptor's `documents` metadata map, and ordinary companion documents should carry their own YAML frontmatter with `name`, `purpose`, `description`, `created`, `flags`, `tags`, `keywords`, and `owner`.
- **Repository root index**: there is exactly one `XDOCS.md` per repository, at the repo root. It has **no frontmatter** — it is a plain index that lists the repository's packages and applications, and it is not itself a tree node.
- **Package/application root**: each package or application has its own root `.xdocs.md` file (with frontmatter and `parent: null`) that is the top of that package's documentation tree. `XDOCS.md` lists these package roots.
- **Tree**: a parent-child **containment** hierarchy (not a dependency graph), assembled from each `.xdocs.md` descriptor's `subject` / `parent` / `children` fields. A module's `parent` is the `subject` of the module that contains it; a package/application root uses `parent: null`.
- **AI mode**: `xdocs.config.toml` `[ai].mode` is either `"prompt"` (announce the documentation updates, then write them) or `"auto"` (write immediately). It governs *how* you write docs, not *whether* — documenting a changed module is always required (see Automatic Documentation Maintenance).

### Metadata schema (YAML frontmatter)

Every `*.xdocs.md` descriptor carries frontmatter with these fields. The repository's single `XDOCS.md` is the exception: it has no frontmatter and is just an index.

| Field         | Type                  | Meaning                                                       |
| ------------- | --------------------- | ------------------------------------------------------------ |
| `subject`     | string                | Unique identifier/name of this module in the tree.           |
| `description` | string                | One-line summary of what the module does.                    |
| `parent`      | string \| null        | `subject` of the containing module; `null` for a package/application root. |
| `children`    | string[]              | `subject`s of directly contained modules.                    |
| `files`       | map<string,string>    | Filename -> short description of each significant file.      |
| `documents`   | map<string,string>    | Same-directory plain Markdown filename -> short description. |
| `tags`        | string[]              | Free-form classification labels.                             |
| `keywords`    | string[]              | Search terms and concepts agents can use to match requests.  |
| `flags`       | string[]              | Behavioral markers for tools/agents.                         |
| `status`      | string (optional)     | Lifecycle marker (e.g. `stable`, `draft`, `deprecated`).     |

Keep `subject` values unique across the project, keep `parent`/`children` consistent in both directions, keep `files` in sync with implementation files, and keep `documents` in sync with same-directory plain Markdown files.

### Companion document metadata (YAML frontmatter)

Ordinary same-directory companion Markdown documents also use YAML frontmatter.
This metadata makes the document useful before an agent reads the whole body.
The `owner` field must be the `subject` of the same-directory xdocs descriptor
that owns the document.

```yaml
---
name: authentication-implementation
purpose: Explain the implementation details and decisions behind authentication.
description: Detailed notes for login, password verification, and session behavior.
created: 2026-07-06
flags: []
tags:
  - security
keywords:
  - login
  - password verification
  - sessions
owner: auth
---
```

Companion document fields:

| Field         | Type       | Meaning                                                        |
| ------------- | ---------- | -------------------------------------------------------------- |
| `name`        | string     | Stable document name or title.                                 |
| `purpose`     | string     | Why this document exists and what question it answers.         |
| `description` | string     | One-line summary of the document's contents.                   |
| `created`     | string     | Creation date in `YYYY-MM-DD` format.                          |
| `flags`       | string[]   | Behavioral markers for tools/agents.                           |
| `tags`        | string[]   | Free-form classification labels.                               |
| `keywords`    | string[]   | Search terms and concepts agents can use to match requests.    |
| `owner`       | string     | Owning xdocs descriptor `subject` in the same directory.        |

Special-purpose Markdown files that already have a required host schema, such
as prompt templates or `SKILL.md`, must preserve their required host fields.
When compatible, add the companion metadata fields as well.

## Automatic Documentation Maintenance (core responsibility)

Maintaining xdocs descriptors is an **automatic, built-in responsibility — not a task the user has to request.** Treat it as part of the definition of done for every code change in an xdocs project. The user should never have to ask you to document a module; you do it as a reflex whenever you touch one.

**Trigger.** Whenever you, as the agent, do any of the following, you must create or update the affected directory's named xdocs descriptor in the *same unit of work*, before you consider the task finished:

- Create a new directory, module, or subpackage.
- Add, rename, move, or delete significant files in a directory.
- Add, rename, move, or delete sibling plain Markdown documents in a directory.
- Change what a module does, what it exposes, or how it relates to its parent or children.

**Action.**

- If the directory has **no** xdocs descriptor, create one named `<name>.xdocs.md` in that directory.
- If it **already** has one, update it so it matches the new reality. If there is more than one descriptor, consolidate to one.
- Never create or keep a descriptor named only `.xdocs.md`. `.xdocs.md` is the extension, not the whole filename.
- Then fix the parent/child links and verify with `<xdocs> tree`.

**What every module's xdocs descriptor must capture:**

- `subject` — the module's unique name in the tree.
- `description` — the module's **purpose**: what it is for and what it does.
- `files` — each significant file in the directory mapped to a short description of its responsibility, **including the key functions/exports it provides**.
- `parent` — the `subject` of the containing module (and add this module to that parent's `children`).
- `children` — the `subject`s of the modules contained inside this one.

Every descriptor also includes `documents`, a map from each same-directory plain Markdown filename to the purpose of that companion document.
Each ordinary companion document listed there should include its own frontmatter
with `owner` equal to this descriptor's `subject`.

**Do not wait to be asked.** After you finish creating or modifying a module or directory, create or update its xdocs descriptor as part of the same change. A code change that adds or alters a module is **not complete** until its xdocs descriptor, companion-document list, and affected parent/child links are updated.

**How `[ai].mode` applies.** The mode controls only *how* you write the docs, never *whether* you write them and never whether the user must ask first:

- `auto` — create/update the xdocs descriptors immediately as part of the change, then report what changed.
- `prompt` — state exactly which xdocs descriptors you are creating or updating, then write them (honoring any pending confirmation). Announcing is for transparency; it does not make documentation optional and the user never has to request it.

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
documents:
  authentication-implementation.md: Companion notes that explain implementation details and decisions.
tags:
  - security
keywords:
  - authentication
  - login
  - sessions
flags: []
status: stable
---

Auth validates credentials and issues sessions. `login()` delegates password
checks to `verifyPassword()`; sessions are created and validated in `session.ts`.
```

Then create or update `src/auth/authentication-implementation.md` with
companion-document frontmatter:

```markdown
---
name: authentication-implementation
purpose: Explain authentication implementation details and decisions.
description: Detailed notes for login, password verification, and session behavior.
created: 2026-07-06
flags: []
tags:
  - security
keywords:
  - authentication
  - password verification
  - session lifecycle
owner: auth
---

# Authentication Implementation

Describe the implementation details that are too long for `auth.xdocs.md`.
```

Then add `auth` to the `children` list of the `src` module's xdocs descriptor so the tree stays consistent.

If the directory you are documenting is the **root of a package or application** (not a sub-module), set `parent: null` instead, and list that package's root `.xdocs.md` in the repository's single `XDOCS.md` index rather than in a parent module's `children`.

## Onboarding Workflow (entering a project)

When you start working in a project that uses xdocs:

1. Read the root `XDOCS.md` to learn the project's top-level subject and structure.
2. Run `<xdocs> tree` to see the module hierarchy.
3. Run `<xdocs> scan` to see documentation coverage, invalid descriptors, and companion-document coverage.
4. Read `xdocs.config.toml` and note `[ai].mode` and `[scan].exclude`; xdocs descriptors always use the `.xdocs.md` suffix.
5. Run `<xdocs> context "<task>" [path] --documents --files --format json` to get the smallest useful reading set for the current task.
6. Run `<xdocs> meta [path] --documents --format json` before opening full descriptor or companion Markdown bodies when you only need metadata, search terms, ownership, tags, or summaries.
7. When metadata shows a module is relevant, read that module's named `*.xdocs.md` descriptor body and listed companion documents only when their descriptions show they are relevant.

## Metadata-Only Workflow

Use `xdocs meta` when an agent needs to understand documentation structure without reading entire Markdown files.

```bash
xdocs meta [path] --documents --format json
```

- `xdocs meta [path]` scans the target directory top-down and reads only YAML frontmatter from named `*.xdocs.md` descriptors.
- `--documents` also reads frontmatter from companion `.md` files that are listed in each descriptor's `documents` map.
- `--strict` fails the command if descriptor metadata, document references, companion document frontmatter, or `owner` relationships are invalid.
- `--owner <subject>` filters descriptors by `subject` and companion documents by `owner`.
- `--tag <tag>` filters descriptors and documents whose `tags` include that value.
- `--keyword <keyword>` filters descriptors and documents whose `keywords` include that value.

Prefer `--format json` for AI/tool workflows. Use `--owner`, `--tag`, and `--keyword` to narrow the result before reading any full Markdown body.

## Context Workflow

Use `xdocs context` when an agent has a task/query and needs to know what to read.

```bash
xdocs context "<query>" [path] --documents --files --format json
```

- `--documents` includes matching companion Markdown documents.
- `--files` includes matching implementation files declared in descriptor `files` maps.
- `--limit <n>` caps returned entries.
- `--owner`, `--tag`, and `--keyword` constrain metadata before scoring.
- `--explain` includes readable match reasons in text/Markdown; JSON always includes reasons.

Run this before reading broad code or documentation. Prefer the smallest result set that can answer the task.

## Doctor Workflow

Use `xdocs doctor [path]` before finishing documentation-heavy changes or in CI.

```bash
xdocs doctor --format json
```

It checks descriptor validity, companion-document metadata, tree integrity, and documented file existence. Add `--warnings-as-errors` when CI should fail on tree warnings. Add `--no-documents` only when intentionally skipping companion-document frontmatter validation.

## Documentation Workflow (writing and updating)

Follow this whenever the automatic trigger above fires, or when the user asks to document a directory:

1. Determine the target directory and whether it already has exactly one named `*.xdocs.md` descriptor (`<xdocs> scan` or `<xdocs> list <path>`).
2. Read the directory's actual files so the documentation reflects reality. Never invent files, modules, or behavior that is not present.
3. Respect `[ai].mode` (it controls how you write, not whether you write):
   - **prompt mode**: state exactly which xdocs descriptors you are creating or updating, then write them (honor a pending confirmation, but never skip the documentation).
   - **auto mode**: create or update the xdocs descriptors immediately, then report what changed.
4. Write or update the xdocs descriptor with correct frontmatter:
   - Set `subject` (unique), `description` (the module's purpose), and `files` (each real implementation/configuration file -> short purpose, including key functions/exports).
   - Set `documents` to every same-directory plain Markdown file -> short purpose. Use `{}` when there are no companion documents.
   - Set `keywords` to search terms and concepts that should help agents match user requests to the module.
   - For each ordinary companion document, add or update frontmatter with `name`, `purpose`, `description`, `created`, `flags`, `tags`, `keywords`, and `owner`; set `owner` to the descriptor's `subject`.
   - Set `parent` to the containing module's `subject`, and add this `subject` to that parent's `children`.
   - Use `tags`/`keywords`/`flags`/`status` where useful.
5. Keep the tree consistent: if you add a module, update its parent's `children`; if you remove one, update both sides.
6. Validate with `<xdocs> tree` (it reports duplicate subjects, orphans, and missing children) and fix any reported issues.

When generating from scratch, prefer `<xdocs> generate <path>` (one directory) or `<xdocs> generate` (whole project) to produce a starting draft, then refine the content by hand.

## Command-to-Task Mapping

- "Set up xdocs here" -> `<xdocs> init`
- "What is documented / what is missing" -> `<xdocs> scan`
- "Show me the structure" -> `<xdocs> tree`
- "What is in this folder" -> `<xdocs> list <path>`
- "Find relevant documentation metadata without reading full files" -> `<xdocs> meta [path] --documents --format json`
- "What should I read for this task?" -> `<xdocs> context "<query>" [path] --documents --files --format json`
- "Validate xdocs health" -> `<xdocs> doctor [path]`
- "Draft docs for this module / project" -> `<xdocs> generate [path]`
- "Give me one combined document" -> `<xdocs> merge [path]`
- "Give me the AI instructions for writing/updating docs" -> `<xdocs> prompt --name=<write|update|agents|generate>`
- "Install the xdocs skill / update AGENTS.md" -> `<xdocs> agents install <local|global>` / `<xdocs> agents instructions`

## Safety Rules

- Never leave a new or changed module undocumented. Creating or updating its xdocs descriptor is part of finishing the work, not a separate request the user must make.
- Never leave an ordinary companion Markdown document without useful frontmatter; it should identify its `owner`, purpose, tags, keywords, and flags.
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
supported = [".xdocs.md"]

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

Agent automation options default to true. A bare `xdocs` invocation and normal data commands always bootstrap the standard global skill when no config is present; with config, set `auto_agents_md = false` to stop xdocs from touching AGENTS.md, and `auto_skill_install = false` to stop xdocs from installing or refreshing `guiho-s-xdocs` globally.

The `[extensions]` section is retained for config compatibility, but the only supported descriptor suffix is `.xdocs.md`.

## CLI Reference

```bash
xdocs init                     # create XDOCS.md + xdocs.config.toml, update AGENTS.md, install the skill
xdocs scan                     # report descriptor and companion-document coverage
xdocs meta [path]              # read descriptor frontmatter only; add --documents for companion .md frontmatter
xdocs context <query> [path]   # recommend a minimal reading set for a task
xdocs doctor [path]            # run descriptor, document, tree, and file health checks
xdocs tree                     # print the module hierarchy
xdocs list <path>              # list files and companion documents with descriptions
xdocs generate [path]          # draft documentation for a directory or the whole project
xdocs merge [path]             # merge a directory's xdocs descriptors into one document
xdocs prompt --name=<name>     # print a ready-made AI prompt (write|update|agents|generate)
xdocs upgrade                  # upgrade the installed native xdocs binary
xdocs uninstall --dry-run      # preview native binary removal
xdocs agents install local     # install guiho-s-xdocs into this project (.agents/skills/...)
xdocs agents install global    # install guiho-s-xdocs into the user home skills directory
xdocs agents instructions      # insert/refresh the xdocs section in AGENTS.md
```

Global flags: `--help`, `--help-tree`, `--help-docs`, `--version`, `--cwd <path>`, `--config <path>`, `--format <text|json|markdown>`, `--verbose`. `xdocs meta` also accepts `--documents`, `--strict`, `--owner <subject>`, `--tag <tag>`, and `--keyword <keyword>`. `xdocs context` accepts `--documents`, `--files`, `--limit <n>`, `--owner <subject>`, `--tag <tag>`, `--keyword <keyword>`, and `--explain`. `xdocs doctor` accepts `--no-documents` and `--warnings-as-errors`. The `agents install` command also accepts `--tool <agents|claude|all>`.

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
import { doctorProject, findContext, loadConfigOrDefaults, scanMetadata, scanProject, buildTree, renderTree } from '@guiho/xdocs'

const config = await loadConfigOrDefaults({ cwd: process.cwd(), format: 'text', verbose: false })
const metadata = await scanMetadata(config, { targetPath: 'source', includeDocuments: true, keyword: 'auth' })
const context = await findContext(config, 'auth sessions', { includeDocuments: true, includeFiles: true })
const health = await doctorProject(config)
const scan = await scanProject(config)
const tree = buildTree(scan.xdocsFiles)

console.log(metadata.descriptors)
console.log(context.entries)
console.log(health.valid)
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
- Which xdocs descriptors and companion documents were created or changed, if any.
- Tree/coverage status (subjects added, orphans or duplicates resolved).
- The configured AI mode, and — in prompt mode — exactly what you are waiting to write.

Keep the explanation short and operational. The user usually needs to know which docs changed, whether the tree is still consistent, and what (if anything) remains for them to confirm.
