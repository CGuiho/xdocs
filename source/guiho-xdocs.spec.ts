/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { describe, test, expect } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { extractFrontmatter, readFrontmatterFromFile, validateMetadata } from './metadata.js'
import { scanMetadata } from './meta.js'
import { buildTree, renderTree, renderTreeMarkdown, validateTree } from './tree.js'
import { normalizeConfig, defaultConfig, normalizeAgentSettings } from './config.js'
import { isPlainMarkdownDocument, isXDocsDescriptorFile, isXDocsFile, scanProject } from './discovery.js'
import { readPackageVersion, showCommandHelpDocs, showCommandHelpTree, showHelpDocs, showHelpTree } from './help.js'
import { runCli } from './cli.js'
import { detectNativeArch, readUpdateCache, resolveCachePath, upgradeSelf } from './self-management.js'
import {
  detectAgentTools,
  ensureAgentsInstructions,
  installSkill,
  installSkills,
  isSkillInstalled,
  legacyXdocsSkillNames,
  parseAgentTools,
  readSkillVersion,
  resolveInstallTools,
  resolveSkillPath,
  runAgentAutomation,
  xdocsAgentsSection,
  xdocsSkillContent,
  xdocsSkillName,
  xdocsSkillVersion,
} from './agents.js'
import { XDocsError, invariant } from './errors.js'
import type { XDocsFile, XDocsRawConfig } from './types.js'

// ---------------------------------------------------------------------------
// errors.ts
// ---------------------------------------------------------------------------
describe('XDocsError', () => {
  test('creates an error with default exit code', () => {
    const error = new XDocsError('something broke')
    expect(error.message).toBe('something broke')
    expect(error.exitCode).toBe(1)
    expect(error.name).toBe('XDocsError')
  })

  test('creates an error with custom exit code', () => {
    const error = new XDocsError('bad input', 2)
    expect(error.exitCode).toBe(2)
  })

  test('is an instance of Error', () => {
    const error = new XDocsError('test')
    expect(error instanceof Error).toBe(true)
  })
})

describe('invariant', () => {
  test('does not throw when condition is truthy', () => {
    expect(() => invariant(true, 'ok')).not.toThrow()
    expect(() => invariant(1, 'ok')).not.toThrow()
    expect(() => invariant('yes', 'ok')).not.toThrow()
  })

  test('throws XDocsError when condition is falsy', () => {
    expect(() => invariant(false, 'fail')).toThrow(XDocsError)
    expect(() => invariant(null, 'fail')).toThrow(XDocsError)
    expect(() => invariant(undefined, 'fail')).toThrow(XDocsError)
    expect(() => invariant(0, 'fail')).toThrow(XDocsError)
    expect(() => invariant('', 'fail')).toThrow(XDocsError)
  })
})

