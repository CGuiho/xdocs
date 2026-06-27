# XDocs

**Structured documentation system for codebases. Helps AI make sense of projects.**

**npm package:** [@guiho/xdocs](https://www.npmjs.com/package/@guiho/xdocs)

xdocs is a CLI and TypeScript library that places structured documentation files throughout your project so that AI agents (and humans) can navigate, understand, and work within a codebase without reading every file. Each xdocs file describes the directory it lives in -- its purpose, its files, and how it fits into the project hierarchy.

```text
codebase -> xdocs files -> AI understands the project
```

xdocs runs on **Bun** and **Node >= 20**. It ships as a compiled binary, a thin JS loader for `npx`/`bunx`, and a fully-typed TypeScript library.

---

## Quick Start

### Installation

Direct native binary install (no Node.js or Bun required after installation):

```bash
curl -fsSL https://raw.githubusercontent.com/CGuiho/xdocs/main/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/CGuiho/xdocs/main/install.ps1 | iex
```

Set `XDOCS_VERSION=0.2.3` (or the full tag `@guiho/xdocs@0.2.3`) before running an installer to pin a specific release instead of installing the latest.

Package-manager install (convenient for JavaScript projects; downloads the matching native binary during `postinstall`, then runs the native binary):

```bash
npm install -D @guiho/xdocs
# or
bun add -d @guiho/xdocs
```

Native release assets are published for Linux x64/arm64, macOS x64/arm64, and Windows x64. Windows arm64 is not published yet. Package-manager installs require Node.js only during installation for the `postinstall` downloader; running `xdocs` afterwards executes the native binary.

### Initializing

Set up xdocs in your project:

```bash
xdocs init
```

This creates:
- `XDOCS.md` -- the single frontmatter-less repository index listing packages/applications
- `xdocs.config.toml` -- configuration with sensible defaults
- Updates `AGENTS.md` with instructions for AI agents
- Installs the `guiho-s-xdocs` agent skill (standard `.agents/skills`)

### Typical Workflow

```bash
# Scan the project for existing xdocs files
xdocs scan

# Generate documentation for a specific module
xdocs generate ./src/auth

# View the project hierarchy
xdocs tree

# Get a ready-made prompt for AI to write documentation
xdocs prompt --name=write
```

---

## Documentation

### The Problem

When AI works on a codebase, most of the structural knowledge lives in the head of the person who built it. The AI has no understanding of _why_ files exist, _what purpose_ a directory serves, or _how_ modules relate to each other. To figure this out, it must read every file and piece things together -- slow, expensive, and error-prone.

### The Solution

xdocs solves this by placing documentation files throughout the project. Each xdocs file describes the directory it lives in, acting as a self-contained map of that module. Instead of opening every file to understand a directory, the AI reads its xdocs file.

### File Format

xdocs files are Markdown with YAML frontmatter. A file is recognized as an xdocs file if it ends with one of the configured extensions (default: `.docs.md`, `.xdocs.md`).

```markdown
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
  session.ts: Manages session creation, validation, and expiration.
tags: []
flags: []
---

## Overview

The authentication module handles all identity verification flows...
```

#### Metadata Fields

| Field         | Type                  | Required | Description                                                   |
| ------------- | --------------------- | -------- | ------------------------------------------------------------- |
| `subject`     | `string`              | Yes      | The name of this module/subject.                              |
| `description` | `string`              | Yes      | A short description the AI reads first to understand the module. |
| `parent`      | `string \| null`      | Yes      | The parent subject in the hierarchy. `null` for the root.     |
| `children`    | `string[]`            | Yes      | Child subjects (submodules) contained within this module.     |
| `files`       | `map<string, string>` | Yes      | Files in this directory. Key = filename, value = description. |
| `tags`        | `string[]`            | Yes      | Tags for categorization and search.                           |
| `flags`       | `string[]`            | Yes      | Flags for marking attributes or states.                       |
| `status`      | `string`              | No       | Module status (e.g., `active`, `deprecated`, `experimental`). |

### The Tree

xdocs files form a hierarchy through their `subject`, `parent`, and `children` fields. The tree represents containment -- not dependencies -- and is computed by scanning all xdocs files.

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

The CLI validates tree integrity: no orphan subjects, no missing parents, no cycles.

### CLI Commands

#### `xdocs init`

Initializes xdocs in a project. Creates the root `XDOCS.md`, the `xdocs.config.toml` configuration, updates `AGENTS.md`, and installs or refreshes the `guiho-s-xdocs` skill to the standard `.agents/skills` location.

#### `xdocs scan`

Scans the project for xdocs files. Reports which directories have coverage and which are missing documentation.

```bash
xdocs scan
xdocs scan --format json
```

#### `xdocs generate [path]`

Generates documentation for a directory or the entire project.

```bash
# Generate docs for a specific module
xdocs generate ./src/auth

# Generate docs for the entire project
xdocs generate
```

#### `xdocs prompt --name=<name>`

Outputs a ready-made prompt for AI agents. Each prompt is a self-contained instruction for a specific xdocs task. Prompts are selected by the `--name` flag, not by subcommand.

```bash
xdocs prompt --name=write      # How to write xdocs documentation
xdocs prompt --name=update     # How to update existing xdocs files
xdocs prompt --name=agents     # How to update AGENTS.md
xdocs prompt --name=generate   # How to generate comprehensive docs
```

#### `xdocs merge [path]`

Merges xdocs files from a directory into a single consolidated document.

```bash
xdocs merge ./src/domain
```

#### `xdocs tree`

Displays the project hierarchy tree assembled from xdocs metadata.

```bash
xdocs tree
xdocs tree --format markdown --output tree.md
```

#### `xdocs list [path]`

Lists files in a scope with descriptions pulled from xdocs metadata.

```bash
xdocs list ./src/auth
```

#### `xdocs agents`

Installs the `guiho-s-xdocs` agent skill and maintains the `AGENTS.md` section.

```bash
xdocs agents install local     # install the skill under the project (.agents/skills)
xdocs agents install global    # install the skill under ~/.agents/skills
xdocs agents instructions      # insert/refresh the xdocs section in AGENTS.md
```

Accepts `--tool <agents|claude|all>`. See [Agent Skills](#agent-skills) for details.

#### Global Flags

All commands accept:

| Flag              | Description                                  |
| ----------------- | -------------------------------------------- |
| `-h`, `--help`    | Show help for a command                      |
| `-v`, `--version` | Show the xdocs version                       |
| `--cwd <path>`    | Run as if started in the given directory      |
| `--config <path>` | Path to `xdocs.config.toml`                  |
| `--format <fmt>`  | Output format: `text`, `json`, or `markdown` |
| `--verbose`       | Show detailed output                         |

### Configuration (`xdocs.config.toml`)

xdocs looks for configuration at `./xdocs.config.toml`, `./config/xdocs.config.toml`, or the path given by `--config`.

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

[agents]
# Keep the xdocs section in AGENTS.md fresh on normal commands. Default: true
auto_agents_md = true
# Install or refresh the standard skill globally from the bundled copy. Default: true
auto_skill_install = true
# Default target for skill auto-install: "agents" (standard) or "claude". Default: "agents"
skill_tool = "agents"
```

### Agent Skills

xdocs ships the `guiho-s-xdocs` agent skill that teaches AI tools how to work with xdocs -- when to create, update, or regenerate documentation, how to use the CLI, and how to respect the configured AI behavior mode. The skill is versioned in its frontmatter, large, and loaded on demand; a small section in `AGENTS.md` points the agent at it.

Installation is **standard-first**:

| Target                    | Location                                            | When installed                                                  |
| ------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| **agents** (standard)     | `.agents/skills/guiho-s-xdocs/SKILL.md`            | Always (default). Read by OpenCode, Codex, Jules, and any AGENTS.md tool. |
| **claude** (non-standard) | `.claude/skills/guiho-s-xdocs/SKILL.md`            | When `--tool claude` is given, or a `.claude/` dir or `CLAUDE.md` is detected. |

```bash
xdocs agents install local     # standard target, under the project
xdocs agents install global    # standard target, under ~/.agents/skills
xdocs agents instructions      # insert/refresh the AGENTS.md section
```

`xdocs init` runs this automatically for the standard target (`local` scope). `local` scope installs under the project; `global` installs under your home directory. The default is always the standard target -- non-standard files are written only when you ask (`--tool`) or when they are already present. Installation removes legacy `guiho-as-xdocs` skill directories and replaces `guiho-s-xdocs` when the bundled version or content differs.

---

## API Reference

xdocs exposes a fully-typed TypeScript API for programmatic use.

### Configuration

```ts
import { loadConfig, loadConfigOrDefaults, defaultConfig } from '@guiho/xdocs'

// Load config from xdocs.config.toml (throws if not found)
const config = await loadConfig({ cwd: process.cwd(), format: 'text', verbose: false })

// Load config or fall back to defaults
const configOrDefaults = await loadConfigOrDefaults({ cwd: process.cwd(), format: 'text', verbose: false })
```

### Discovery and Scanning

```ts
import { scanProject, scanDirectory, isXDocsFile } from '@guiho/xdocs'

// Scan the entire project
const result = await scanProject(config)
console.log(result.totalFiles)           // Total files found
console.log(result.xdocsFiles)           // Array of XDocsFile objects
console.log(result.uncoveredPaths)       // Directories without xdocs coverage

// Check if a file is an xdocs file
isXDocsFile('auth.xdocs.md', ['.docs.md', '.xdocs.md'])  // true
```

### Metadata Parsing

```ts
import { parseXDocsFile, extractFrontmatter, validateMetadata } from '@guiho/xdocs'

// Parse an xdocs file from disk
const file = await parseXDocsFile('/path/to/auth.xdocs.md', process.cwd())
console.log(file.metadata?.subject)       // "authentication"
console.log(file.metadata?.description)   // "Handles user login..."
console.log(file.valid)                   // true if metadata is complete
```

### Tree Operations

```ts
import { buildTree, renderTree, renderTreeMarkdown, validateTree } from '@guiho/xdocs'

// Build the hierarchy tree from scanned files
const tree = buildTree(result.xdocsFiles)

// Render as indented text
console.log(renderTree(tree))

// Render as Markdown
console.log(renderTreeMarkdown(tree))

// Validate tree integrity
const validation = validateTree(result.xdocsFiles)
console.log(validation.valid)    // true if no orphans or cycles
console.log(validation.errors)   // Array of error messages
```

### Prompts

```ts
import { getPrompt, getPromptNames } from '@guiho/xdocs'

// List all available prompt names
console.log(getPromptNames())  // ["write", "update", "agents", "generate"]

// Get a specific prompt
const prompt = getPrompt('write')
console.log(prompt?.description)
console.log(prompt?.body)
```

---

## Development

Development requires Bun. Run from the `xdocs/` directory:

```bash
cd xdocs
bun install
bun run typecheck
bun test
bun run build
bun run binary
```

---

## License

MIT -- see [LICENSE.md](xdocs/LICENSE.md).
