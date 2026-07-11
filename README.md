# XDocs

**Structured documentation system for codebases. Helps AI make sense of projects.**

xdocs is a CLI tool that places named `*.xdocs.md` descriptors throughout your project so that AI agents (and humans) can navigate, understand, and work within a codebase without reading every file. Each descriptor describes the directory it lives in -- its purpose, searchable keywords, its files, its companion Markdown documents, and how it fits into the project hierarchy.

```text
codebase -> named *.xdocs.md descriptors + companion *.md documents -> AI understands the project
```

xdocs ships as a single native binary — no Node.js, Bun, or runtime required.

---

## Quick Start

### Installation

Download and run the installer:

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1 | iex
```

The installers download native binaries from GitHub Releases, install `xdocs` into `~/.local/bin` by default, and add that directory to your user PATH when possible. x64 installs prefer the `baseline` variant first for maximum compatibility, then fall back to the default and `modern` variants.

The Windows PowerShell installer returns after success instead of calling `exit`, so it does not intentionally close the host PowerShell session.

**Flags and options:**

```bash
# Pin a specific version
curl .../install.sh | bash -s -- --version 0.4.7

# Force architecture and variant
curl .../install.sh | bash -s -- --arch arm64
curl .../install.sh | bash -s -- --arch x64 --variant modern
curl .../install.sh | bash -s -- --arch x64 --variant default

# Custom install directory
curl .../install.sh | bash -s -- --install-dir /usr/local/bin
```

PowerShell examples:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1))) -Version 0.4.7
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1))) -Arch x64 -Variant baseline
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1))) -InstallDir "$HOME\.local\bin"
```

Or download the script first and run with flags directly:
```bash
curl -O https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.sh
chmod +x install.sh
./install.sh --version latest --arch x64 --variant baseline
```

Native binaries are built and uploaded for all supported OS/architecture/variant combinations:

| OS | ARM64 | x64 baseline | x64 default | x64 modern |
| --- | --- | --- | --- | --- |
| Linux | `xdocs-linux-arm64` | `xdocs-linux-x64-baseline` | `xdocs-linux-x64` | `xdocs-linux-x64-modern` |
| macOS | `xdocs-macos-arm64` | `xdocs-macos-x64-baseline` | `xdocs-macos-x64` | `xdocs-macos-x64-modern` |
| Windows | `xdocs-windows-arm64.exe` | `xdocs-windows-x64-baseline.exe` | `xdocs-windows-x64.exe` | `xdocs-windows-x64-modern.exe` |

CI builds the same 12 native binaries with Bun. Version-tag releases upload `bin/xdocs-*` to the matching GitHub Release with `gh` and verify that all 12 assets are present.

If your current shell does not see the updated PATH immediately, open a new terminal or run one of these commands:

```bash
# bash/zsh
export PATH="$HOME/.local/bin:$PATH"

# fish
fish_add_path "$HOME/.local/bin"
```

```powershell
$env:Path = "$HOME\.local\bin;$env:Path"
[Environment]::SetEnvironmentVariable('Path', "$HOME\.local\bin;" + [Environment]::GetEnvironmentVariable('Path', 'User'), 'User')
```

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
# Scan the project for xdocs descriptors and companion Markdown documents
xdocs scan

# Generate documentation for a specific module
xdocs generate ./src/auth

# View the project hierarchy
xdocs tree

# Read descriptor + companion document frontmatter before full files
xdocs meta ./src --documents --format json

# Ask xdocs what an AI should read for a task
xdocs context "authentication sessions" --documents --files --format json

# Validate xdocs health in CI
xdocs doctor

# Get a ready-made prompt for AI to write documentation
xdocs prompt --name=write
```

Self-manage the installed native CLI:

```bash
xdocs upgrade              # upgrade to the latest GitHub Release binary
xdocs upgrade check        # check for a newer version now
xdocs upgrade list         # list available release versions
xdocs uninstall --dry-run  # preview the executable that would be removed
```

A bare `xdocs` invocation never waits on network update checks. It starts a
background update check when appropriate, writes the result to the user cache,
and on the next bare run prints a notice such as `xdocs 0.5.0 is available. Run
\`xdocs upgrade\` to update.`

---

## Documentation

### The Problem

