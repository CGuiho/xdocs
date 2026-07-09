# GUIHO XDocs Architecture

This document contains all architectural and technical decisions for xdocs. It is the reference for implementation.

## 1. Naming

- The canonical spelling is **xdocs** -- one word, no hyphen, no space, lowercase.
- When used in a title or heading, capitalize as **XDocs**.
- The npm package is `@guiho/xdocs`.
- The CLI binary is `xdocs`.

## 2. File Conventions

### 2.1 Root File

Every project has exactly one root file: `XDOCS.md` (uppercase). This is the repository index, not a tree node, and it has no YAML frontmatter. There must only be one `XDOCS.md` in the whole project. It lives at the project root.

### 2.2 Module Files

All module descriptors throughout the project are named with a descriptive prefix and the fixed `.xdocs.md` suffix. The name describes the subject the file documents. A file named only `.xdocs.md` is invalid because `.xdocs.md` is the extension, not the full filename.

Examples:

- `authentication.xdocs.md`
- `authorization-layer.xdocs.md`
- `supply-chain.xdocs.md`

### 2.3 Companion Markdown Documents

Same-directory plain Markdown files ending in `.md` are companion documents. They are not descriptors unless they end in `.xdocs.md`, and they must be listed in the descriptor's `documents` metadata map.

For example, `authentication.xdocs.md` can list `authentication-implementation.md` as a companion document. Agents read the descriptor frontmatter first, then open companion documents only when relevant.

Ordinary companion Markdown documents also use YAML frontmatter with `name`,
`purpose`, `description`, `created`, `flags`, `tags`, `keywords`, and `owner`.
The `owner` is the `subject` of the same-directory xdocs descriptor.

## 3. File Structure

An xdocs descriptor has two parts: **metadata** (strict) and **body** (flexible).

### 3.1 Metadata (YAML Frontmatter)

Metadata is encoded as YAML frontmatter at the top of the file, between `---` markers. The metadata schema is strict -- these fields are required for the descriptor to be considered valid. A descriptor without valid frontmatter will still be discovered and processed, but it will be flagged as incomplete.

```yaml
---
subject: authentication
description: Handles user login, registration, password reset, and session management.
parent: domain-core
children:
  - login
  - registration
  - password-reset
files:
  authenticate.ts: Validates credentials and returns a session token.
  register.ts: Creates a new user account with email verification.
  reset-password.ts: Handles password reset flow via email link.
  session.ts: Manages session creation, validation, and expiration.
documents:
  authentication-implementation.md: Detailed implementation notes and decisions.
tags: []
keywords:
  - authentication
  - login
  - sessions
flags: []
---
```

#### Required Metadata Fields

| Field         | Type                  | Description                                                                                                                                                                    |
| ------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `subject`     | `string`              | The name of this module/subject. Identifies what this file documents.                                                                                                          |
| `description` | `string`              | A short description of this module. This is what the AI reads first to understand the module without reading the full body. Must be concise and informative enough on its own. |
| `parent`      | `string \| null`      | The parent subject in the hierarchy. `null` for the root.                                                                                                                      |
| `children`    | `string[]`            | The child subjects (submodules) contained within this module. Empty array if none.                                                                                             |
| `files`       | `map<string, string>` | The files in this directory. Each key is a filename, each value is a short description of what that file does.                                                                 |
| `documents`   | `map<string, string>` | Same-directory plain Markdown companion documents. Each key is a filename, each value describes the document.                                                                 |
| `tags`        | `string[]`            | A list of tags for categorization and search. Most of the time this will be empty (`[]`).                                                                                      |
| `keywords`    | `string[]`            | Search terms and concepts agents can use to match user requests to this module.                                                                                                |
| `flags`       | `string[]`            | A list of flags for marking attributes or states. Most of the time this will be empty (`[]`).                                                                                  |

#### Optional Metadata Fields

| Field    | Type     | Description                                                          |
| -------- | -------- | -------------------------------------------------------------------- |
| `status` | `string` | Status of the module (e.g., `active`, `deprecated`, `experimental`). |

### 3.2 Body (Free-form Markdown)

Everything below the frontmatter is the body. The body has no enforced structure. The user or AI can write whatever is useful for the module: long-form explanations, usage examples, diagrams, decision notes, API documentation, or nothing at all.

Recommended (but not required) sections:

