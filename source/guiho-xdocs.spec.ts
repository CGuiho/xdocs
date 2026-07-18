import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CONFIG_FILENAME,
  applyInstructions,
  createDefaultConfigContent,
  discoverConfig,
  getPromptNames,
  listEmbeddedSkills,
  loadConfig,
  normalizeConfig,
  removeInstructions,
  validateMetadata,
  xdocsInstructionBlock,
} from './guiho-xdocs.js'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'xdocs-rfc-0034-'))
  temporaryPaths.push(path)
  return path
}

describe('RFC 0034 YAML configuration', () => {
  test('uses xdocs.yaml and preserves domain defaults', () => {
    expect(CONFIG_FILENAME).toBe('xdocs.yaml')
    expect(createDefaultConfigContent('C:\\work\\demo')).toContain('ai:\n  mode: prompt')
    const config = normalizeConfig({}, 'C:\\work\\demo')
    expect(config.extensions.supported).toEqual(['.xdocs.md'])
    expect(config.scan.exclude).toContain('node_modules')
    expect('agents' in config).toBeFalse()
  })

  test('explicit path wins over project configuration', async () => {
    const root = await temporaryDirectory()
    const explicit = join(root, 'custom.yaml')
    await writeFile(join(root, 'xdocs.yaml'), 'schema: 1\nproject:\n  name: project\n')
    await writeFile(explicit, 'schema: 1\nproject:\n  name: explicit\n')
    const discovered = await discoverConfig(root, explicit)
    expect(discovered.path).toBe(explicit)
    expect(discovered.raw?.project?.name).toBe('explicit')
  })

  test('rejects invalid YAML shape with config exit code', async () => {
    const root = await temporaryDirectory()
    await writeFile(join(root, 'xdocs.yaml'), 'schema: wrong\n')
    await expect(loadConfig({ cwd: root, format: 'text', verbose: false })).rejects.toMatchObject({ exitCode: 3 })
  })
})

describe('TypeBox metadata boundary', () => {
  test('accepts a complete descriptor', () => {
    const result = validateMetadata({
      subject: 'demo',
      description: 'Demo module.',
      parent: null,
      children: [],
      files: {},
      documents: {},
      tags: [],
      keywords: [],
      flags: [],
    })
    expect(result.valid).toBeTrue()
  })

  test('rejects structured fields with wrong types', () => {
    const result = validateMetadata({ subject: 'demo', children: 'wrong' })
    expect(result.valid).toBeFalse()
    if (!result.valid) expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('explicit agent resources', () => {
  test('catalog contains the canonical skill and four prompts', () => {
    expect(listEmbeddedSkills().map((skill) => skill.id)).toEqual(['guiho-s-xdocs'])
    expect(getPromptNames()).toEqual(['write', 'update', 'agents', 'generate'])
  })

  test('instruction apply and remove are idempotent', async () => {
    const root = await temporaryDirectory()
    const agentsPath = join(root, 'AGENTS.md')
    await writeFile(agentsPath, '# Existing\n')
    await applyInstructions(root)
    await applyInstructions(root)
    const applied = await readFile(agentsPath, 'utf8')
    expect(applied.match(/<!-- BEGIN XDOCS/g)?.length).toBe(1)
    expect(applied).toContain(xdocsInstructionBlock)
    await removeInstructions(root)
    await removeInstructions(root)
    expect(await readFile(agentsPath, 'utf8')).toBe('# Existing\n')
  })

  test('targets both instruction files when both exist', async () => {
    const root = await temporaryDirectory()
    await writeFile(join(root, 'AGENTS.md'), '')
    await writeFile(join(root, 'CLAUDE.md'), '')
    const results = await applyInstructions(root)
    expect(results.map((result) => result.path).sort()).toEqual([
      join(root, 'AGENTS.md'),
      join(root, 'CLAUDE.md'),
    ].sort())
  })
})