When AI works on a codebase, most of the structural knowledge lives in the head of the person who built it. The AI has no understanding of _why_ files exist, _what purpose_ a directory serves, or _how_ modules relate to each other. To figure this out, it must read every file and piece things together -- slow, expensive, and error-prone.

### The Solution

xdocs solves this by placing named descriptors throughout the project. Each `*.xdocs.md` descriptor describes the directory it lives in, acting as a self-contained map of that module. Instead of opening every file to understand a directory, the AI reads descriptor frontmatter first and opens listed companion documents only when relevant.

### File Format

xdocs descriptors are Markdown files with YAML frontmatter and a required name before the `.xdocs.md` suffix, such as `authentication.xdocs.md`. A file named only `.xdocs.md` is invalid. Same-directory plain `*.md` files are companion documents and must be listed in `documents`.

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
documents:
  authentication-implementation.md: Detailed implementation notes and decisions.
tags: []
keywords:
  - authentication
  - sessions
  - identity
flags: []
---

## Overview

The authentication module handles all identity verification flows...
```

Ordinary same-directory companion `.md` files should also have YAML
frontmatter. Use `owner` to point back to the owning descriptor `subject`, and
include `keywords` for search/matching:

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
owner: authentication
---
```

#### Metadata Fields

| Field         | Type                  | Required | Description                                                   |
| ------------- | --------------------- | -------- | ------------------------------------------------------------- |
| `subject`     | `string`              | Yes      | The name of this module/subject.                              |
| `description` | `string`              | Yes      | A short description the AI reads first to understand the module. |
| `parent`      | `string \| null`      | Yes      | The parent subject in the hierarchy. `null` for the root.     |
| `children`    | `string[]`            | Yes      | Child subjects (submodules) contained within this module.     |
| `files`       | `map<string, string>` | Yes      | Files in this directory. Key = filename, value = description. |
| `documents`   | `map<string, string>` | Yes      | Same-directory plain Markdown documents. Key = filename, value = description. |
| `tags`        | `string[]`            | Yes      | Tags for categorization and search.                           |
| `keywords`    | `string[]`            | Yes      | Search terms and concepts agents can use to match requests.   |
| `flags`       | `string[]`            | Yes      | Flags for marking attributes or states.                       |
| `status`      | `string`              | No       | Module status (e.g., `active`, `deprecated`, `experimental`). |

### The Tree

xdocs descriptors form a hierarchy through their `subject`, `parent`, and `children` fields. The tree represents containment -- not dependencies -- and is computed by scanning all named `*.xdocs.md` descriptors.

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

