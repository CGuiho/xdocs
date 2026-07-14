/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsDoctorIssue, XDocsDoctorResult } from '../types.js'
import { loadConfigOrDefaults } from '../config.js'
import { XDocsError } from '../errors.js'
import { doctorProject } from '../doctor.js'

type XDocsDoctorInput = {
  targetPath?: string
  includeDocuments?: boolean
  warningsAsErrors?: boolean
}

/** Run the doctor command. */
export const runDoctor = async (options: XDocsCliOptions, input: XDocsDoctorInput = {}): Promise<void> => {
  const config = await loadConfigOrDefaults(options)
  const result = await doctorProject(config, {
    targetPath: input.targetPath,
    includeDocuments: input.includeDocuments,
    warningsAsErrors: input.warningsAsErrors,
  })

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  } else if (options.format === 'markdown') {
    process.stdout.write(renderDoctorMarkdown(result))
  } else {
    process.stdout.write(renderDoctorText(result))
  }

  if (!result.valid) throw new XDocsError(`xdocs doctor found ${result.summary.errors} error(s).`)
}

const renderDoctorText = (result: XDocsDoctorResult): string => {
  const lines = [
    '',
    'xdocs doctor',
    '',
    `target: ${result.targetPath}`,
    `valid: ${result.valid}`,
    `errors: ${result.summary.errors}`,
    `warnings: ${result.summary.warnings}`,
  ]

  if (result.issues.length > 0) {
    lines.push('', 'issues:')
    for (const issue of result.issues) lines.push(renderIssueText(issue))
  }

  lines.push('')
  return lines.join('\n')
}

const renderIssueText = (issue: XDocsDoctorIssue): string => {
  const path = issue.path ? `${issue.path}: ` : ''
  return `  ${issue.severity} ${issue.code}: ${path}${issue.message}`
}

const renderDoctorMarkdown = (result: XDocsDoctorResult): string => {
  const lines = [
    '# xdocs Doctor',
    '',
    `Target: \`${result.targetPath}\``,
    `Valid: \`${result.valid}\``,
    `Errors: \`${result.summary.errors}\``,
    `Warnings: \`${result.summary.warnings}\``,
    '',
  ]

  if (result.issues.length > 0) {
    lines.push('## Issues', '')
    for (const issue of result.issues) {
      const path = issue.path ? ` \`${issue.path}\`` : ''
      lines.push(`- **${issue.severity}** \`${issue.code}\`${path}: ${issue.message}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
