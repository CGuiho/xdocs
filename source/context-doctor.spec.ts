/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defaultConfig } from './config.js'
import { findContext } from './context.js'
import { doctorProject } from './doctor.js'
import { XDocsError } from './errors.js'
import { runCli } from './cli.js'

const descriptorContent = (subject: string, options: { files?: Record<string, string>, documents?: Record<string, string>, keywords?: string[], tags?: string[] } = {}): string => {
  const files = options.files ?? {}
  const documents = options.documents ?? {}
  const fileEntries = Object.entries(files)
  const documentEntries = Object.entries(documents)

  return `---
subject: ${subject}
description: The ${subject} module handles authentication sessions.
parent: null
children: []
files:${fileEntries.length === 0 ? ' {}' : `\n${fileEntries.map(([name, description]) => `  ${name}: ${description}`).join('\n')}`}
documents:${documentEntries.length === 0 ? ' {}' : `\n${documentEntries.map(([name, description]) => `  ${name}: ${description}`).join('\n')}`}
tags:${(options.tags ?? []).length === 0 ? ' []' : `\n${(options.tags ?? []).map((tag) => `  - ${tag}`).join('\n')}`}
keywords:${(options.keywords ?? []).length === 0 ? ' []' : `\n${(options.keywords ?? []).map((keyword) => `  - ${keyword}`).join('\n')}`}
flags: []
---

# ${subject}
`
}

const companionContent = (owner: string): string => `---
name: auth-sessions
purpose: Explain authentication session lifecycle.
description: Session lifecycle notes for authentication.
created: 2026-07-10
flags: []
tags:
  - security
keywords:
  - session
  - authentication
owner: ${owner}
---

# Auth Sessions
`

describe('findContext', () => {
  test('returns descriptor, file, and document matches with reasons', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-context-'))
    try {
      const authDir = join(dir, 'auth')
      await mkdir(authDir)
      await writeFile(join(authDir, 'auth.ts'), 'export const auth = true\n', 'utf8')
      await writeFile(join(authDir, 'auth.xdocs.md'), descriptorContent('auth', {
        files: { 'auth.ts': 'Authentication sessions implementation.' },
        documents: { 'sessions.md': 'Authentication session lifecycle notes.' },
        keywords: ['authentication', 'session'],
        tags: ['security'],
      }), 'utf8')
      await writeFile(join(authDir, 'sessions.md'), companionContent('auth'), 'utf8')

      const result = await findContext(defaultConfig(dir), 'authentication session', { includeDocuments: true, includeFiles: true, limit: 10 })

      expect(result.entries.some((entry) => entry.kind === 'descriptor' && entry.path.endsWith('auth.xdocs.md'))).toBe(true)
      expect(result.entries.some((entry) => entry.kind === 'file' && entry.path.endsWith('auth.ts'))).toBe(true)
      expect(result.entries.some((entry) => entry.kind === 'document' && entry.path.endsWith('sessions.md'))).toBe(true)
      expect(result.entries[0]?.reasons.length).toBeGreaterThan(0)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('rejects an empty query', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-context-empty-'))
    try {
      await expect(findContext(defaultConfig(dir), '   ')).rejects.toThrow(XDocsError)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('doctorProject', () => {
  test('passes a healthy documented module', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-doctor-'))
    try {
      await writeFile(join(dir, 'auth.ts'), 'export const auth = true\n', 'utf8')
      await writeFile(join(dir, 'auth.xdocs.md'), descriptorContent('auth', {
        files: { 'auth.ts': 'Authentication sessions implementation.' },
        documents: { 'sessions.md': 'Authentication session lifecycle notes.' },
        keywords: ['authentication', 'session'],
      }), 'utf8')
      await writeFile(join(dir, 'sessions.md'), companionContent('auth'), 'utf8')

      const result = await doctorProject(defaultConfig(dir))

      expect(result.valid).toBe(true)
      expect(result.summary.errors).toBe(0)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('reports missing documented files and warns for invalid companion owner', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-doctor-invalid-'))
    try {
      await writeFile(join(dir, 'auth.xdocs.md'), descriptorContent('auth', {
        files: { 'missing.ts': 'Missing implementation file.' },
        documents: { 'sessions.md': 'Authentication session lifecycle notes.' },
        keywords: ['authentication', 'session'],
      }), 'utf8')
      await writeFile(join(dir, 'sessions.md'), companionContent('wrong-owner'), 'utf8')

      const result = await doctorProject(defaultConfig(dir))

      expect(result.valid).toBe(false)
      expect(result.issues.some((issue) => issue.code === 'file-missing')).toBe(true)
      expect(result.issues.some((issue) => issue.code === 'document-metadata' && issue.severity === 'warning' && issue.message.includes('Expected "auth"'))).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('can treat companion metadata warnings as errors', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-doctor-warnings-'))
    try {
      await writeFile(join(dir, 'auth.ts'), 'export const auth = true\n', 'utf8')
      await writeFile(join(dir, 'auth.xdocs.md'), descriptorContent('auth', {
        files: { 'auth.ts': 'Authentication sessions implementation.' },
        documents: { 'sessions.md': 'Authentication session lifecycle notes.' },
        keywords: ['authentication', 'session'],
      }), 'utf8')
      await writeFile(join(dir, 'sessions.md'), companionContent('wrong-owner'), 'utf8')

      const result = await doctorProject(defaultConfig(dir), { warningsAsErrors: true })

      expect(result.valid).toBe(false)
      expect(result.issues.some((issue) => issue.code === 'document-metadata' && issue.severity === 'error')).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('doctor CLI exits with XDocsError on invalid projects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-doctor-cli-'))
    const originalStdoutWrite = process.stdout.write
    const originalStderrWrite = process.stderr.write
    try {
      await writeFile(join(dir, 'xdocs.config.toml'), 'schema = 1\n\n[agents]\nauto_agents_md = false\nauto_skill_install = false\n', 'utf8')
      await writeFile(join(dir, 'auth.xdocs.md'), descriptorContent('auth', {
        files: { 'missing.ts': 'Missing implementation file.' },
        keywords: ['authentication'],
      }), 'utf8')

      process.stdout.write = (() => true) as typeof process.stdout.write
      process.stderr.write = (() => true) as typeof process.stderr.write

      await expect(runCli(['doctor', '--cwd', dir])).rejects.toThrow(XDocsError)
    } finally {
      process.stdout.write = originalStdoutWrite
      process.stderr.write = originalStderrWrite
      await rm(dir, { recursive: true, force: true })
    }
  })
})
