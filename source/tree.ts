/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsFile, XDocsTreeNode, XDocsTreeValidation } from './types.js'

/** Build a hierarchy tree from a list of xdocs descriptors. */
export const buildTree = (files: XDocsFile[]): XDocsTreeNode => {
  const nodeMap = new Map<string, XDocsTreeNode>()

  // Create nodes for every file with valid metadata
  for (const file of files) {
    if (!file.metadata) continue

    nodeMap.set(file.metadata.subject, {
      subject: file.metadata.subject,
      description: file.metadata.description,
      path: file.relativePath,
      children: [],
    })
  }

  // Find or create the root node
  let root: XDocsTreeNode | undefined

  for (const file of files) {
    if (!file.metadata) continue

    if (file.metadata.parent === null) {
      root = nodeMap.get(file.metadata.subject)
      continue
    }

    const parentNode = nodeMap.get(file.metadata.parent)
    const childNode = nodeMap.get(file.metadata.subject)

    if (parentNode && childNode) {
      parentNode.children.push(childNode)
    }
  }

  // Also add children declared in metadata but not yet linked
  for (const file of files) {
    if (!file.metadata) continue
    const parentNode = nodeMap.get(file.metadata.subject)
    if (!parentNode) continue

    for (const childSubject of file.metadata.children) {
      const childNode = nodeMap.get(childSubject)
      if (childNode && !parentNode.children.includes(childNode)) {
        parentNode.children.push(childNode)
      }
    }
  }

  if (!root) {
    root = {
      subject: '(root)',
      description: 'No root xdocs descriptor found.',
      path: null,
      children: [...nodeMap.values()].filter(
        (node) => !files.some(
          (f) => f.metadata && f.metadata.children.includes(node.subject),
        ),
      ),
    }
  }

  return root
}

/** Validate tree integrity. */
export const validateTree = (files: XDocsFile[]): XDocsTreeValidation => {
  const warnings: string[] = []
  const errors: string[] = []
  const subjects = new Set<string>()

  for (const file of files) {
    if (!file.metadata) continue

    if (subjects.has(file.metadata.subject)) {
      errors.push(`Duplicate subject: "${file.metadata.subject}" in ${file.relativePath}`)
    }
    subjects.add(file.metadata.subject)
  }

  for (const file of files) {
    if (!file.metadata) continue

    // Check parent references
    if (file.metadata.parent !== null && !subjects.has(file.metadata.parent)) {
      errors.push(`Orphan subject: "${file.metadata.subject}" references non-existent parent "${file.metadata.parent}" in ${file.relativePath}`)
    }

    // Check children references
    for (const child of file.metadata.children) {
      if (!subjects.has(child)) {
        warnings.push(`Missing child: "${file.metadata.subject}" references non-existent child "${child}" in ${file.relativePath}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}

/** Render a tree as a branch-lined text string. */
export const renderTree = (node: XDocsTreeNode): string => {
  const lines = [node.subject]

  for (const [index, child] of node.children.entries()) {
    lines.push(...renderTreeBranch(child, '', index === node.children.length - 1))
  }

  return lines.join('\n')
}

const renderTreeBranch = (node: XDocsTreeNode, prefix: string, isLast: boolean): string[] => {
  const branch = isLast ? '`- ' : '|- '
  const childPrefix = isLast ? '   ' : '|  '
  const lines = [`${prefix}${branch}${node.subject}`]

  for (const [index, child] of node.children.entries()) {
    lines.push(...renderTreeBranch(child, `${prefix}${childPrefix}`, index === node.children.length - 1))
  }

  return lines
}

/** Render a tree as Markdown. */
export const renderTreeMarkdown = (node: XDocsTreeNode, indent = 0): string => {
  const prefix = '  '.repeat(indent)
  const lines: string[] = []

  lines.push(`${prefix}- **${node.subject}**: ${node.description}`)

  for (const child of node.children) {
    lines.push(renderTreeMarkdown(child, indent + 1))
  }

  return lines.join('\n')
}
