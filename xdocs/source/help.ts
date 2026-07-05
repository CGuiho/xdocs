/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { readFileSync } from 'node:fs'

/** Read the package version from package.json. */
export const readPackageVersion = (): string => {
  const embedded = globalThis.__XDOCS_EMBEDDED_RESOURCES__?.version
  if (embedded) return embedded

  try {
    const raw = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    const pkg = JSON.parse(raw) as Record<string, unknown>
    return typeof pkg['version'] === 'string' ? pkg['version'] : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/** Show the xdocs version string. */
export const showVersion = (): string => `xdocs ${readPackageVersion()}`

/** Show the main help text. */
export const showHelp = (): string => `
xdocs - Structured documentation system for codebases

Usage: xdocs <command> [options]

Commands:
  init                  Initialize xdocs in a project
  scan                  Scan for xdocs descriptors and Markdown documents
  generate [path]       Generate documentation for a directory or the project
  prompt                Output a ready-made prompt for AI
  merge [path]          Merge xdocs descriptors from a directory into one file
  tree                  Display the project hierarchy tree
  list [path]           List documented files and documents
  agents                Install the guiho-s-xdocs skill and AGENTS.md instructions

Global Flags:
  -h, --help            Show help for a command
  -v, --version         Show the xdocs version
  --cwd <path>          Run as if started in this directory
  --config <path>       Path to xdocs.config.toml
  --verbose             Show detailed output

Examples:
  xdocs init
  xdocs scan
  xdocs generate ./src/auth
  xdocs prompt --name=write
  xdocs merge ./src/domain
  xdocs tree
  xdocs list ./src/auth
  xdocs agents install local
  xdocs agents instructions
`.trim()

/** Show help for a specific command. */
export const showCommandHelp = (command: string): string => {
  const help = commandHelpMap[command]
  if (help) return help
  return `Unknown command: ${command}\n\nRun \`xdocs --help\` for available commands.`
}

const commandHelpMap: Record<string, string> = {
  init: `
xdocs init - Initialize xdocs in a project

Usage: xdocs init [--tool <agents|claude|all>] [--global]

Creates:
  - XDOCS.md              Root documentation file
  - xdocs.config.toml     Configuration with defaults
  - Updates AGENTS.md     Adds the xdocs section pointing AI at the skill
  - Installs the skill    guiho-s-xdocs into .agents/skills (standard, local)

By default the skill is installed for the standard target (AGENTS.md +
.agents/skills). The non-standard claude target (.claude/skills) is added only
when a .claude directory or CLAUDE.md is detected, or when requested via --tool.

Flags:
  --tool <tool>           agents (default/standard), claude, or all
  --global                Install the skill in the user home skills directory
  --cwd <path>            Target directory (default: current directory)
  --verbose               Show detailed output
`.trim(),

  scan: `
xdocs scan - Scan the project for xdocs descriptors

Usage: xdocs scan

Walks every directory and subdirectory (respecting exclude rules), finds named
*.xdocs.md descriptor files, and reports plain sibling *.md documents that those
descriptors must list in their documents metadata.

Flags:
  --format <format>       Output format: text, json (default: text)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),

  generate: `
xdocs generate - Generate documentation

Usage: xdocs generate [path]

When a path is given, generates documentation for that directory/module.
When no path is given, generates documentation for the entire project.

Flags:
  --output <path>         Output file path
  --format <format>       Output format: text, markdown (default: markdown)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),

  prompt: `
xdocs prompt - Output a ready-made prompt for AI

Usage: xdocs prompt --name=<name>

Outputs a self-contained instruction prompt for an AI agent to execute
a specific xdocs task. Both flag styles are supported:
  xdocs prompt --name=write
  xdocs prompt --name write

Available prompts:
  write                   How to scan a directory and write xdocs documentation
  update                  How to update existing xdocs descriptors after code changes
  agents                  How to update AGENTS.md with xdocs instructions
  generate                How to generate comprehensive documentation

Flags:
  --name <name>           The prompt to output (required)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
`.trim(),

  merge: `
xdocs merge - Merge xdocs descriptors into a single file

Usage: xdocs merge [path]

Takes all xdocs descriptor files within the given directory and produces
one consolidated Markdown document, including listed companion documents.

Flags:
  --output <path>         Output file path (default: stdout)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),

  tree: `
xdocs tree - Display the project hierarchy tree

Usage: xdocs tree

Scans all xdocs descriptors, reads their metadata, and assembles the
parent-child hierarchy. Shows modules only, not individual files.

Flags:
  --format <format>       Output format: text, markdown (default: text)
  --output <path>         Output file path (default: stdout)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),

  list: `
xdocs list - List documented files and documents

Usage: xdocs list [path]

Lists every source file and companion Markdown document in the given scope with
a short description pulled from xdocs metadata.

Flags:
  --format <format>       Output format: text, json (default: text)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),

  agents: `
xdocs agents - Install the guiho-s-xdocs skill and AGENTS.md instructions

Usage:
  xdocs agents install <local|global> [--tool <tool>]
  xdocs agents instructions

Subcommands:
  install local           Install the skill under the current project
  install global          Install the skill under the user home directory
  instructions            Insert or refresh the xdocs section in AGENTS.md

Skill locations:
  agents (standard)       <root>/.agents/skills/guiho-s-xdocs/SKILL.md
  claude (non-standard)   <root>/.claude/skills/guiho-s-xdocs/SKILL.md

<root> is the project for local scope, or the user home directory for global.
Without --tool, the standard agents target is installed, plus claude when a
.claude directory or CLAUDE.md is detected. Codex, Jules, and other AGENTS.md
tools read the standard target and the AGENTS.md instructions.

Flags:
  --tool <tool>           agents (default/standard), claude, or all
  --format <format>       Output format: text, json (default: text)
  --cwd <path>            Target directory (default: current directory)
`.trim(),
}
