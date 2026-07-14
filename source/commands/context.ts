/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsContextEntry, XDocsContextResult } from '../types.js'
import { loadConfigOrDefaults } from '../config.js'
import { findContext } from '../context.js'

type XDocsContextInput = {
  query: string
  targetPath?: string
  includeDocuments?: boolean
  includeFiles?: boolean
  limit?: number
  owner?: string
  tag?: string
  keyword?: string
  explain?: boolean
}

/** Run the context command. */
export const runContext = async (options: XDocsCliOptions, input: XDocsContextInput): Promise<void> => {
  const config = await loadConfigOrDefaults(options)
  const result = await findContext(config, input.query, {
    targetPath: input.targetPath,
    includeDocuments: input.includeDocuments,
    includeFiles: input.includeFiles,
    limit: input.limit,
    owner: input.owner,
    tag: input.tag,
    keyword: input.keyword,
  })

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  if (options.format === 'markdown') {
    process.stdout.write(renderContextMarkdown(result, Boolean(input.explain)))
    return
  }

  process.stdout.write(renderContextText(result, Boolean(input.explain)))
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
