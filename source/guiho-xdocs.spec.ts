/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { describe, test, expect } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { parseArgs, stringFlag, booleanFlag, listFlag } from './flags.js'
import { extractFrontmatter, validateMetadata } from './metadata.js'
import { buildTree, renderTree, renderTreeMarkdown, validateTree } from './tree.js'
import { normalizeConfig, defaultConfig, normalizeAgentSettings } from './config.js'
import { isPlainMarkdownDocument, isXDocsDescriptorFile, isXDocsFile, scanProject } from './discovery.js'
import { runCli } from './cli.js'
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

// ---------------------------------------------------------------------------
// flags.ts
// ---------------------------------------------------------------------------
describe('parseArgs', () => {
  test('parses a bare command', () => {
    const result = parseArgs(['scan'])
    expect(result.command).toBe('scan')
    expect(result.positionals).toEqual([])
    expect(result.flags).toEqual({})
  })

  test('parses a command with positional', () => {
    const result = parseArgs(['generate', './src/auth'])
    expect(result.command).toBe('generate')
    expect(result.positionals).toEqual(['./src/auth'])
  })

  test('parses --flag=value style', () => {
    const result = parseArgs(['prompt', '--name=write'])
    expect(result.command).toBe('prompt')
    expect(result.flags['name']).toBe('write')
  })

  test('parses --flag value style', () => {
    const result = parseArgs(['prompt', '--name', 'write'])
    expect(result.command).toBe('prompt')
    expect(result.flags['name']).toBe('write')
  })

  test('parses boolean flags', () => {
    const result = parseArgs(['scan', '--verbose'])
    expect(result.flags['verbose']).toBe(true)
  })

  test('parses short flags -h and -v', () => {
    expect(parseArgs(['-h']).flags['help']).toBe(true)
    expect(parseArgs(['-v']).flags['version']).toBe(true)
  })

  test('parses list flags as comma-separated arrays', () => {
    const result = parseArgs(['scan', '--extensions=.xdocs.md,.custom.md'])
    expect(result.flags['extensions']).toEqual(['.xdocs.md', '.custom.md'])
  })

  test('returns undefined command when no args', () => {
    const result = parseArgs([])
    expect(result.command).toBeUndefined()
  })

  test('stops parsing after --', () => {
    const result = parseArgs(['scan', '--', '--verbose', 'extra'])
    expect(result.command).toBe('scan')
    expect(result.positionals).toEqual(['--verbose', 'extra'])
    expect(result.flags['verbose']).toBeUndefined()
  })

  test('throws on unknown short flag', () => {
    expect(() => parseArgs(['-x'])).toThrow(XDocsError)
  })

  test('throws on missing value for value flag', () => {
    expect(() => parseArgs(['prompt', '--name'])).toThrow(XDocsError)
  })

  test('normalizes kebab-case keys to camelCase', () => {
    const result = parseArgs(['scan', '--some-flag=value'])
    expect(result.flags['someFlag']).toBe('value')
  })
})

describe('flag helpers', () => {
  test('stringFlag returns string values', () => {
    expect(stringFlag({ name: 'write' }, 'name')).toBe('write')
  })

  test('stringFlag returns undefined for non-string', () => {
    expect(stringFlag({ verbose: true }, 'verbose')).toBeUndefined()
    expect(stringFlag({}, 'missing')).toBeUndefined()
  })

  test('booleanFlag returns true/false', () => {
    expect(booleanFlag({ verbose: true }, 'verbose')).toBe(true)
    expect(booleanFlag({}, 'verbose')).toBe(false)
    expect(booleanFlag({ verbose: 'yes' }, 'verbose')).toBe(false)
  })

  test('listFlag returns arrays', () => {
    expect(listFlag({ ext: ['.md', '.txt'] }, 'ext')).toEqual(['.md', '.txt'])
    expect(listFlag({ ext: 'single' }, 'ext')).toBeUndefined()
    expect(listFlag({}, 'ext')).toBeUndefined()
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
})

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

describe('validateMetadata', () => {
  const validMeta = {
    subject: 'auth',
    description: 'Authentication module',
    parent: null,
    children: ['login', 'register'],
    files: { 'auth.ts': 'Main auth logic' },
    documents: { 'auth-flow.md': 'Authentication flow notes' },
    tags: ['security'],
    flags: [],
  }

  test('validates correct metadata', () => {
    const result = validateMetadata(validMeta)
    expect(result.valid).toBe(true)
    expect(result.metadata).not.toBeNull()
    expect(result.metadata?.subject).toBe('auth')
    expect(result.metadata?.children).toEqual(['login', 'register'])
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

  test('renders nested indentation', () => {
    const files = [
      makeFile('root', null, ['a']),
      makeFile('a', 'root', ['b']),
      makeFile('b', 'a'),
    ]
    const tree = buildTree(files)
    const output = renderTree(tree)
    const lines = output.split('\n')

    expect(lines[0]).toBe('root')
    expect(lines[1]).toBe('  a')
    expect(lines[2]).toBe('    b')
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
