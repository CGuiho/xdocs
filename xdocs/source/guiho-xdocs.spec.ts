/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { describe, test, expect } from 'bun:test'
import { parseArgs, stringFlag, booleanFlag, listFlag } from './flags.js'
import { extractFrontmatter, validateMetadata } from './metadata.js'
import { buildTree, renderTree, renderTreeMarkdown, validateTree } from './tree.js'
import { normalizeConfig, defaultConfig } from './config.js'
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
    const result = parseArgs(['scan', '--extensions=.docs.md,.xdocs.md'])
    expect(result.flags['extensions']).toEqual(['.docs.md', '.xdocs.md'])
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
    tags: [],
    flags: [],
  },
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
    expect(config.extensions.supported).toEqual(['.docs.md', '.xdocs.md'])
    expect(config.ai.mode).toBe('prompt')
    expect(config.scan.exclude).toContain('node_modules')
    expect(config.project.name).toBe('project')
  })

  test('normalizes a full raw config', () => {
    const raw: XDocsRawConfig = {
      schema: 1,
      extensions: { supported: ['.custom.md'] },
      ai: { mode: 'auto' },
      scan: { exclude: ['vendor'] },
      project: { name: 'my-project' },
    }
    const config = normalizeConfig(raw, '/project')

    expect(config.extensions.supported).toEqual(['.custom.md'])
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
})
