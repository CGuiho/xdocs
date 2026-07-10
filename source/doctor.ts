/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { stat } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import type { XDocsConfig, XDocsDoctorIssue, XDocsDoctorOptions, XDocsDoctorResult } from './types.js'
import { scanProject } from './discovery.js'
import { scanMetadata } from './meta.js'
import { validateTree } from './tree.js'

export {
  doctorProject,
}

/** Run strict xdocs health checks for descriptors, tree links, documents, and file references. */
const doctorProject = async (config: XDocsConfig, options: XDocsDoctorOptions = {}): Promise<XDocsDoctorResult> => {
  const targetPath = resolve(config.cwd, options.targetPath ?? config.cwd)
  const issues: XDocsDoctorIssue[] = []
  const scan = await scanProject(config)
  const metadata = await scanMetadata(config, { targetPath: options.targetPath, includeDocuments: options.includeDocuments ?? true })
  const treeValidation = validateTree(scan.xdocsFiles)
  const targetPrefix = relative(config.cwd, targetPath)

  for (const file of scan.xdocsFiles.filter((entry) => isInScope(entry.relativePath, targetPrefix))) {
    for (const error of file.errors) {
      issues.push({ severity: 'error', code: 'descriptor-invalid', path: file.relativePath, message: error })
    }
  }

  for (const descriptor of metadata.descriptors) {
    for (const error of descriptor.errors) {
      issues.push({ severity: 'error', code: 'metadata-invalid', path: descriptor.relativePath, message: error })
    }

    for (const document of descriptor.documents) {
      for (const error of document.errors) {
        issues.push({
          severity: options.warningsAsErrors ? 'error' : 'warning',
          code: 'document-metadata',
          path: document.relativePath,
          message: error,
        })
      }
    }
  }

  for (const error of treeValidation.errors) {
    issues.push({ severity: 'error', code: 'tree-invalid', path: null, message: error })
  }

  for (const warning of treeValidation.warnings) {
    issues.push({ severity: options.warningsAsErrors ? 'error' : 'warning', code: 'tree-warning', path: null, message: warning })
  }

  for (const descriptor of metadata.descriptors) {
    if (!descriptor.metadata) continue

    for (const fileName of Object.keys(descriptor.metadata.files)) {
      if (!isSiblingFileName(fileName)) {
        issues.push({ severity: 'error', code: 'file-entry-invalid', path: descriptor.relativePath, message: `Invalid file entry: "${fileName}" must be a sibling filename, not a path.` })
        continue
      }

      const filePath = join(descriptor.directory, fileName)
      const fileStat = await stat(filePath).catch(() => null)
      if (!fileStat?.isFile()) {
        issues.push({ severity: 'error', code: 'file-missing', path: descriptor.relativePath, message: `Missing documented file: "${fileName}" is listed in metadata but does not exist beside the descriptor.` })
      }
    }
  }

  const dedupedIssues = dedupeIssues(issues)
  const errors = dedupedIssues.filter((issue) => issue.severity === 'error').length
  const warnings = dedupedIssues.filter((issue) => issue.severity === 'warning').length

  return {
    root: config.cwd,
    targetPath: relative(config.cwd, targetPath) || '.',
    valid: errors === 0,
    summary: { errors, warnings },
    issues: dedupedIssues,
  }
}

const isInScope = (relativePath: string, targetPrefix: string): boolean => {
  if (!targetPrefix) return true
  return relativePath === targetPrefix || relativePath.startsWith(`${targetPrefix}\\`) || relativePath.startsWith(`${targetPrefix}/`)
}

const isSiblingFileName = (name: string): boolean =>
  Boolean(name) && basename(name) === name && !name.includes('/') && !name.includes('\\')

const dedupeIssues = (issues: XDocsDoctorIssue[]): XDocsDoctorIssue[] => {
  const seen = new Set<string>()
  const result: XDocsDoctorIssue[] = []

  for (const issue of issues) {
    const key = `${issue.severity}\0${issue.code}\0${issue.path ?? ''}\0${issue.message}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(issue)
  }

  return result.sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === 'error' ? -1 : 1
    return `${left.path ?? ''}${left.message}`.localeCompare(`${right.path ?? ''}${right.message}`)
  })
}