Scans the project for named `*.xdocs.md` descriptors and sibling plain Markdown companion documents. Reports descriptor validity, directory coverage, and companion-document coverage.

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
xdocs prompt --name=write      # How to write a named xdocs descriptor
xdocs prompt --name=update     # How to update existing xdocs descriptors
xdocs prompt --name=agents     # How to update AGENTS.md
xdocs prompt --name=generate   # How to generate comprehensive docs
```

#### `xdocs merge [path]`

Merges xdocs descriptors from a directory into a single consolidated document.

```bash
xdocs merge ./src/domain
```

#### `xdocs tree`

Displays the project hierarchy tree assembled from xdocs metadata.

```bash
xdocs tree
xdocs tree --format markdown --output tree.md
```

Text output uses pipe-based branch scope markers (`|-` and `|  `) so nested modules remain visually connected.

#### `xdocs list [path]`

Lists implementation files and companion Markdown documents in a scope with descriptions pulled from xdocs metadata.

```bash
xdocs list ./src/auth
```

#### `xdocs meta [path]`

Scans a directory top-down and reads only YAML frontmatter from named `*.xdocs.md` descriptors. Add `--documents` to also read frontmatter from companion `.md` files listed in each descriptor's `documents` map. Use `--owner`, `--tag`, and `--keyword` to filter metadata before an AI agent reads full Markdown bodies.

```bash
xdocs meta ./src --format json
xdocs meta ./src --documents --keyword authentication --format json
xdocs meta --documents --strict
```

#### `xdocs context <query> [path]`

Recommends a minimal reading set for a task using descriptor metadata, companion-document frontmatter, file descriptions, tags, and keywords. This is the command an AI agent should run before opening full files.

```bash
xdocs context "authentication sessions" --documents --files --format json
xdocs context "release skill version" . --tag agents --explain
```

#### `xdocs doctor [path]`

Runs CI-friendly health checks for descriptor validity, companion-document frontmatter, tree integrity, and documented file existence. Companion-document frontmatter issues are warnings by default; add `--warnings-as-errors` to fail CI on them.

```bash
xdocs doctor
xdocs doctor ./src --format json
```

#### `xdocs agents`

Installs the `guiho-s-xdocs` agent skill and maintains the `AGENTS.md` section.

```bash
xdocs agents install local     # install the skill under the project (.agents/skills)
xdocs agents install global    # install the skill under ~/.agents/skills
xdocs agents instructions      # insert/refresh the xdocs section in AGENTS.md
```

Accepts `--tool <agents|claude|all>`. See [Agent Skills](#agent-skills) for details.

#### `xdocs upgrade`

Upgrades the installed native xdocs binary from GitHub Releases. x64 upgrades
prefer the `baseline` binary first, then fall back to the default and `modern`
variants.

```bash
xdocs upgrade
xdocs upgrade --dry-run
xdocs upgrade --version 0.5.0
xdocs upgrade check
xdocs upgrade list
```

#### `xdocs uninstall`

Removes the installed native xdocs executable. On Windows, the removal is
scheduled after the current xdocs process exits.

```bash
xdocs uninstall --dry-run
xdocs uninstall
```

#### Global Flags

All commands accept:

| Flag              | Description                                  |
| ----------------- | -------------------------------------------- |
| `-h`, `--help`    | Show help for a command                      |
| `-v`, `--version` | Show the xdocs version                       |
| `--help-tree`     | Show the command tree from the current command |
| `--help-docs`     | Print Markdown docs for the current command  |
| `--cwd <path>`    | Run as if started in the given directory      |
| `--config <path>` | Path to `xdocs.config.toml`                  |
| `--format <fmt>`  | Output format: `text`, `json`, or `markdown` |
| `--verbose`       | Show detailed output                         |

### Configuration (`xdocs.config.toml`)

xdocs looks for configuration at `./xdocs.config.toml`, `./config/xdocs.config.toml`, or the path given by `--config`.

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

[agents]
# Keep the xdocs section in AGENTS.md fresh on bare and normal commands. Default: true
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

A bare `xdocs` invocation and the normal data commands refresh the global skill before doing their usual work. Without `xdocs.config.toml`, xdocs uses the standard `agents` target; with config, `[agents].skill_tool` can choose the target and `[agents].auto_skill_install = false` can disable the refresh. If the legacy `guiho-as-xdocs` skill exists for that global target, xdocs removes it and writes the bundled `guiho-s-xdocs` skill. The bundled skill frontmatter includes both the legacy top-level `version` and `metadata.version`; release preparation keeps both aligned with the package version.

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
import { scanProject, scanDirectory, isPlainMarkdownDocument, isXDocsDescriptorFile, isXDocsFile } from '@guiho/xdocs'

// Scan the entire project
const result = await scanProject(config)
console.log(result.totalFiles)           // Total files found
console.log(result.xdocsFiles)           // Array of XDocsFile objects
console.log(result.markdownDocuments)    // Companion Markdown documents found
console.log(result.uncoveredPaths)       // Directories without xdocs coverage

// Check descriptor and companion document files
isXDocsFile('auth.xdocs.md')                 // true
isXDocsDescriptorFile('auth.xdocs.md')       // true
isPlainMarkdownDocument('auth-notes.md')     // true
```

### Metadata Parsing

```ts
import { doctorProject, findContext, parseXDocsFile, extractFrontmatter, scanMetadata, validateMetadata } from '@guiho/xdocs'

// Read descriptor and associated companion-document frontmatter only
const metadata = await scanMetadata(config, { targetPath: 'src', includeDocuments: true, keyword: 'authentication' })
console.log(metadata.descriptors)

// Recommend files/docs to read for a task
const context = await findContext(config, 'authentication sessions', { includeDocuments: true, includeFiles: true })
console.log(context.entries)

// Run xdocs health checks
const health = await doctorProject(config)
console.log(health.valid)

// Parse an xdocs descriptor from disk
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

// Render as branch-lined text
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

Development requires Bun. Run from the repository root:

```bash
bun install
bun run typecheck
bun test
bun run build
bun run binary
```

---

## License

MIT -- see [LICENSE.md](LICENSE.md).