- **Overview** -- a longer explanation of the module beyond the short description
- **Usage** -- how to use this module, with code examples if relevant
- **Notes** -- implementation notes, caveats, or decisions

The body is the user's space. Any shape, any content.

## 4. The Tree

The tree is the hierarchy of the project, built from the `subject`, `parent`, and `children` fields in the metadata of every xdocs descriptor.

### 4.1 Principles

- The tree represents **hierarchy, not connections**. It is a parent-child containment structure, not a dependency graph.
- Every module has exactly one parent (except the root, which has none).
- Every module may have zero or more children.
- The tree is derived from xdocs descriptors. It is not stored separately -- it is computed by scanning all named `*.xdocs.md` descriptors and assembling their relationships.

### 4.2 Example

```
project (root)
  domain-core
    authentication
      login
      registration
      password-reset
    user
      profile
      preferences
  domain-supply
    supply
    product
      catalog
      inventory
```

### 4.3 Integrity

When the CLI builds the tree, it validates:

- Every `parent` reference points to an existing subject.
- Every entry in `children` has a corresponding xdocs descriptor with a matching `subject`.
- No orphan subjects (a subject whose declared parent does not exist).
- No cycles.

Violations are reported as warnings or errors depending on severity.

## 5. Configuration

### 5.1 File

Configuration lives in `xdocs.config.toml` at the project root. Created by `xdocs init`.

### 5.2 Schema

```toml
schema = 1

[extensions]
# Descriptor suffix recognized by xdocs. Only ".xdocs.md" is supported.
supported = [".xdocs.md"]

[ai]
# How the AI handles documentation updates.
# "prompt" = AI announces updates needed, waits for user to confirm.
# "auto"   = AI updates documentation automatically on any change.
# Default: "prompt"
mode = "prompt"

[scan]
# Directories to exclude from scanning.
# Default: ["node_modules", ".git", "dist", "build", "library", "bin", "bundle"]
exclude = ["node_modules", ".git", "dist", "build", "library", "bin", "bundle"]

[project]
# Project name. Used in the root XDOCS.md and tree output.
name = "my-project"
```

## 6. Discovery

xdocs descriptors are discovered by scanning every directory and subdirectory in the project for named files ending in `.xdocs.md`. Same-directory plain Markdown documents ending in `.md` are discovered as companion documents and validated against each descriptor's `documents` map. There is no registry, no manifest, no index file.

The scan respects the `[scan].exclude` list to skip directories like `node_modules`, `.git`, and build outputs.

The root `XDOCS.md` is always discovered as the repository index. It is not a descriptor and has no frontmatter.

## 7. CLI

### 7.1 Runtime and Distribution

The CLI is built with **Bun and TypeScript**.

Distribution is moving toward a **native-binary-first** model:

1. The core CLI is compiled to platform-specific binaries using `bun build --compile` for the supported release matrix.

   | Asset | Bun target |
   | ----- | ---------- |
   | `xdocs-linux-x64` | `bun-linux-x64` |
   | `xdocs-linux-arm64` | `bun-linux-arm64` |
   | `xdocs-macos-x64` | `bun-darwin-x64` |
   | `xdocs-macos-arm64` | `bun-darwin-arm64` |
   | `xdocs-windows-x64.exe` | `bun-windows-x64` |

   Windows arm64 is intentionally not published until Bun compilation support is reliable for this project.

2. GitHub releases publish the compiled assets. The direct installers (`install.sh`, `install.ps1`) download the matching asset and place it on `PATH`, so users do not need Node.js or Bun at runtime.

3. The npm package remains available as a package-manager convenience. Its package `bin` points to the shipped Bun launcher at `scripts/xdocs-bin.ts`; `postinstall` and the launcher's first-run fallback use `scripts/install-package.ts` to download the matching GitHub Release native binary into `vendor/xdocs` or `vendor/xdocs.exe`, then delegate to that binary.

This approach means:

- Direct-install users run a native `xdocs` binary with no Node or Bun runtime dependency.
- Package-manager and `bunx` users keep a familiar dependency workflow, with Bun running the small launcher.
- Unsupported platforms have a documented manual path: install Bun and run from source, or download a compatible release asset manually.

### 7.2 Commands

All commands accept flags to modify their behavior.

#### `xdocs init`

Initializes xdocs in a project.

