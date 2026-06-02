/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { readFileSync } from 'node:fs'

/** Read the package version from package.json. */
export const readPackageVersion = (): string => {
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
  scan                  Scan the project for xdocs files
  generate [path]       Generate documentation for a directory or the project
  prompt                Output a ready-made prompt for AI
  merge [path]          Merge xdocs files from a directory into one file
  tree                  Display the project hierarchy tree
  list [path]           List files with descriptions

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

Usage: xdocs init

Creates:
  - XDOCS.md              Root documentation file
  - xdocs.config.toml     Configuration with defaults
  - Updates AGENTS.md     Adds xdocs instructions for AI agents
  - Installs agent skills Prompts for AI tool and skill directory

Flags:
  --cwd <path>            Target directory (default: current directory)
  --verbose               Show detailed output
`.trim(),

  scan: `
xdocs scan - Scan the project for xdocs files

Usage: xdocs scan

Walks every directory and subdirectory (respecting exclude rules),
matches files against configured extensions, and reports coverage.

Flags:
  --format <format>       Output format: text, json (default: text)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),

  generate: `
xdocs generate - Generate documentation

Usage: xdocs generate [path]

When a path is given, generates an xdocs file for that directory/module.
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
  update                  How to update existing xdocs files after code changes
  agents                  How to update AGENTS.md with xdocs instructions
  generate                How to generate comprehensive documentation

Flags:
  --name <name>           The prompt to output (required)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
`.trim(),

  merge: `
xdocs merge - Merge xdocs files into a single file

Usage: xdocs merge [path]

Takes all xdocs files within the given directory and produces
one consolidated Markdown document.

Flags:
  --output <path>         Output file path (default: stdout)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),

  tree: `
xdocs tree - Display the project hierarchy tree

Usage: xdocs tree

Scans all xdocs files, reads their metadata, and assembles the
parent-child hierarchy. Shows modules only, not individual files.

Flags:
  --format <format>       Output format: text, markdown (default: text)
  --output <path>         Output file path (default: stdout)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),

  list: `
xdocs list - List files with descriptions

Usage: xdocs list [path]

Lists every file in the given scope with a short description
of its purpose, pulled from xdocs metadata.

Flags:
  --format <format>       Output format: text, json (default: text)
  --cwd <path>            Target directory (default: current directory)
  --config <path>         Path to xdocs.config.toml
  --verbose               Show detailed output
`.trim(),
}
