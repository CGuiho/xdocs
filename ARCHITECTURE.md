# GUIHO XDocs Architecture

This document contains all architectural and technical decisions for xdocs. It is the reference for implementation.

## 1. Naming

- The canonical spelling is **xdocs** -- one word, no hyphen, no space, lowercase.
- When used in a title or heading, capitalize as **XDocs**.
- The npm package is `@guiho/xdocs`.
- The CLI binary is `xdocs`.

## 2. File Conventions

### 2.1 Root File

Every project has exactly one root file: `XDOCS.md` (uppercase). This is the main xdocs file for the entire repository. There must only be one `XDOCS.md` in the whole project. It lives at the project root.

### 2.2 Module Files

All other xdocs files throughout the project are named with a descriptive prefix and one of the configured extensions. The name describes the subject the file documents.

Examples:

- `authentication.xdocs.md`
- `authorization-layer.xdocs.md`
- `user.docs.md`
- `supply-chain.xdocs.md`

### 2.3 Supported Extensions

The default extensions recognized by xdocs are:

- `.docs.md`
- `.xdocs.md`

Extensions are configurable in `xdocs.config.toml`. The user may add, remove, or replace extensions. For example, a user could configure `.md` to target every Markdown file, or `.txt` to include plain text files. Only files matching the configured extensions are discovered, processed, and matched by the CLI and agent skills.

## 3. File Structure

An xdocs file has two parts: **metadata** (strict) and **body** (flexible).

### 3.1 Metadata (YAML Frontmatter)

Metadata is encoded as YAML frontmatter at the top of the file, between `---` markers. The metadata schema is strict -- these fields are required for the file to be considered a valid xdocs file. A file without valid frontmatter will still be discovered and processed, but it will be flagged as incomplete.

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
  - authenticate.ts: Validates credentials and returns a session token.
  - register.ts: Creates a new user account with email verification.
  - reset-password.ts: Handles password reset flow via email link.
  - session.ts: Manages session creation, validation, and expiration.
tags: []
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
| `tags`        | `string[]`            | A list of tags for categorization and search. Most of the time this will be empty (`[]`).                                                                                      |
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

The tree is the hierarchy of the project, built from the `subject`, `parent`, and `children` fields in the metadata of every xdocs file.

### 4.1 Principles

- The tree represents **hierarchy, not connections**. It is a parent-child containment structure, not a dependency graph.
- Every module has exactly one parent (except the root, which has none).
- Every module may have zero or more children.
- The tree is derived from the xdocs files. It is not stored separately -- it is computed by scanning all xdocs files and assembling their relationships.

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
- Every entry in `children` has a corresponding xdocs file with a matching `subject`.
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
# File extensions recognized as xdocs files.
# Default: [".docs.md", ".xdocs.md"]
supported = [".docs.md", ".xdocs.md"]

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

xdocs files are discovered by scanning every directory and subdirectory in the project for files matching the configured extensions. There is no registry, no manifest, no index file.

The scan respects the `[scan].exclude` list to skip directories like `node_modules`, `.git`, and build outputs.

The root `XDOCS.md` is always discovered regardless of extension configuration.

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

3. The npm package remains available as a package-manager convenience and currently ships the Node-compatible JavaScript CLI fallback plus release binaries generated during the publish workflow. A future optional-package model can remove the JavaScript runtime from package-manager installs entirely.

This approach means:

- Direct-install users run a native `xdocs` binary with no Node or Bun runtime dependency.
- Package-manager users keep a familiar dependency workflow.
- Unsupported platforms have a documented manual path: install Bun and run from source/package-manager fallback, or download a compatible release asset manually.

### 7.2 Commands

All commands accept flags to modify their behavior.

#### `xdocs init`

Initializes xdocs in a project.

- Creates the root `XDOCS.md` file.
- Creates `xdocs.config.toml` with defaults.
- Updates the project's `AGENTS.md` to include the xdocs section that points AI agents at the `guiho-as-xdocs` skill.
- Installs the `guiho-as-xdocs` skill to the standard `.agents/skills` location (use `--global` for `~/.agents/skills`, `--tool` to add non-standard targets). The non-standard Claude target is added automatically when a `.claude/` directory or `CLAUDE.md` is detected.

#### `xdocs scan`

Scans the project for xdocs files.

- Walks every directory and subdirectory (respecting exclude rules).
- Matches files against configured extensions.
- Reports: files found, directories with coverage, directories missing documentation.
- Output: structured report to stdout.

#### `xdocs generate`

Generates documentation at a given scope.

- **Directory/module scope** (`xdocs generate ./path/to/module`): scans all files and subdirectories within the target, generates a comprehensive xdocs file for the module with full metadata and body.
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
- `--name=update` -- how to update existing xdocs files after code changes.
- `--name=agents` -- how to update AGENTS.md with xdocs instructions.
- `--name=generate` -- how to generate comprehensive documentation for a domain or the full project.

More prompts will be added. Each task gets its own prompt.

#### `xdocs merge`

Merges xdocs files from a scope into a single file.

- `xdocs merge ./path/to/domain` -- takes all xdocs files within the domain directory and produces one consolidated document.
- Output: a single Markdown file with all content merged.

#### `xdocs tree`

Generates the project hierarchy tree.