describe('package metadata', () => {
  test('ships a Bun launcher bin for remote package execution', async () => {
    const packageJson = JSON.parse(await readFile(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      bin?: Record<string, string>
      files?: string[]
      scripts?: Record<string, string>
    }

    expect(packageJson.bin?.['xdocs']).toBe('scripts/xdocs-bin.ts')
    expect(packageJson.files).toContain('scripts/')
    expect(packageJson.scripts?.['postinstall']).toBe('bun run scripts/install-package.ts')
    expect(existsSync(resolve(process.cwd(), 'scripts/xdocs-bin.ts'))).toBe(true)
    expect(existsSync(resolve(process.cwd(), 'scripts/install-package.ts'))).toBe(true)
  })

  test('runs the package launcher from a source checkout without a native vendor binary', async () => {
    const proc = Bun.spawn([process.execPath, 'run', 'scripts/xdocs-bin.ts', '--version'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    expect(exitCode).toBe(0)
    expect(stdout.trim()).toMatch(/^xdocs \d+\.\d+\.\d+/)
    expect(stderr).not.toContain('native binary is missing')
  })
})

describe('help rendering', () => {
  test('renders command tree and markdown docs', () => {
    expect(showHelpTree()).toContain('xdocs upgrade')
    expect(showHelpTree()).toContain('xdocs meta')
    expect(showHelpTree()).toContain('xdocs context')
    expect(showHelpTree()).toContain('xdocs doctor')
    expect(showCommandHelpTree('upgrade')).toContain('xdocs upgrade check')
    expect(showHelpDocs()).toContain('# xdocs CLI')
    expect(showCommandHelpDocs('meta')).toContain('xdocs meta')
    expect(showCommandHelpDocs('context')).toContain('xdocs context')
    expect(showCommandHelpDocs('doctor')).toContain('xdocs doctor')
    expect(showCommandHelpDocs('uninstall')).toContain('xdocs uninstall')
  })
})

describe('self management', () => {
  test('detectNativeArch accepts x64 and arm64', () => {
    expect(detectNativeArch('x64')).toBe('x64')
    expect(detectNativeArch('arm64')).toBe('arm64')
    expect(() => detectNativeArch('ia32')).toThrow(XDocsError)
  })

  test('readUpdateCache returns null when cache is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-cache-'))
    try {
      expect(resolveCachePath({ cacheDir: dir })).toBe(join(dir, 'update.json'))
      expect(await readUpdateCache({ cacheDir: dir })).toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('upgradeSelf dry-run selects the baseline x64 asset with an explicit self path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-upgrade-'))
    const previousSelfPath = process.env['XDOCS_SELF_PATH']
    const originalStdoutWrite = process.stdout.write
    try {
      const executable = join(dir, process.platform === 'win32' ? 'xdocs.exe' : 'xdocs')
      await writeFile(executable, process.platform === 'win32' ? 'MZ' : '\x7fELF', 'binary')
      process.env['XDOCS_SELF_PATH'] = executable
      const current = await upgradeSelf({ version: readPackageVersion(), arch: 'x64', cacheDir: dir, repo: 'CGuiho/xdocs' })
      expect(current.outcome).toBe('up-to-date')
      expect(current.plan?.targetVersion).toBe(readPackageVersion())
      expect(current.result?.verifiedVersion).toBe(readPackageVersion())
      expect(await readUpdateCache({ cacheDir: dir })).toBeNull()

      const stdout: string[] = []
      process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout.push(String(chunk))
        return true
      }) as typeof process.stdout.write
      await runCli(['upgrade', '--version', readPackageVersion()])
      expect(stdout.join('')).toContain('Already up to date.')
      expect(stdout.join('')).not.toContain('Upgrade downloaded.')

      const dryRunTarget = nextMajorFixtureVersion('dry-run.1')
      const result = await upgradeSelf({ version: dryRunTarget, arch: 'x64', dryRun: true, repo: 'CGuiho/xdocs' })

      expect(result.outcome).toBe('dry-run')
      expect(result.plan?.assetName).toBe(process.platform === 'win32' ? 'xdocs-windows-x64-baseline.exe' : process.platform === 'darwin' ? 'xdocs-macos-x64-baseline' : 'xdocs-linux-x64-baseline')
      expect(result.plan?.downloadUrl).toContain(encodeURIComponent(`@guiho/xdocs@${dryRunTarget}`))
      expect(result.recovery.installCommand).toContain(dryRunTarget)
    } finally {
      process.stdout.write = originalStdoutWrite
      if (previousSelfPath === undefined) {
        delete process.env['XDOCS_SELF_PATH']
      } else {
        process.env['XDOCS_SELF_PATH'] = previousSelfPath
      }
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('explicit upgrade resolves an available fallback asset before downloading', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-explicit-fallback-'))
    const previousSelfPath = process.env['XDOCS_SELF_PATH']
    const executable = join(dir, process.platform === 'win32' ? 'xdocs.exe' : 'xdocs')
    const calls: Array<{ url: string, method: string }> = []
    const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux'
    const baseline = `xdocs-${platform}-x64-baseline${platform === 'windows' ? '.exe' : ''}`
    const defaultAsset = `xdocs-${platform}-x64${platform === 'windows' ? '.exe' : ''}`
    const body = platform === 'windows'
      ? new Uint8Array([0x4d, 0x5a, 1, 2])
      : platform === 'linux'
        ? new Uint8Array([0x7f, 0x45, 0x4c, 0x46])
        : new Uint8Array([0xcf, 0xfa, 0xed, 0xfe])
    try {
      await writeFile(executable, body)
      process.env['XDOCS_SELF_PATH'] = executable
      const targetVersion = nextMajorFixtureVersion('fallback.1')
      const result = await upgradeSelf({
        version: targetVersion,
        arch: 'x64',
        cacheDir: dir,
        repo: 'CGuiho/xdocs',
        fetcher: async (input, init) => {
          const url = String(input)
          const method = init?.method ?? 'GET'
          calls.push({ url, method })
          if (method === 'HEAD' && url.endsWith(baseline)) return new Response(null, { status: 404 })
          if (method === 'HEAD' && url.endsWith(defaultAsset)) return new Response(null, { status: 200 })
          if (method === 'GET' && url.endsWith(defaultAsset)) return new Response(body)
          return new Response(null, { status: 500 })
        },
        verifyExecutable: async () => undefined,
      })
      expect(result.outcome).toBe('upgraded')
      expect(result.plan?.assetName).toBe(defaultAsset)
      expect(calls.map((call) => call.method)).toEqual(['HEAD', 'HEAD', 'GET'])
      expect(result.recovery.targetVersion).toBe(targetVersion)
    } finally {
      if (previousSelfPath === undefined) delete process.env['XDOCS_SELF_PATH']
      else process.env['XDOCS_SELF_PATH'] = previousSelfPath
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('pre-plan native-install failure still returns pinned recovery guidance', async () => {
    const previousSelfPath = process.env['XDOCS_SELF_PATH']
    try {
      delete process.env['XDOCS_SELF_PATH']
      const result = await upgradeSelf()
      expect(result.outcome).toBe('failed')
      expect(Object.keys(result)).toEqual([
        'schemaVersion', 'command', 'outcome', 'plan', 'events', 'result', 'recovery', 'error',
      ])
      expect(result.plan).toBeNull()
      expect(result.events).toEqual([
        { sequence: 1, phase: 'plan', status: 'started', message: 'Resolving upgrade target.' },
        expect.objectContaining({ sequence: 2, phase: 'plan', status: 'failed' }),
      ])
      expect(result.recovery.targetSource).toBe('fallback-current')
      expect(result.recovery.targetVersion).toBe(readPackageVersion())
      expect(result.recovery.installCommand).toContain(readPackageVersion())
      expect(result.recovery.stopProcessCommand).toContain('xdocs')
    } finally {
      if (previousSelfPath === undefined) delete process.env['XDOCS_SELF_PATH']
      else process.env['XDOCS_SELF_PATH'] = previousSelfPath
    }
  })

  test('explicit older targets are treated as up to date and recover to the installed version', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-no-downgrade-'))
    const previousSelfPath = process.env['XDOCS_SELF_PATH']
    const executable = join(dir, process.platform === 'win32' ? 'xdocs.exe' : 'xdocs')
    try {
      await writeFile(executable, process.platform === 'win32' ? 'MZ' : '\x7fELF', 'binary')
      process.env['XDOCS_SELF_PATH'] = executable
      const result = await upgradeSelf({ version: '0.1.0', arch: 'x64' })
      expect(result.outcome).toBe('up-to-date')
      expect(result.recovery.targetVersion).toBe(readPackageVersion())
      expect(result.recovery.targetSource).toBe('fallback-current')
    } finally {
      if (previousSelfPath === undefined) delete process.env['XDOCS_SELF_PATH']
      else process.env['XDOCS_SELF_PATH'] = previousSelfPath
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('bare CLI prints a cached update notice', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-cache-notice-'))
    const previousCacheDir = process.env['XDOCS_CACHE_DIR']
    const previousDisable = process.env['XDOCS_DISABLE_UPDATE_CHECK']
    const previousAgentHome = process.env['XDOCS_AGENT_HOME']
    const originalStderrWrite = process.stderr.write
    const stderr: string[] = []
    try {
      process.env['XDOCS_CACHE_DIR'] = dir
      process.env['XDOCS_DISABLE_UPDATE_CHECK'] = '1'
      process.env['XDOCS_AGENT_HOME'] = dir
      await writeFile(join(dir, 'update.json'), JSON.stringify({
        checkedAt: new Date().toISOString(),
        currentVersion: '0.0.0',
        latestVersion: '999.0.0',
        updateAvailable: true,
        releaseUrl: 'https://github.com/CGuiho/xdocs/releases/latest',
      }), 'utf8')

      process.stderr.write = ((chunk: string | Uint8Array) => {
        stderr.push(String(chunk))
        return true
      }) as typeof process.stderr.write

      await runCli(['--cwd', dir])

      expect(stderr.join('')).toContain('Run `xdocs upgrade`')
    } finally {
      process.stderr.write = originalStderrWrite
      if (previousCacheDir === undefined) {
        delete process.env['XDOCS_CACHE_DIR']
      } else {
        process.env['XDOCS_CACHE_DIR'] = previousCacheDir
      }
      if (previousDisable === undefined) {
        delete process.env['XDOCS_DISABLE_UPDATE_CHECK']
      } else {
        process.env['XDOCS_DISABLE_UPDATE_CHECK'] = previousDisable
      }
      if (previousAgentHome === undefined) {
        delete process.env['XDOCS_AGENT_HOME']
      } else {
        process.env['XDOCS_AGENT_HOME'] = previousAgentHome
      }
      await rm(dir, { recursive: true, force: true })
    }
  })
})

function nextMajorFixtureVersion(prerelease: string): string {
  const major = Number.parseInt(readPackageVersion().split('.')[0] ?? '0', 10)
  return `${major + 1}.0.0-${prerelease}`
}

// ---------------------------------------------------------------------------
// metadata.ts
// ---------------------------------------------------------------------------
describe('extractFrontmatter', () => {
  test('extracts frontmatter and body', () => {
    const content = `---
subject: auth
description: Authentication module
---

# Auth Module`

    const result = extractFrontmatter(content)
    expect(result.frontmatter).toBe('subject: auth\ndescription: Authentication module')
    expect(result.body).toBe('# Auth Module')
  })

  test('returns null frontmatter when no delimiters', () => {
    const content = '# Just Markdown\n\nNo frontmatter here.'
    const result = extractFrontmatter(content)
    expect(result.frontmatter).toBeNull()
    expect(result.body).toBe(content)
  })

  test('returns null frontmatter when no closing delimiter', () => {
    const content = '---\nsubject: broken\nno closing'
    const result = extractFrontmatter(content)
    expect(result.frontmatter).toBeNull()
  })

  test('handles leading whitespace before ---', () => {
    const content = `  \n---\nsubject: test\n---\n\nbody`
    const result = extractFrontmatter(content)
    expect(result.frontmatter).toBe('subject: test')
  })
})

describe('readFrontmatterFromFile', () => {
  test('reads only the leading frontmatter block', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-frontmatter-'))
    try {
      const path = join(dir, 'document.md')
      await writeFile(path, `---
name: example
tags: []
---

# Body

The body should not be returned.
`, 'utf8')

      await expect(readFrontmatterFromFile(path)).resolves.toBe('name: example\ntags: []')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('validateMetadata', () => {
  const validMeta = {
    subject: 'auth',
    description: 'Authentication module',
    parent: null,
    children: ['login', 'register'],
    files: { 'auth.ts': 'Main auth logic' },
    documents: { 'auth-flow.md': 'Authentication flow notes' },
    tags: ['security'],
    keywords: ['auth', 'login'],
    flags: [],
  }

  test('validates correct metadata', () => {
    const result = validateMetadata(validMeta)
    expect(result.valid).toBe(true)
    expect(result.metadata).not.toBeNull()
    expect(result.metadata?.subject).toBe('auth')
    expect(result.metadata?.children).toEqual(['login', 'register'])
    expect(result.metadata?.keywords).toEqual(['auth', 'login'])
  })

  test('rejects non-object input', () => {
    expect(validateMetadata('string').valid).toBe(false)
    expect(validateMetadata(null).valid).toBe(false)
    expect(validateMetadata([]).valid).toBe(false)
  })

  test('rejects missing subject', () => {
    const result = validateMetadata({ ...validMeta, subject: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('subject'))).toBe(true)
  })

  test('rejects missing description', () => {
    const result = validateMetadata({ ...validMeta, description: 123 })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('description'))).toBe(true)
  })

  test('rejects non-array children', () => {
    const result = validateMetadata({ ...validMeta, children: 'not-array' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('children'))).toBe(true)
  })

  test('rejects non-object files', () => {
    const result = validateMetadata({ ...validMeta, files: 'not-object' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('files'))).toBe(true)
  })

  test('rejects missing or invalid documents', () => {
    const missing = validateMetadata({ ...validMeta, documents: undefined })
    const invalid = validateMetadata({ ...validMeta, documents: 'not-object' })

    expect(missing.valid).toBe(false)
    expect(missing.errors.some((e) => e.includes('documents'))).toBe(true)
    expect(invalid.valid).toBe(false)
    expect(invalid.errors.some((e) => e.includes('documents'))).toBe(true)
  })

  test('rejects non-array tags', () => {
    const result = validateMetadata({ ...validMeta, tags: 'not-array' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('tags'))).toBe(true)
  })

  test('rejects non-array keywords', () => {
    const result = validateMetadata({ ...validMeta, keywords: 'not-array' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('keywords'))).toBe(true)
  })

  test('rejects non-array flags field', () => {
    const result = validateMetadata({ ...validMeta, flags: 'not-array' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('flags'))).toBe(true)
  })

  test('accepts string parent', () => {
    const result = validateMetadata({ ...validMeta, parent: 'root' })
    expect(result.valid).toBe(true)
    expect(result.metadata?.parent).toBe('root')
  })

  test('preserves optional status field', () => {
    const result = validateMetadata({ ...validMeta, status: 'active' })
    expect(result.valid).toBe(true)
    expect(result.metadata?.status).toBe('active')
  })

  test('omits status when not a string', () => {
    const result = validateMetadata({ ...validMeta, status: 42 })
    expect(result.valid).toBe(true)
    expect(result.metadata?.status).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// discovery.ts
// ---------------------------------------------------------------------------
const descriptorContent = (subject: string, documents: Record<string, string> = {}): string => {
  const documentEntries = Object.entries(documents)
  const documentsYaml = documentEntries.length === 0
    ? 'documents: {}'
    : [
        'documents:',
        ...documentEntries.map(([name, description]) => `  ${name}: ${description}`),
      ].join('\n')

  return `---
subject: ${subject}
description: The ${subject} module
parent: null
children: []
files: {}
${documentsYaml}
tags: []
keywords: []
flags: []
---

# ${subject}
`
}

describe('discovery', () => {
  test('classifies xdocs descriptors and plain Markdown documents', () => {
    expect(isXDocsFile('/project/XDOCS.md')).toBe(true)
    expect(isXDocsFile('/project/auth.xdocs.md')).toBe(true)
    expect(isXDocsDescriptorFile('/project/auth.xdocs.md')).toBe(true)
    expect(isXDocsDescriptorFile('/project/.xdocs.md')).toBe(true)
    expect(isPlainMarkdownDocument('/project/auth.md')).toBe(true)
    expect(isPlainMarkdownDocument('/project/auth.xdocs.md')).toBe(false)
    expect(isPlainMarkdownDocument('/project/XDOCS.md')).toBe(false)
  })

  test('scans named descriptors with sibling Markdown documents', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-discovery-'))
    try {
      const authDir = join(dir, 'auth')
      await mkdir(authDir)
      await writeFile(join(dir, 'XDOCS.md'), '# Root\n', 'utf8')
      await writeFile(join(authDir, 'auth.xdocs.md'), descriptorContent('auth', { 'implementation.md': 'Authentication implementation notes.' }), 'utf8')
      await writeFile(join(authDir, 'implementation.md'), '# Implementation\n', 'utf8')

      const result = await scanProject(defaultConfig(dir))
      const file = result.xdocsFiles.find((entry) => entry.relativePath.endsWith('auth.xdocs.md'))

      expect(result.totalMarkdownDocuments).toBe(1)
      expect(result.markdownDocuments.map((document) => document.relativePath)).toEqual([join('auth', 'implementation.md')])
      expect(file?.valid).toBe(true)
      expect(file?.documents.map((document) => document.name)).toEqual(['implementation.md'])
      expect(file?.metadata?.documents).toEqual({ 'implementation.md': 'Authentication implementation notes.' })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('marks nameless .xdocs.md descriptors invalid', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-nameless-'))
    try {
      await writeFile(join(dir, '.xdocs.md'), descriptorContent('root'), 'utf8')

      const result = await scanProject(defaultConfig(dir))
      const file = result.xdocsFiles.find((entry) => entry.relativePath === '.xdocs.md')

      expect(file?.valid).toBe(false)
      expect(file?.errors.some((error) => error.includes('Invalid xdocs descriptor filename'))).toBe(true)
      expect(result.uncoveredPaths).toContain(dir)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('marks multiple descriptors in one directory invalid', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-duplicates-'))
    try {
      await writeFile(join(dir, 'first.xdocs.md'), descriptorContent('first'), 'utf8')
      await writeFile(join(dir, 'second.xdocs.md'), descriptorContent('second'), 'utf8')

      const result = await scanProject(defaultConfig(dir))
      const descriptors = result.xdocsFiles.filter((file) => file.relativePath.endsWith('.xdocs.md'))

      expect(descriptors).toHaveLength(2)
      expect(descriptors.every((file) => file.valid === false)).toBe(true)
      expect(descriptors.every((file) => file.errors.some((error) => error.includes('Multiple xdocs descriptors')))).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('requires descriptors to list every sibling plain Markdown document', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-undocumented-'))
    try {
      await writeFile(join(dir, 'auth.xdocs.md'), descriptorContent('auth'), 'utf8')
      await writeFile(join(dir, 'implementation.md'), '# Implementation\n', 'utf8')

      const result = await scanProject(defaultConfig(dir))
      const file = result.xdocsFiles.find((entry) => entry.relativePath === 'auth.xdocs.md')

      expect(file?.valid).toBe(false)
      expect(file?.errors.some((error) => error.includes('Undocumented Markdown document'))).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('requires declared documents to be existing sibling Markdown files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-missing-documents-'))
    try {
      await writeFile(join(dir, 'auth.xdocs.md'), descriptorContent('auth', {
        'missing.md': 'Missing document.',
        '../outside.md': 'Path references are not allowed.',
        'nested/inside.md': 'Nested paths are not allowed.',
        'other.xdocs.md': 'Descriptors are not companion documents.',
      }), 'utf8')

      const result = await scanProject(defaultConfig(dir))
      const file = result.xdocsFiles.find((entry) => entry.relativePath === 'auth.xdocs.md')

      expect(file?.valid).toBe(false)
      expect(file?.errors.some((error) => error.includes('Missing Markdown document: "missing.md"'))).toBe(true)
      expect(file?.errors.filter((error) => error.includes('Invalid document entry'))).toHaveLength(3)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('scanMetadata', () => {
  test('returns descriptor and companion document frontmatter', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-meta-'))
    try {
      const authDir = join(dir, 'auth')
      await mkdir(authDir)
      await writeFile(join(authDir, 'auth.xdocs.md'), descriptorContent('auth', { 'implementation.md': 'Authentication implementation notes.' }), 'utf8')
      await writeFile(join(authDir, 'implementation.md'), `---
name: auth-implementation
purpose: Explain authentication implementation details.
description: Detailed notes for auth behavior.
created: 2026-07-10
flags: []
tags:
  - security
keywords:
  - authentication
  - sessions
owner: auth
---

# Implementation
`, 'utf8')

      const result = await scanMetadata(defaultConfig(dir), { targetPath: 'auth', includeDocuments: true })
      const descriptor = result.descriptors[0]
      const document = descriptor?.documents[0]

      expect(result.errors).toEqual([])
      expect(descriptor?.subject).toBe('auth')
      expect(descriptor?.frontmatter?.['subject']).toBe('auth')
      expect(document?.owner).toBe('auth')
      expect(document?.frontmatter?.['purpose']).toBe('Explain authentication implementation details.')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('filters by owner, tag, and keyword across descriptors and documents', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-meta-filter-'))
    try {
      const authDir = join(dir, 'auth')
      const billingDir = join(dir, 'billing')
      await mkdir(authDir)
      await mkdir(billingDir)
      await writeFile(join(authDir, 'auth.xdocs.md'), descriptorContent('auth', { 'implementation.md': 'Authentication implementation notes.' }), 'utf8')
      await writeFile(join(authDir, 'implementation.md'), `---
name: auth-implementation
purpose: Explain authentication implementation details.
description: Detailed notes for auth behavior.
created: 2026-07-10
flags: []
tags:
  - security
keywords:
  - sessions
owner: auth
---
`, 'utf8')
      await writeFile(join(billingDir, 'billing.xdocs.md'), descriptorContent('billing'), 'utf8')

      const result = await scanMetadata(defaultConfig(dir), { includeDocuments: true, owner: 'auth', tag: 'security', keyword: 'sessions' })

      expect(result.descriptors).toHaveLength(1)
      expect(result.descriptors[0]?.subject).toBe('auth')
      expect(result.descriptors[0]?.documents).toHaveLength(1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('reports invalid companion document metadata', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-meta-invalid-'))
    try {
      await writeFile(join(dir, 'auth.xdocs.md'), descriptorContent('auth', { 'implementation.md': 'Authentication implementation notes.' }), 'utf8')
      await writeFile(join(dir, 'implementation.md'), `---
name: auth-implementation
purpose: Explain authentication implementation details.
description: Detailed notes for auth behavior.
created: 2026-07-10
flags: []
tags: []
keywords: []
owner: wrong-owner
---
`, 'utf8')

      const result = await scanMetadata(defaultConfig(dir), { includeDocuments: true })

      expect(result.errors.some((error) => error.includes('Expected "auth"'))).toBe(true)
      expect(result.descriptors[0]?.documents[0]?.valid).toBe(false)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('strict CLI mode fails on metadata errors', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-meta-cli-'))
    const originalStdoutWrite = process.stdout.write
    const originalStderrWrite = process.stderr.write
    try {
      await writeFile(join(dir, 'xdocs.config.toml'), 'schema = 1\n\n[agents]\nauto_agents_md = false\nauto_skill_install = false\n', 'utf8')
      await writeFile(join(dir, 'auth.xdocs.md'), descriptorContent('auth', { 'implementation.md': 'Authentication implementation notes.' }), 'utf8')
      await writeFile(join(dir, 'implementation.md'), `---
name: auth-implementation
purpose: Explain authentication implementation details.
description: Detailed notes for auth behavior.
created: 2026-07-10
flags: []
tags: []
keywords: []
owner: wrong-owner
---
`, 'utf8')

      process.stdout.write = (() => true) as typeof process.stdout.write
      process.stderr.write = (() => true) as typeof process.stderr.write

      await expect(runCli(['meta', '--cwd', dir, '--documents', '--strict'])).rejects.toThrow(XDocsError)
    } finally {
      process.stdout.write = originalStdoutWrite
      process.stderr.write = originalStderrWrite
      await rm(dir, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// tree.ts
// ---------------------------------------------------------------------------
const makeFile = (subject: string, parent: string | null, children: string[] = []): XDocsFile => ({
  path: `/project/${subject}/${subject}.xdocs.md`,
  relativePath: `${subject}/${subject}.xdocs.md`,
  directory: `/project/${subject}`,
  metadata: {
    subject,
    description: `The ${subject} module`,
    parent,
    children,
    files: {},
    documents: {},
    tags: [],
    keywords: [],
    flags: [],
  },
  documents: [],
  body: '',
  valid: true,
  errors: [],
})

describe('buildTree', () => {
  test('builds a tree with a root node', () => {
    const files = [
      makeFile('root', null, ['auth', 'api']),
      makeFile('auth', 'root'),
      makeFile('api', 'root'),
    ]

    const tree = buildTree(files)
    expect(tree.subject).toBe('root')
    expect(tree.children).toHaveLength(2)
    expect(tree.children.map((c) => c.subject).sort()).toEqual(['api', 'auth'])
  })

  test('creates synthetic root when no parent=null node', () => {
    const files = [
      makeFile('auth', 'root'),
      makeFile('api', 'root'),
    ]

    const tree = buildTree(files)
    expect(tree.subject).toBe('(root)')
    expect(tree.children).toHaveLength(2)
  })

  test('handles empty input', () => {
    const tree = buildTree([])
    expect(tree.subject).toBe('(root)')
    expect(tree.children).toHaveLength(0)
  })

  test('handles files without metadata', () => {
    const file: XDocsFile = {
      path: '/test.md',
      relativePath: 'test.md',
      directory: '/',
      metadata: null,
      documents: [],
      body: '',
      valid: false,
      errors: ['no frontmatter'],
    }

    const tree = buildTree([file])
    expect(tree.subject).toBe('(root)')
    expect(tree.children).toHaveLength(0)
  })
})

describe('renderTree', () => {
  test('renders a simple tree', () => {
    const files = [
      makeFile('project', null, ['auth', 'api']),
      makeFile('auth', 'project'),
      makeFile('api', 'project'),
    ]
    const tree = buildTree(files)
    const output = renderTree(tree)

    expect(output).toContain('project')
    expect(output).toContain('auth')
    expect(output).toContain('api')
  })

  test('renders nested branches', () => {
    const files = [
      makeFile('root', null, ['a']),
      makeFile('a', 'root', ['b']),
      makeFile('b', 'a'),
    ]
    const tree = buildTree(files)
    const output = renderTree(tree)
    const lines = output.split('\n')

    expect(lines[0]).toBe('root')
    expect(lines[1]).toBe('|- a')
    expect(lines[2]).toBe('|  |- b')
  })

  test('renders sibling scope pipes', () => {
    const files = [
      makeFile('root', null, ['a', 'b']),
      makeFile('a', 'root', ['a-child']),
      makeFile('a-child', 'a'),
      makeFile('b', 'root'),
    ]
    const tree = buildTree(files)
    const output = renderTree(tree)

    expect(output).toContain('|- a')
    expect(output).toContain('|  |- a-child')
    expect(output).toContain('|- b')
  })
})

describe('renderTreeMarkdown', () => {
  test('renders markdown with bold subjects and descriptions', () => {
    const files = [
      makeFile('root', null, ['child']),
      makeFile('child', 'root'),
    ]
    const tree = buildTree(files)
    const output = renderTreeMarkdown(tree)

    expect(output).toContain('- **root**: The root module')
    expect(output).toContain('  - **child**: The child module')
  })
})

describe('validateTree', () => {
  test('reports no issues for valid tree', () => {
    const files = [
      makeFile('root', null, ['auth']),
      makeFile('auth', 'root'),
    ]
    const result = validateTree(files)
    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  test('reports duplicate subjects', () => {
    const files = [
      makeFile('root', null),
      makeFile('root', null),
    ]
    const result = validateTree(files)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true)
  })

  test('reports orphan subjects', () => {
    const files = [
      makeFile('child', 'nonexistent'),
    ]
    const result = validateTree(files)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Orphan'))).toBe(true)
  })

  test('warns about missing children', () => {
    const files = [
      makeFile('root', null, ['missing-child']),
    ]
    const result = validateTree(files)
    expect(result.valid).toBe(true) // warnings don't invalidate
    expect(result.warnings.some((w) => w.includes('Missing child'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// config.ts
// ---------------------------------------------------------------------------
describe('normalizeConfig', () => {
  test('normalizes a minimal raw config', () => {
    const raw: XDocsRawConfig = { schema: 1 }
    const config = normalizeConfig(raw, '/project')

    expect(config.schema).toBe(1)
    expect(config.extensions.supported).toEqual(['.xdocs.md'])
    expect(config.ai.mode).toBe('prompt')
    expect(config.scan.exclude).toContain('node_modules')
    expect(config.project.name).toBe('project')
  })

  test('normalizes a full raw config', () => {
    const raw: XDocsRawConfig = {
      schema: 1,
      extensions: { supported: ['.xdocs.md'] },
      ai: { mode: 'auto' },
      scan: { exclude: ['vendor'] },
      project: { name: 'my-project' },
    }
    const config = normalizeConfig(raw, '/project')

    expect(config.extensions.supported).toEqual(['.xdocs.md'])
    expect(config.ai.mode).toBe('auto')
    expect(config.scan.exclude).toEqual(['vendor'])
    expect(config.project.name).toBe('my-project')
  })

  test('rejects unsupported schema version', () => {
    expect(() => normalizeConfig({ schema: 2 }, '/project')).toThrow(XDocsError)
  })

  test('rejects invalid ai.mode', () => {
    expect(() => normalizeConfig({ ai: { mode: 'invalid' } }, '/project')).toThrow(XDocsError)
  })

  test('rejects descriptor extensions other than .xdocs.md', () => {
    expect(() => normalizeConfig({ extensions: { supported: ['.docs.md', '.xdocs.md'] } }, '/project')).toThrow(XDocsError)
    expect(() => normalizeConfig({ extensions: { supported: ['.custom.md'] } }, '/project')).toThrow(XDocsError)
  })

  test('stores configPath when provided', () => {
    const config = normalizeConfig({}, '/project', '/project/xdocs.config.toml')
    expect(config.configPath).toBe('/project/xdocs.config.toml')
  })
})

describe('defaultConfig', () => {
  test('creates sensible defaults', () => {
    const config = defaultConfig('/my/project')

    expect(config.schema).toBe(1)
    expect(config.cwd).toBe('/my/project')
    expect(config.extensions.supported).toContain('.xdocs.md')
    expect(config.ai.mode).toBe('prompt')
    expect(config.project.name).toBe('project')
  })

  test('includes default agent settings', () => {
    const config = defaultConfig('/my/project')
    expect(config.agents).toEqual({ autoAgentsMd: true, autoSkillInstall: true, skillTool: 'agents' })
  })
})

// ---------------------------------------------------------------------------
// agents.ts
// ---------------------------------------------------------------------------
describe('normalizeAgentSettings', () => {
  test('returns defaults when no section is present', () => {
    expect(normalizeAgentSettings(undefined)).toEqual({ autoAgentsMd: true, autoSkillInstall: true, skillTool: 'agents' })
  })

  test('honors explicit false flags and a custom tool', () => {
    const settings = normalizeAgentSettings({ auto_agents_md: false, auto_skill_install: false, skill_tool: 'claude' })
    expect(settings).toEqual({ autoAgentsMd: false, autoSkillInstall: false, skillTool: 'claude' })
  })

  test('rejects an invalid skill_tool', () => {
    expect(() => normalizeAgentSettings({ skill_tool: 'bogus' })).toThrow(XDocsError)
  })

  test('rejects a non-boolean flag', () => {
    expect(() => normalizeAgentSettings({ auto_agents_md: 'yes' as unknown as boolean })).toThrow(XDocsError)
  })
})

describe('normalizeConfig agents section', () => {
  test('fills agent defaults when omitted', () => {
    const config = normalizeConfig({ schema: 1 }, '/project')
    expect(config.agents.autoAgentsMd).toBe(true)
    expect(config.agents.autoSkillInstall).toBe(true)
    expect(config.agents.skillTool).toBe('agents')
  })

  test('reads a configured agents section', () => {
    const raw: XDocsRawConfig = { schema: 1, agents: { auto_skill_install: false, skill_tool: 'claude' } }
    const config = normalizeConfig(raw, '/project')
    expect(config.agents.autoSkillInstall).toBe(false)
    expect(config.agents.skillTool).toBe('claude')
  })
})

describe('parseAgentTools', () => {
  test('defaults to the standard agents target', () => {
    expect(parseAgentTools(undefined)).toEqual(['agents'])
    expect(parseAgentTools('agents')).toEqual(['agents'])
  })

  test('expands "all" to every tool', () => {
    expect(parseAgentTools('all')).toEqual(['agents', 'claude'])
  })

  test('accepts the non-standard claude tool', () => {
    expect(parseAgentTools('claude')).toEqual(['claude'])
  })

  test('rejects an unknown tool', () => {
    expect(() => parseAgentTools('bogus')).toThrow(XDocsError)
  })
})

describe('detectAgentTools', () => {
  test('returns only the standard target with no non-standard markers', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-detect-'))
    try {
      expect(detectAgentTools(dir)).toEqual(['agents'])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('adds claude when a CLAUDE.md is present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-detect-'))
    try {
      await writeFile(join(dir, 'CLAUDE.md'), '# Claude\n', 'utf8')
      expect(detectAgentTools(dir)).toEqual(['agents', 'claude'])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('resolveInstallTools prefers an explicit --tool over detection', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-detect-'))
    try {
      await writeFile(join(dir, 'CLAUDE.md'), '# Claude\n', 'utf8')
      expect(resolveInstallTools(dir, 'agents')).toEqual(['agents'])
      expect(resolveInstallTools(dir, undefined)).toEqual(['agents', 'claude'])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('resolveSkillPath', () => {
  test('resolves local paths under cwd per tool', () => {
    const cwd = process.cwd()
    expect(resolveSkillPath('agents', 'local', { cwd })).toBe(resolve(cwd, '.agents/skills/guiho-s-xdocs/SKILL.md'))
    expect(resolveSkillPath('claude', 'local', { cwd })).toBe(resolve(cwd, '.claude/skills/guiho-s-xdocs/SKILL.md'))
  })

  test('resolves global paths under the provided home directory', () => {
    const home = resolve(tmpdir(), 'xdocs-home-fixture')
    expect(resolveSkillPath('agents', 'global', { homeDirectory: home })).toBe(resolve(home, '.agents/skills/guiho-s-xdocs/SKILL.md'))
    expect(resolveSkillPath('claude', 'global', { homeDirectory: home })).toBe(resolve(home, '.claude/skills/guiho-s-xdocs/SKILL.md'))
  })
})

describe('installSkill', () => {
  test('installs, is idempotent, and reports updates', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-skill-'))
    try {
      expect(isSkillInstalled('agents', 'local', { cwd: dir })).toBe(false)

      const first = await installSkill('agents', 'local', { cwd: dir })
      expect(first.installed).toBe(true)
      expect(first.updated).toBe(false)
      expect(first.removedLegacyPaths).toEqual([])
      expect(first.bundledVersion).toBe(xdocsSkillVersion)
      expect(isSkillInstalled('agents', 'local', { cwd: dir })).toBe(true)

      const written = await readFile(first.path, 'utf8')
      expect(written).toBe(xdocsSkillContent)

      const second = await installSkill('agents', 'local', { cwd: dir })
      expect(second.installed).toBe(false)
      expect(second.updated).toBe(false)

      await writeFile(first.path, 'stale content', 'utf8')
      const third = await installSkill('agents', 'local', { cwd: dir })
      expect(third.installed).toBe(false)
      expect(third.updated).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('removes the legacy skill name and installs the canonical skill', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-skill-legacy-'))
    try {
      const legacyPath = resolve(dir, '.agents/skills/guiho-as-xdocs/SKILL.md')
      await mkdir(dirname(legacyPath), { recursive: true })
      await writeFile(legacyPath, 'legacy content', 'utf8')

      const result = await installSkill('agents', 'local', { cwd: dir })

      expect(result.installed).toBe(true)
      expect(result.updated).toBe(false)
      expect(result.removedLegacyPaths).toEqual([legacyPath])
      expect(existsSync(legacyPath)).toBe(false)
      expect(await readFile(result.path, 'utf8')).toBe(xdocsSkillContent)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('replaces an installed canonical skill when version or content differs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-skill-version-'))
    try {
      const path = resolveSkillPath('agents', 'local', { cwd: dir })
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, '---\nname: guiho-s-xdocs\nversion: 0.0.0\n---\n\nOld skill.\n', 'utf8')

      const result = await installSkill('agents', 'local', { cwd: dir })

      expect(result.installed).toBe(false)
      expect(result.updated).toBe(true)
      expect(result.previousVersion).toBe('0.0.0')
      expect(result.bundledVersion).toBe(xdocsSkillVersion)
      expect(await readFile(result.path, 'utf8')).toBe(xdocsSkillContent)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('respects overwrite: false on an existing file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-skill-'))
    try {
      await installSkill('agents', 'local', { cwd: dir })
      await writeFile(resolveSkillPath('agents', 'local', { cwd: dir }), 'custom', 'utf8')
      const result = await installSkill('agents', 'local', { cwd: dir, overwrite: false })
      expect(result.installed).toBe(false)
      expect(result.updated).toBe(false)
      expect(await readFile(result.path, 'utf8')).toBe('custom')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('installSkills', () => {
  test('installs the skill for several tools', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-skills-'))
    try {
      const results = await installSkills(['agents', 'claude'], 'global', { homeDirectory: dir })
      expect(results.map((r) => r.tool)).toEqual(['agents', 'claude'])
      expect(results.every((r) => r.installed)).toBe(true)
      for (const result of results) {
        expect(await readFile(result.path, 'utf8')).toBe(xdocsSkillContent)
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('runAgentAutomation', () => {
  test('refreshes the configured global skill and removes legacy installs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-automation-'))
    const home = await mkdtemp(join(tmpdir(), 'xdocs-home-'))
    try {
      await writeFile(join(dir, 'xdocs.config.toml'), 'schema = 1\n\n[agents]\nauto_agents_md = false\nauto_skill_install = true\nskill_tool = "agents"\n', 'utf8')

      const stalePath = resolve(home, '.agents/skills/guiho-s-xdocs/SKILL.md')
      const legacyPath = resolve(home, '.agents/skills/guiho-as-xdocs/SKILL.md')
      await mkdir(dirname(stalePath), { recursive: true })
      await mkdir(dirname(legacyPath), { recursive: true })
      await writeFile(stalePath, '---\nname: guiho-s-xdocs\nversion: 0.0.0\n---\n\nOld skill.\n', 'utf8')
      await writeFile(legacyPath, 'legacy skill', 'utf8')

      const notices: string[] = []
      const result = await runAgentAutomation({ cwd: dir, homeDirectory: home, format: 'text', verbose: false }, (message) => notices.push(message))

      expect(result.globalSkill?.updated).toBe(true)
      expect(result.globalSkill?.previousVersion).toBe('0.0.0')
      expect(result.globalSkill?.removedLegacyPaths).toEqual([legacyPath])
      expect(await readFile(stalePath, 'utf8')).toBe(xdocsSkillContent)
      expect(existsSync(legacyPath)).toBe(false)
      expect(notices.some((message) => message.includes('refreshed globally'))).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
      await rm(home, { recursive: true, force: true })
    }
  })

  test('runs on a bare CLI invocation in an xdocs project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-cli-automation-'))
    const home = await mkdtemp(join(tmpdir(), 'xdocs-cli-home-'))
    const previousAgentHome = process.env['XDOCS_AGENT_HOME']
    try {
      process.env['XDOCS_AGENT_HOME'] = home
      await writeFile(join(dir, 'xdocs.config.toml'), 'schema = 1\n\n[agents]\nauto_agents_md = false\nauto_skill_install = true\nskill_tool = "agents"\n', 'utf8')

      const legacyPath = resolve(home, '.agents/skills/guiho-as-xdocs/SKILL.md')
      const canonicalPath = resolve(home, '.agents/skills/guiho-s-xdocs/SKILL.md')
      await mkdir(dirname(legacyPath), { recursive: true })
      await writeFile(legacyPath, 'legacy skill', 'utf8')

      await runCli(['--cwd', dir])

      expect(await readFile(canonicalPath, 'utf8')).toBe(xdocsSkillContent)
      expect(existsSync(legacyPath)).toBe(false)
    } finally {
      if (previousAgentHome === undefined) {
        delete process.env['XDOCS_AGENT_HOME']
      } else {
        process.env['XDOCS_AGENT_HOME'] = previousAgentHome
      }
      await rm(dir, { recursive: true, force: true })
      await rm(home, { recursive: true, force: true })
    }
  })

  test('bootstraps the standard global skill on a bare CLI invocation without config', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-cli-bootstrap-'))
    const home = await mkdtemp(join(tmpdir(), 'xdocs-cli-bootstrap-home-'))
    const previousAgentHome = process.env['XDOCS_AGENT_HOME']
    try {
      process.env['XDOCS_AGENT_HOME'] = home

      const legacyPath = resolve(home, '.agents/skills/guiho-as-xdocs/SKILL.md')
      const canonicalPath = resolve(home, '.agents/skills/guiho-s-xdocs/SKILL.md')
      await mkdir(dirname(legacyPath), { recursive: true })
      await writeFile(legacyPath, 'legacy skill', 'utf8')

      await runCli(['--cwd', dir])

      expect(await readFile(canonicalPath, 'utf8')).toBe(xdocsSkillContent)
      expect(existsSync(legacyPath)).toBe(false)
    } finally {
      if (previousAgentHome === undefined) {
        delete process.env['XDOCS_AGENT_HOME']
      } else {
        process.env['XDOCS_AGENT_HOME'] = previousAgentHome
      }
      await rm(dir, { recursive: true, force: true })
      await rm(home, { recursive: true, force: true })
    }
  })
})

describe('ensureAgentsInstructions', () => {
  test('appends the xdocs section to an existing AGENTS.md without markers', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-agents-'))
    try {
      const path = join(dir, 'AGENTS.md')
      await writeFile(path, '# Project\n\nSome notes.\n', 'utf8')

      const result = await ensureAgentsInstructions(dir, false)
      expect(result.exists).toBe(true)
      expect(result.changed).toBe(true)

      const content = await readFile(path, 'utf8')
      expect(content).toContain('Some notes.')
      expect(content).toContain(xdocsSkillName)
      for (const legacyName of legacyXdocsSkillNames) expect(content).not.toContain(legacyName)
      expect(content).toContain('## XDocs Structured Documentation')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('is idempotent and replaces a tampered section in place', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-agents-'))
    try {
      const path = join(dir, 'AGENTS.md')
      await writeFile(path, `# Project\n\n${xdocsAgentsSection}\n`, 'utf8')

      const unchanged = await ensureAgentsInstructions(dir, false)
      expect(unchanged.changed).toBe(false)

      await writeFile(path, '# Project\n\n<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->\nTAMPERED\n<!-- END XDOCS -->\n', 'utf8')
      const restored = await ensureAgentsInstructions(dir, false)
      expect(restored.changed).toBe(true)

      const content = await readFile(path, 'utf8')
      expect(content).not.toContain('TAMPERED')
      expect(content.match(/BEGIN XDOCS/g)?.length).toBe(1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('preserves formatter-only blank line changes inside the xdocs section', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-agents-'))
    try {
      const path = join(dir, 'AGENTS.md')
      const formattedSection = xdocsAgentsSection
        .replace('<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->\n## XDocs', '<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->\n\n## XDocs')
        .replace('\n<!-- END XDOCS -->', '\n\n<!-- END XDOCS -->')
      const formattedContent = `# Project\n\n${formattedSection}\n`
      await writeFile(path, formattedContent, 'utf8')

      const result = await ensureAgentsInstructions(dir, false)
      expect(result.changed).toBe(false)
      expect(await readFile(path, 'utf8')).toBe(formattedContent)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('does nothing when AGENTS.md is absent and create is false', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-agents-none-'))
    try {
      // Seed a local AGENTS.md so the upward search stops here deterministically.
      const path = join(dir, 'AGENTS.md')
      await writeFile(path, `# Local\n\n${xdocsAgentsSection}\n`, 'utf8')
      const result = await ensureAgentsInstructions(dir, false)
      expect(result.changed).toBe(false)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('skill bundle', () => {
  test('exposes the embedded skill with frontmatter', () => {
    expect(xdocsSkillName).toBe('guiho-s-xdocs')
    expect(legacyXdocsSkillNames).toContain('guiho-as-xdocs')
    expect(xdocsSkillContent.startsWith('---')).toBe(true)
    expect(xdocsSkillContent).toContain('name: guiho-s-xdocs')
    expect(readSkillVersion(xdocsSkillContent)).toBe(xdocsSkillVersion)
  })
})
