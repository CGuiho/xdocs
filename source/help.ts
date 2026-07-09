/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { readFileSync } from 'node:fs'

export {
  commandHelpRecords,
  readPackageVersion,
  showCommandHelp,
  showCommandHelpDocs,
  showCommandHelpTree,
  showHelp,
  showHelpDocs,
  showHelpTree,
  showVersion,
}

type HelpFlag = {
  readonly name: string
  readonly description: string
}

type HelpExample = {
  readonly command: string
  readonly description: string
}

type HelpRecord = {
  readonly name: string
  readonly summary: string
  readonly usage: readonly string[]
  readonly description: string
  readonly flags: readonly HelpFlag[]
  readonly examples: readonly HelpExample[]
  readonly subcommands?: readonly HelpRecord[]
}

const globalFlags: readonly HelpFlag[] = [
  { name: '-h, --help', description: 'Show help for the CLI or a command.' },
  { name: '-v, --version', description: 'Show the xdocs version.' },
  { name: '--help-tree', description: 'Show the command tree from the current command, including subcommands and flags.' },
  { name: '--help-docs', description: 'Show Markdown documentation for the current command.' },
  { name: '--cwd <path>', description: 'Run as if started in this directory.' },
  { name: '--config <path>', description: 'Path to xdocs.config.toml.' },
  { name: '--format <text|json|markdown>', description: 'Output format for commands that support it.' },
  { name: '--verbose', description: 'Show detailed output.' },
]

