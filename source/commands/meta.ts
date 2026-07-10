/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsMetaDescriptor, XDocsMetaScanResult, XDocsParsedArgs } from '../types.js'
import { loadConfigOrDefaults } from '../config.js'
import { XDocsError } from '../errors.js'
import { booleanFlag, stringFlag } from '../flags.js'
import { scanMetadata } from '../meta.js'

/** Run the meta command. */
export const runMeta = async (options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const config = await loadConfigOrDefaults(options)
  const result = await scanMetadata(config, {
    targetPath: parsed.positionals[0],
    includeDocuments: booleanFlag(parsed.flags, 'documents'),
    strict: booleanFlag(parsed.flags, 'strict'),
    owner: stringFlag(parsed.flags, 'owner'),
    tag: stringFlag(parsed.flags, 'tag'),
    keyword: stringFlag(parsed.flags, 'keyword'),
  })

  if (result.strict && result.errors.length > 0) {
    throw new XDocsError(`Metadata scan failed:\n${result.errors.map((error) => `  ${error}`).join('\n')}`)
  }

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  if (options.format === 'markdown') {
    process.stdout.write(renderMetaMarkdown(result))
    return
  }

  process.stdout.write(renderMetaText(result))
}

const renderMetaText = (result: XDocsMetaScanResult): string => {
  const lines = [
    '',
    'xdocs meta',
    '',
    `target: ${result.targetPath}`,
    `descriptors: ${result.descriptors.length}`,
    `documents included: ${result.includeDocuments ? 'yes' : 'no'}`,
  ]

  const filters = renderFilters(result)
  if (filters) lines.push(`filters: ${filters}`)
  if (result.errors.length > 0) lines.push(`metadata errors: ${result.errors.length}`)

  if (result.descriptors.length > 0) {
    lines.push('', 'descriptors:')
    for (const descriptor of result.descriptors) lines.push(...renderDescriptorText(descriptor))
  }

  if (result.errors.length > 0) {
    lines.push('', 'errors:')
    for (const error of result.errors) lines.push(`  ${error}`)
  }

  lines.push('')
  return lines.join('\n')
}

const renderDescriptorText = (descriptor: XDocsMetaDescriptor): string[] => {
  const subject = descriptor.subject ? ` (${descriptor.subject})` : ''
  const status = descriptor.valid ? 'valid' : 'incomplete'
  const lines = [`  ${descriptor.relativePath} [${status}]${subject}`]

  const description = descriptor.frontmatter?.['description']
  if (typeof description === 'string') lines.push(`    ${description}`)

  for (const document of descriptor.documents) {
    const owner = document.owner ? ` owner=${document.owner}` : ''
    const documentStatus = document.valid ? 'valid' : 'incomplete'
    lines.push(`    document ${document.name} [${documentStatus}]${owner}`)
  }

  return lines
}

const renderMetaMarkdown = (result: XDocsMetaScanResult): string => {
  const lines = [
    '# xdocs Metadata',
    '',
    `Target: \`${result.targetPath}\``,
    '',
  ]

  const filters = renderFilters(result)
  if (filters) lines.push(`Filters: ${filters}`, '')

  for (const descriptor of result.descriptors) {
    const subject = descriptor.subject ? ` (${descriptor.subject})` : ''
    lines.push(`## \`${descriptor.relativePath}\`${subject}`, '')
    const description = descriptor.frontmatter?.['description']
    if (typeof description === 'string') lines.push(description, '')

    if (descriptor.documents.length > 0) {
      lines.push('Documents:', '')
      for (const document of descriptor.documents) lines.push(`- \`${document.relativePath}\`${document.owner ? `, owner: \`${document.owner}\`` : ''}`)
      lines.push('')
    }
  }

  if (result.errors.length > 0) {
    lines.push('## Errors', '')
    for (const error of result.errors) lines.push(`- ${error}`)
    lines.push('')
  }

  return lines.join('\n')
}

const renderFilters = (result: XDocsMetaScanResult): string => {
  const filters = [
    result.filters.owner ? `owner=${result.filters.owner}` : undefined,
    result.filters.tag ? `tag=${result.filters.tag}` : undefined,
    result.filters.keyword ? `keyword=${result.filters.keyword}` : undefined,
  ].filter((value): value is string => Boolean(value))

  return filters.join(', ')
}