- Creates the root `XDOCS.md` file.
- Creates `xdocs.config.toml` with defaults.
- Updates the project's `AGENTS.md` to include the xdocs section that points AI agents at the `guiho-s-xdocs` skill.
- Installs or refreshes the `guiho-s-xdocs` skill to the standard `.agents/skills` location (use `--global` for `~/.agents/skills`, `--tool` to add non-standard targets). The non-standard Claude target is added automatically when a `.claude/` directory or `CLAUDE.md` is detected.

#### `xdocs scan`

Scans the project for xdocs descriptors and companion Markdown documents.

- Walks every directory and subdirectory (respecting exclude rules).
- Matches named `*.xdocs.md` descriptors.
- Finds same-directory plain `*.md` companion documents.
- Reports: files found, directories with coverage, directories missing documentation.
- Output: structured report to stdout.

#### `xdocs generate`

Generates documentation at a given scope.

- **Directory/module scope** (`xdocs generate ./path/to/module`): scans descriptors, keywords, files, and companion documents within the target, then generates a comprehensive module document from metadata and body content.
- **Project scope** (`xdocs generate` or `xdocs generate .`): scans the entire project, generates a single `.md` file with the complete description of all modules, files, hierarchy, and relationships.

The CLI assembles the structure; the AI organizes and writes the content.

#### `xdocs prompt`

Outputs ready-made prompts for AI agents.

Each prompt is a self-contained instruction for the AI to execute a specific xdocs task. The CLI assembles the prompt with the relevant context (paths, config, current state); the AI executes it.

Prompts are selected by a **flag**, not by subcommand. This avoids ambiguity where prompt names look like verbs (e.g., `xdocs prompt update` could be misread as "update the prompt" rather than "give me the prompt for updating docs").

Both flag styles are supported:

```
xdocs prompt --name=write
xdocs prompt --name write
```

Available prompts:

- `--name=write` -- how to scan a directory and write xdocs documentation for it.
- `--name=update` -- how to update existing xdocs descriptors after code or document changes.
- `--name=agents` -- how to update AGENTS.md with xdocs instructions.
- `--name=generate` -- how to generate comprehensive documentation for a domain or the full project.

More prompts will be added. Each task gets its own prompt.

#### `xdocs merge`

Merges xdocs descriptors from a scope into a single file.

- `xdocs merge ./path/to/domain` -- takes all xdocs descriptors within the domain directory and produces one consolidated document.
- Output: a single Markdown file with all content merged.

#### `xdocs tree`

Generates the project hierarchy tree.

- Scans all xdocs descriptors, reads their metadata, and assembles the parent-child structure.
- Output: a structural tree showing the module hierarchy with references. Does not list individual files -- shows modules only.
- Can output to stdout or to a Markdown file.

#### `xdocs list`

Lists files in a given scope with descriptions.

- `xdocs list ./path/to/module` -- lists every file in the module with a short description of its purpose (pulled from the `files` metadata field).
- Useful as a quick inventory or manifest.

## 8. Agent Skills and Plugins

### 8.1 Agent Skills

xdocs ships an agent skill that teaches AI agents how to work with xdocs. It is a versioned `SKILL.md` instruction document (installed to `.agents/skills/guiho-s-xdocs/`) that the AI tool reads to understand:

- What xdocs is and how it works.
- When to create, update, or regenerate xdocs descriptors and companion-document metadata.
- How to use the CLI commands.
- How to respect the configured AI behavior mode (prompt vs auto).
- The metadata schema and file structure conventions.

### 8.2 Installation Targets

The skill ships inside the `@guiho/xdocs` package at `skills/guiho-s-xdocs/SKILL.md` and is installed by the `xdocs agents` commands (and by `xdocs init`). Installation is **standard-first**:

| Target                    | Skill location                                  | When used                                              |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| **agents** (standard)     | `.agents/skills/guiho-s-xdocs/SKILL.md`        | Always. The default. Read by OpenCode, Codex, Jules, and any AGENTS.md tool. |
| **claude** (non-standard) | `.claude/skills/guiho-s-xdocs/SKILL.md`        | Only when requested (`--tool claude`) or detected (a `.claude/` directory or `CLAUDE.md` exists). |

`local` scope installs under the project root; `global` scope installs under the user home directory (`~/.agents/skills/...`). The companion instruction is a small section inserted into `AGENTS.md` (the standard file every tool reads) that tells the agent to load the `guiho-s-xdocs` skill -- the skill body itself is large and loaded on demand.