const commandHelpRecords: readonly HelpRecord[] = [
  {
    name: 'init',
    summary: 'Initialize xdocs in a project.',
    usage: ['xdocs init [--tool <agents|claude|all>] [--global]'],
    description: 'Creates XDOCS.md, xdocs.config.toml, AGENTS.md instructions, and installs the guiho-s-xdocs agent skill.',
    flags: [
      { name: '--tool <tool>', description: 'agents (standard), claude, or all.' },
      { name: '--global', description: 'Install the skill in the user home skills directory.' },
      ...commonPathFlags(),
    ],
    examples: [
      { command: 'xdocs init', description: 'Initialize xdocs in the current project.' },
      { command: 'xdocs init --tool all', description: 'Install both standard and explicit non-standard skill targets.' },
    ],
  },
  {
    name: 'scan',
    summary: 'Scan for xdocs descriptors and Markdown documents.',
    usage: ['xdocs scan'],
    description: 'Walks the project tree, validates named *.xdocs.md descriptors, and reports same-directory Markdown companion-document coverage.',
    flags: [
      { name: '--format <text|json>', description: 'Output format. Defaults to text.' },
      ...commonPathFlags(),
    ],
    examples: [
      { command: 'xdocs scan', description: 'Print coverage in text format.' },
      { command: 'xdocs scan --format json', description: 'Print scan data as JSON.' },
    ],
  },
  {
    name: 'generate',
    summary: 'Generate documentation for a directory or the project.',
    usage: ['xdocs generate [path]'],
    description: 'Generates Markdown documentation from xdocs metadata. With no path, it generates project-level documentation.',
    flags: [
      { name: '--output <path>', description: 'Write output to a file instead of stdout.' },
      { name: '--format <text|markdown>', description: 'Output format. Defaults to markdown.' },
      ...commonPathFlags(),
    ],
    examples: [
      { command: 'xdocs generate', description: 'Generate project documentation.' },
      { command: 'xdocs generate ./src/auth', description: 'Generate documentation for one module.' },
    ],
  },
  {
    name: 'prompt',
    summary: 'Output a ready-made prompt for AI.',
    usage: ['xdocs prompt --name=<write|update|agents|generate>'],
    description: 'Prints a self-contained instruction prompt for an AI agent to execute a specific xdocs task.',
    flags: [
      { name: '--name <name>', description: 'Prompt name: write, update, agents, or generate.' },
      ...commonPathFlags(),
    ],
    examples: [
      { command: 'xdocs prompt --name=write', description: 'Print the descriptor-writing prompt.' },
      { command: 'xdocs prompt --name update', description: 'Print the descriptor-update prompt.' },
    ],
  },
  {
    name: 'merge',
    summary: 'Merge xdocs descriptors from a directory into one file.',
    usage: ['xdocs merge [path]'],
    description: 'Concatenates all descriptors in a scope into a consolidated Markdown document with source markers.',
    flags: [
      { name: '--output <path>', description: 'Write output to a file instead of stdout.' },
      ...commonPathFlags(),
    ],
    examples: [
      { command: 'xdocs merge ./src/domain', description: 'Merge domain descriptors to stdout.' },
    ],
  },
  {
    name: 'tree',
    summary: 'Display the project hierarchy tree.',
    usage: ['xdocs tree'],
    description: 'Scans descriptors and renders the parent-child containment hierarchy.',
    flags: [
      { name: '--format <text|markdown|json>', description: 'Output format. Defaults to text.' },
      { name: '--output <path>', description: 'Write output to a file instead of stdout.' },
      ...commonPathFlags(),
    ],
    examples: [
      { command: 'xdocs tree', description: 'Print the hierarchy tree.' },
      { command: 'xdocs tree --format json', description: 'Print the tree as JSON.' },
    ],
  },
  {
    name: 'list',
    summary: 'List documented files and documents.',
    usage: ['xdocs list [path]'],
    description: 'Lists implementation files and companion Markdown documents with descriptions pulled from descriptor metadata.',
    flags: [
      { name: '--format <text|json>', description: 'Output format. Defaults to text.' },
      ...commonPathFlags(),
    ],
    examples: [
      { command: 'xdocs list', description: 'List documented files in the project.' },
      { command: 'xdocs list ./src/auth', description: 'List documented files in one scope.' },
    ],
  },
  {
    name: 'agents',
    summary: 'Install the guiho-s-xdocs skill and AGENTS.md instructions.',
    usage: ['xdocs agents install <local|global> [--tool <agents|claude|all>]', 'xdocs agents instructions'],
    description: 'Installs or refreshes the bundled agent skill and maintains the standard AGENTS.md section.',
    flags: [
      { name: '--tool <tool>', description: 'agents (standard), claude, or all.' },
      { name: '--format <text|json>', description: 'Output format. Defaults to text.' },
      ...commonPathFlags(),
    ],
    subcommands: [
      subcommand('install', 'Install the skill under the project or user home directory.', ['xdocs agents install local', 'xdocs agents install global']),
      subcommand('instructions', 'Insert or refresh the xdocs section in AGENTS.md.', ['xdocs agents instructions']),
    ],
    examples: [
      { command: 'xdocs agents install local', description: 'Install the standard local skill.' },
      { command: 'xdocs agents instructions', description: 'Refresh AGENTS.md instructions.' },
    ],
  },
  {
    name: 'upgrade',
    summary: 'Upgrade the installed xdocs native binary.',
    usage: ['xdocs upgrade [--version <version>] [--variant <baseline|default|modern>]', 'xdocs upgrade check', 'xdocs upgrade list'],
    description: 'Downloads the latest compatible GitHub Release binary and replaces the current installed xdocs binary. x64 installs prefer baseline by default.',
    flags: [
      { name: '--version <version>', description: 'Install a specific version instead of latest.' },
      { name: '--arch <x64|arm64>', description: 'Override detected architecture.' },
      { name: '--variant <baseline|default|modern>', description: 'Override x64 variant preference. Defaults to baseline.' },
      { name: '--dry-run', description: 'Print the selected asset and URL without replacing the binary.' },
      { name: '--format <text|json>', description: 'Output format. Defaults to text.' },
    ],
    subcommands: [
      subcommand('check', 'Fetch latest release metadata and report whether an update is available.', ['xdocs upgrade check']),
      subcommand('list', 'List available GitHub Release versions.', ['xdocs upgrade list']),
    ],
    examples: [
      { command: 'xdocs upgrade', description: 'Upgrade to latest compatible release.' },
      { command: 'xdocs upgrade --dry-run', description: 'Preview the selected binary asset.' },
    ],
  },
  {
    name: 'uninstall',
    summary: 'Remove the installed xdocs native binary.',
    usage: ['xdocs uninstall [--dry-run]'],
    description: 'Deletes the current native xdocs executable. On Windows, removal is scheduled after the current process exits.',
    flags: [
      { name: '--dry-run', description: 'Print the executable path without deleting it.' },
      { name: '--format <text|json>', description: 'Output format. Defaults to text.' },
    ],
    examples: [
      { command: 'xdocs uninstall --dry-run', description: 'Show what would be removed.' },
      { command: 'xdocs uninstall', description: 'Remove the installed native binary.' },
    ],
  },
]

