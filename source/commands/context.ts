/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsContextEntry, XDocsContextResult, XDocsParsedArgs } from '../types.js'
import { loadConfigOrDefaults } from '../config.js'
import { XDocsError } from '../errors.js'
import { booleanFlag, stringFlag } from '../flags.js'
import { findContext } from '../context.js'

/** Run the context command. */
export const runContext = async (options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const query = parsed.positionals[0]
  if (!query) throw new XDocsError('xdocs context requires a query. Example: xdocs context "auth sessions"')

  const config = await loadConfigOrDefaults(options)
  const result = await findContext(config, query, {
    targetPath: parsed.positionals[1],
    includeDocuments: booleanFlag(parsed.flags, 'documents'),
    includeFiles: booleanFlag(parsed.flags, 'files'),
    limit: parseLimit(stringFlag(parsed.flags, 'limit')),
    owner: stringFlag(parsed.flags, 'owner'),
    tag: stringFlag(parsed.flags, 'tag'),
    keyword: stringFlag(parsed.flags, 'keyword'),
  })

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  if (options.format === 'markdown') {
    process.stdout.write(renderContextMarkdown(result, booleanFlag(parsed.flags, 'explain')))
    return
  }

  process.stdout.write(renderContextText(result, booleanFlag(parsed.flags, 'explain')))
}

const parseLimit = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new XDocsError(`Invalid --limit value: "${value}". Expected a positive integer.`)
  return parsed
}

const renderContextText = (result: XDocsContextResult, explain: boolean): string => {
  const lines = [
    '',
    'xdocs context',
    '',
    `query: ${result.query}`,
    `target: ${result.targetPath}`,
    `entries: ${result.entries.length}`,
  ]

  if (result.entries.length > 0) {
    lines.push('', 'matches:')
    for (const entry of result.entries) lines.push(...renderContextEntryText(entry, explain))
  }

  lines.push('')
  return lines.join('\n')
}

const renderContextEntryText = (entry: XDocsContextEntry, explain: boolean): string[] => {
  const lines = [`  ${entry.kind} ${entry.path} (score ${entry.score})`]
  if (entry.description) lines.push(`    ${entry.description}`)
  if (explain && entry.reasons.length > 0) lines.push(`    reasons: ${entry.reasons.join(', ')}`)
  return lines
}

const renderContextMarkdown = (result: XDocsContextResult, explain: boolean): string => {
  const lines = [
    '# xdocs Context',
    '',
    `Query: \`${result.query}\``,
    `Target: \`${result.targetPath}\``,
    '',
  ]

  for (const entry of result.entries) {
    lines.push(`- **${entry.kind}** \`${entry.path}\` (score ${entry.score})`)
    if (entry.description) lines.push(`  ${entry.description}`)
    if (explain && entry.reasons.length > 0) lines.push(`  Reasons: ${entry.reasons.join(', ')}`)
  }

  lines.push('')
  return lines.join('\n')
}