```
xdocs agents install local            # standard target under the project
xdocs agents install global           # standard target under the home directory
xdocs agents install local --tool claude   # explicit non-standard Claude target
xdocs agents install local --tool all      # standard + claude
xdocs agents instructions             # insert/refresh the AGENTS.md section
```

The rule is: **default to the standard target.** Only write non-standard files (`.claude`, `CLAUDE.md`, etc.) when the user asks for them or when those files already exist in the project. Configuration in `xdocs.config.toml` (`[agents]`) controls automation: `auto_agents_md` keeps the AGENTS.md section fresh, `auto_skill_install` installs or refreshes the configured global skill from the bundled copy, and `skill_tool` selects the auto-install target. During install/refresh, xdocs removes legacy `guiho-as-xdocs` skill directories and replaces `guiho-s-xdocs` whenever the bundled version or content differs.

## 9. How AI Uses xdocs

The AI workflow with xdocs:

1. **On entering a project**: the AI reads the root `XDOCS.md` and the agent skill file to understand the project structure and xdocs conventions.
2. **On navigating to a module**: the AI reads the module's named `*.xdocs.md` descriptor first and opens companion Markdown documents only when their `documents` descriptions are relevant.
3. **On modifying code**: based on the configured AI mode:
   - **Prompt mode**: the AI announces that xdocs descriptors need updating and waits for the user.
   - **Auto mode**: the AI updates the relevant xdocs descriptors immediately.
4. **On creating new modules**: the AI creates a named xdocs descriptor with proper metadata (`subject`, `parent`, `children`, `files`, `documents`, `description`, `keywords`).
5. **On request**: the AI uses CLI commands (`xdocs generate`, `xdocs merge`, `xdocs tree`, etc.) to produce documentation artifacts.

## 10. Repository Structure

```
/                                 # repository root
  XDOCS.md                        # root repository index
  xdocs.xdocs.md                  # package-root xdocs descriptor
  package.json                    # npm package metadata and scripts
  jsr.json                        # JSR package metadata
  mirror.config.toml              # GUIHO Mirror versioning config
  ARCHITECTURE.md                 # this file
  BRAINSTORM.md                   # brainstorming and vision
  AGENTS.md                       # AI agent instructions
  README.md                       # public-facing README
  CHANGELOG.md                    # release changelog
  DOCS.md                         # canonical full package documentation
  TECHNICAL.md                    # technical notes
  TODO.md                         # task list
  source/                         # TypeScript source
    guiho-xdocs.ts                # library entrypoint
    guiho-xdocs-bin.ts            # source CLI entrypoint
    guiho-xdocs-native-bin.ts     # native binary entrypoint
    commands/                     # one file per CLI command
    config.ts                     # config loading and validation
    discovery.ts                  # filesystem scanning and matching
    metadata.ts                   # YAML frontmatter parsing and validation
    tree.ts                       # tree assembly and integrity checks
  scripts/                        # package-manager launcher and install helper
  prompts/                        # prompt templates shipped with the package
  skills/                         # bundled agent skill shipped with the package
    guiho-s-xdocs/
      SKILL.md
  docs/                           # durable project documentation and decisions
  devops/                         # binary builder and direct installers
  library/                        # tsc output (ignored)
  bin/                            # compiled binaries (ignored)
  .github/                        # GitHub workflows and config
  .vscode/                        # VS Code workspace settings
```

## 11. Technology Decisions

| Decision          | Choice                           | Rationale                                                            |
| ----------------- | -------------------------------- | -------------------------------------------------------------------- |
| Language          | TypeScript                       | Type safety, existing codebase convention.                           |
| Runtime           | Bun                              | Project standard. All-in-one toolkit.                                |
| File format       | Markdown with YAML frontmatter   | Human-readable, widely supported, parseable.                         |
| Config format     | TOML                             | Already used in the project (`xdocs.config.toml`).                   |
| Distribution      | Native binary release assets + package-manager native install | Direct installers run without Node/Bun; package-manager installs download a native binary during postinstall. |
| Metadata encoding | YAML frontmatter                 | Standard, supported by every Markdown parser and tool.               |
| Plugin model      | Standard `AGENTS.md` + `.agents/skills` | One versioned `guiho-s-xdocs` skill bundled in the package. Non-standard targets (Claude `.claude/skills`) are opt-in or auto-detected. |
| Tree structure    | Hierarchy (parent-child)         | Not a dependency graph. Containment only.                            |