function readPackageVersion(): string {
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

function showVersion(): string {
  return `xdocs ${readPackageVersion()}`
}

function showHelp(): string {
  return [
    'xdocs - Structured documentation system for codebases',
    '',
    'Usage: xdocs <command> [options]',
    '',
    'Commands:',
    ...commandHelpRecords.map((command) => `  ${pad(command.name, 18)}${command.summary}`),
    '',
    'Global Flags:',
    ...globalFlags.map((flag) => `  ${pad(flag.name, 28)}${flag.description}`),
    '',
    'Examples:',
    '  xdocs init',
    '  xdocs scan',
    '  xdocs tree',
    '  xdocs upgrade',
    '  xdocs uninstall --dry-run',
  ].join('\n')
}

function showCommandHelp(command: string): string {
  const record = findCommand(command)
  if (!record) return `Unknown command: ${command}\n\nRun \`xdocs --help\` for available commands.`

  return [
    `xdocs ${record.name} - ${record.summary}`,
    '',
    'Usage:',
    ...record.usage.map((usage) => `  ${usage}`),
    '',
    record.description,
    '',
    ...(record.subcommands?.length ? ['Subcommands:', ...record.subcommands.map((sub) => `  ${pad(sub.name, 18)}${sub.summary}`), ''] : []),
    'Flags:',
    ...record.flags.map((flag) => `  ${pad(flag.name, 32)}${flag.description}`),
    '',
    'Examples:',
    ...record.examples.map((example) => `  ${pad(example.command, 42)}${example.description}`),
  ].join('\n').trim()
}

function showHelpTree(command?: string): string {
  const records = command ? [findCommand(command)].filter((record): record is HelpRecord => Boolean(record)) : [...commandHelpRecords]
  if (command && records.length === 0) return `Unknown command: ${command}`

  return [
    command ? `xdocs ${command} command tree` : 'xdocs command tree',
    'The tree shows commands, nested subcommands, and the flags available at each scope.',
    '------------------------------------------------------------',
    ...records.flatMap((record) => renderTreeRecord(record, command ? `xdocs ${record.name}` : `xdocs ${record.name}`, 0)),
  ].join('\n')
}

function showCommandHelpTree(command: string): string {
  return showHelpTree(command)
}

function showHelpDocs(command?: string): string {
  const title = command ? `xdocs ${command}` : 'xdocs CLI'
  const records = command ? [findCommand(command)].filter((record): record is HelpRecord => Boolean(record)) : [...commandHelpRecords]
  if (command && records.length === 0) return `# Unknown command: ${command}\n`

  return [
    `# ${title}`,
    '',
    command ? records[0]?.description ?? '' : 'xdocs is a structured documentation CLI for codebases.',
    '',
    '## Usage',
    '',
    ...records.flatMap((record) => record.usage.map((usage) => `- \`${usage}\``)),
    '',
    '## Commands',
    '',
    ...records.flatMap(renderMarkdownRecord),
  ].join('\n').trim() + '\n'
}

function showCommandHelpDocs(command: string): string {
  return showHelpDocs(command)
}

function commonPathFlags(): readonly HelpFlag[] {
  return [
    { name: '--cwd <path>', description: 'Target directory. Defaults to current directory.' },
    { name: '--config <path>', description: 'Path to xdocs.config.toml.' },
    { name: '--verbose', description: 'Show detailed output.' },
  ]
}

function subcommand(name: string, summary: string, usage: readonly string[]): HelpRecord {
  return { name, summary, usage, description: summary, flags: [], examples: usage.map((command) => ({ command, description: summary })) }
}

function findCommand(command: string): HelpRecord | undefined {
  return commandHelpRecords.find((record) => record.name === command)
}

function renderTreeRecord(record: HelpRecord, label: string, depth: number): string[] {
  const indent = '  '.repeat(depth)
  const lines = [
    `${indent}|- ${label}`,
    `${indent}|  ${record.summary}`,
  ]

  if (record.flags.length > 0) {
    lines.push(`${indent}|  Flags:`)
    for (const flag of record.flags) lines.push(`${indent}|    ${flag.name} - ${flag.description}`)
  }

  for (const subcommand of record.subcommands ?? []) {
    lines.push(...renderTreeRecord(subcommand, `${label} ${subcommand.name}`, depth + 1))
  }

  return lines
}

function renderMarkdownRecord(record: HelpRecord): string[] {
  return [
    `### \`${record.name}\``,
    '',
    record.description,
    '',
    'Usage:',
    '',
    ...record.usage.map((usage) => `- \`${usage}\``),
    '',
    ...(record.flags.length > 0 ? ['Flags:', '', ...record.flags.map((flag) => `- \`${flag.name}\`: ${flag.description}`), ''] : []),
    ...(record.examples.length > 0 ? ['Examples:', '', ...record.examples.map((example) => `- \`${example.command}\`: ${example.description}`), ''] : []),
    ...(record.subcommands?.length ? ['Subcommands:', '', ...record.subcommands.map((sub) => `- \`${sub.name}\`: ${sub.summary}`), ''] : []),
  ]
}

function pad(value: string, length: number): string {
  return value + ' '.repeat(Math.max(1, length - value.length))
}
