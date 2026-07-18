/**
 * Developer Context help generated from the live Citty command tree.
 */

import type { ArgDef, CommandDef } from 'citty'
import packageJson from '../package.json' with { type: 'json' }

type AnyCommand = CommandDef<any>
type XDocsCommandMeta = {
  description?: string
  hidden?: boolean
  examples?: readonly string[]
}

export function readPackageVersion(): string {
  const embedded = globalThis.__XDOCS_EMBEDDED_RESOURCES__?.version
  if (embedded) return embedded
  return typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'
}

export const showVersion = (): string => `xdocs ${readPackageVersion()}`

export function showHelpTree(command: AnyCommand, commandPath = 'xdocs', depth?: number): string {
  return ['COMMAND TREE', '', ...renderTree(command, commandPath, '', true, 0, depth)].join('\n')
}

export function showHelpDocs(command: AnyCommand, commandPath = 'xdocs', depth?: number): string {
  return renderDocs(command, commandPath, 0, depth).join('\n').trimEnd() + '\n'
}

function renderTree(
  command: AnyCommand,
  label: string,
  prefix: string,
  last: boolean,
  level: number,
  maxDepth?: number,
): string[] {
  const branch = level === 0 ? '' : last ? '└── ' : '├── '
  const meta = command.meta as XDocsCommandMeta | undefined
  const description = meta?.description ? `  ${meta.description}` : ''
  const lines = [`${prefix}${branch}${label}${description}`]
  if (maxDepth !== undefined && level >= maxDepth) return lines
  const childPrefix = level === 0 ? '' : `${prefix}${last ? '    ' : '│   '}`
  const entries: Array<{ label: string, command?: AnyCommand, description: string }> = []

  for (const [name, arg] of Object.entries(command.args ?? {}) as Array<[string, ArgDef]>) {
    if (name === 'help') continue
    entries.push({ label: formatFlag(name, arg), description: arg.description ?? '' })
  }
  for (const [name, child] of Object.entries(staticSubCommands(command))) {
    const childMeta = child.meta as XDocsCommandMeta | undefined
    entries.push({ label: name, command: child, description: childMeta?.description ?? '' })
  }

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1
    if (entry.command) {
      lines.push(...renderTree(entry.command, entry.label, childPrefix, isLast, level + 1, maxDepth))
    } else {
      lines.push(`${childPrefix}${isLast ? '└── ' : '├── '}${entry.label}${entry.description ? `  ${entry.description}` : ''}`)
    }
  })
  return lines
}

function renderDocs(command: AnyCommand, path: string, level: number, maxDepth?: number): string[] {
  const lines = [
    `${'#'.repeat(Math.min(level + 1, 6))} ${path}`,
    '',
    (command.meta as XDocsCommandMeta | undefined)?.description ?? '',
    '',
    '## Syntax',
    '',
    `\`${syntax(command, path)}\``,
    '',
  ]
  const args = Object.entries(command.args ?? {}) as Array<[string, ArgDef]>
  if (args.length > 0) {
    lines.push('## Positionals and flags', '')
    for (const [name, arg] of args) lines.push(`- \`${formatFlag(name, arg)}\`: ${arg.description ?? ''}`)
    lines.push('')
  }
  const children = Object.entries(staticSubCommands(command))
  if (children.length > 0) {
    lines.push('## Subcommands', '')
    for (const [name, child] of children) lines.push(`- \`${name}\`: ${(child.meta as XDocsCommandMeta | undefined)?.description ?? ''}`)
    lines.push('')
  }
  const examples = (command.meta as XDocsCommandMeta | undefined)?.examples ?? []
  if (examples.length > 0) {
    lines.push('## Examples', '')
    for (const example of examples) lines.push(`- \`${example}\``)
    lines.push('')
  }
  if (maxDepth === undefined || level < maxDepth) {
    for (const [name, child] of children) lines.push(...renderDocs(child, `${path} ${name}`, level + 1, maxDepth))
  }
  return lines
}

function syntax(command: AnyCommand, path: string): string {
  const args = (Object.entries(command.args ?? {}) as Array<[string, ArgDef]>).map(([name, arg]) => {
    if (arg.type === 'positional') return arg.required === false ? `[${name}]` : `<${name}>`
    return arg.type === 'boolean' ? `[--${name}]` : `[--${name} <value>]`
  })
  if (Object.keys(staticSubCommands(command)).length > 0) args.push('<command>')
  return [path, ...args].join(' ')
}

function formatFlag(name: string, arg: ArgDef): string {
  if (arg.type === 'positional') return arg.required === false ? `[${name}]` : `<${name}>`
  const alias = 'alias' in arg && arg.alias
    ? `${Array.isArray(arg.alias) ? arg.alias.map((value) => `-${value}`).join(', ') : `-${arg.alias}`}, `
    : ''
  return arg.type === 'boolean' ? `${alias}--${name}` : `${alias}--${name} <${arg.valueHint ?? 'value'}>`
}

function staticSubCommands(command: AnyCommand): Record<string, AnyCommand> {
  const value = command.subCommands
  if (!value || typeof value === 'function' || value instanceof Promise) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, AnyCommand>)
      .filter(([, child]) => !(child.meta as XDocsCommandMeta | undefined)?.hidden),
  )
}