- Scans all xdocs files, reads their metadata, and assembles the parent-child structure.
- Output: a structural tree showing the module hierarchy with references. Does not list individual files -- shows modules only.
- Can output to stdout or to a Markdown file.

#### `xdocs list`

Lists files in a given scope with descriptions.

- `xdocs list ./path/to/module` -- lists every file in the module with a short description of its purpose (pulled from the `files` metadata field).
- Useful as a quick inventory or manifest.

## 8. Agent Skills and Plugins

### 8.1 Agent Skills

xdocs ships an agent skill that teaches AI agents how to work with xdocs. It is a `SKILL.md` instruction document (installed to `.agents/skills/guiho-as-xdocs/`) that the AI tool reads to understand:

- What xdocs is and how it works.
- When to create, update, or regenerate xdocs files.
- How to use the CLI commands.
- How to respect the configured AI behavior mode (prompt vs auto).
- The metadata schema and file structure conventions.

### 8.2 Installation Targets

The skill ships inside the `@guiho/xdocs` package at `skills/guiho-as-xdocs/SKILL.md` and is installed by the `xdocs agents` commands (and by `xdocs init`). Installation is **standard-first**:

| Target                    | Skill location                                  | When used                                              |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| **agents** (standard)     | `.agents/skills/guiho-as-xdocs/SKILL.md`        | Always. The default. Read by OpenCode, Codex, Jules, and any AGENTS.md tool. |
| **claude** (non-standard) | `.claude/skills/guiho-as-xdocs/SKILL.md`        | Only when requested (`--tool claude`) or detected (a `.claude/` directory or `CLAUDE.md` exists). |

`local` scope installs under the project root; `global` scope installs under the user home directory (`~/.agents/skills/...`). The companion instruction is a small section inserted into `AGENTS.md` (the standard file every tool reads) that tells the agent to load the `guiho-as-xdocs` skill — the skill body itself is large and loaded on demand.

```
xdocs agents install local            # standard target under the project
xdocs agents install global           # standard target under the home directory
xdocs agents install local --tool claude   # explicit non-standard Claude target
xdocs agents install local --tool all      # standard + claude
xdocs agents instructions             # insert/refresh the AGENTS.md section
```

The rule is: **default to the standard target.** Only write non-standard files (`.claude`, `CLAUDE.md`, etc.) when the user asks for them or when those files already exist in the project. Configuration in `xdocs.config.toml` (`[agents]`) controls automation: `auto_agents_md` keeps the AGENTS.md section fresh, `auto_skill_install` installs the global standard skill when missing, and `skill_tool` selects the auto-install target.

## 9. How AI Uses xdocs

The AI workflow with xdocs:

1. **On entering a project**: the AI reads the root `XDOCS.md` and the agent skill file to understand the project structure and xdocs conventions.
2. **On navigating to a module**: the AI reads the module's xdocs file (metadata first, then body if needed) to understand the module without reading every source file.
3. **On modifying code**: based on the configured AI mode:
   - **Prompt mode**: the AI announces that xdocs files need updating and waits for the user.
   - **Auto mode**: the AI updates the relevant xdocs files immediately.
4. **On creating new modules**: the AI creates a new xdocs file with proper metadata (subject, parent, children, files, description).
5. **On request**: the AI uses CLI commands (`xdocs generate`, `xdocs merge`, `xdocs tree`, etc.) to produce documentation artifacts.

## 10. Repository Structure

```
/                                 # repository root
  XDOCS.md                        # root xdocs file for the project
  ARCHITECTURE.md                 # this file
  BRAINSTORM.md                   # brainstorming and vision
  AGENTS.md                       # AI agent instructions
  README.md                       # public-facing README
  CHANGELOG.md                    # release changelog
  TECHNICAL.md                    # technical notes
  TODO.md                         # task list
  xdocs/                          # npm package directory
    package.json
    tsconfig.json
    tsconfig.build.json
    jsr.json
    .npmrc
    source/
      guiho-xdocs.ts              # library entrypoint
      guiho-xdocs-bin.ts          # CLI entrypoint
      commands/
        init.ts
        scan.ts
        generate.ts
        prompt.ts
        merge.ts
        tree.ts
        list.ts
      core/
        config.ts                 # config loading and validation
        discovery.ts              # filesystem scanning and matching
        metadata.ts               # YAML frontmatter parsing and validation
        tree.ts                   # tree assembly and integrity checks
      prompts/
        write.ts
        update.ts
        agents.ts
        generate.ts
    skills/                       # bundled agent skill (shipped inside the package)
      guiho-as-xdocs/
        SKILL.md
    library/                      # tsc output (ignored)
    bin/                          # compiled binaries (ignored)
  skills/                         # repository-root placeholder (.gitkeep)
  docs/                           # documentation (reserved)
  devops/                         # devops configuration
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
| Distribution      | Native binary release assets + package-manager fallback | Direct installers run without Node/Bun; package managers remain convenient. |
| Metadata encoding | YAML frontmatter                 | Standard, supported by every Markdown parser and tool.               |
| Plugin model      | Standard `AGENTS.md` + `.agents/skills` | One `guiho-as-xdocs` skill bundled in the package. Non-standard targets (Claude `.claude/skills`) are opt-in or auto-detected. |
| Tree structure    | Hierarchy (parent-child)         | Not a dependency graph. Containment only.                            |
