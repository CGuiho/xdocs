import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createXDocsCommand, runCli, runCliWithErrorHandling } from './cli.js'
import { readPackageVersion } from './help.js'

type Captured = { stdout: string, stderr: string }
const temporaryPaths: string[] = []

afterEach(async () => {
  process.exitCode = 0
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('RFC 0034 Citty catalog', () => {
  test('exposes only the final public root catalog', () => {
    const root = createXDocsCommand()
    const commands = root.subCommands as Record<string, { meta?: { hidden?: boolean } }>
    const names = Object.entries(commands)
      .filter(([, command]) => !command.meta?.hidden)
      .map(([name]) => name)
    expect(names).toEqual(['init', 'scan', 'generate', 'merge', 'tree', 'list', 'meta', 'context', 'doctor', 'agent', 'upgrade', 'uninstall'])
    expect(names).not.toContain('prompt')
    expect(names).not.toContain('agents')
    expect(names).not.toContain('home')
  })

  test.serial('prints the exact no-argument banner and root versions', async () => {
    const previous = process.env['XDOCS_DISABLE_UPDATE_CHECK']
    process.env['XDOCS_DISABLE_UPDATE_CHECK'] = '1'
    try {
      expect((await capture(() => runCli([]))).stdout).toBe(`Hello Windows - xdocs v${readPackageVersion()}\n`)
      expect((await capture(() => runCli(['-v']))).stdout).toBe(`xdocs ${readPackageVersion()}\n`)
      expect((await capture(() => runCli(['--version']))).stdout).toBe(`xdocs ${readPackageVersion()}\n`)
    } finally {
      if (previous === undefined) delete process.env['XDOCS_DISABLE_UPDATE_CHECK']
      else process.env['XDOCS_DISABLE_UPDATE_CHECK'] = previous
    }
  })

  test.serial('renders help, Unicode trees, positive depth, and Markdown docs at nested scopes', async () => {
    expect((await capture(() => runCli(['agent', 'skill', 'show', '--help']))).stdout).toContain('xdocs agent skill show')
    const tree = await capture(() => runCli(['agent', '--help-tree']))
    expect(tree.stdout).toStartWith('COMMAND TREE\n\n')
    expect(tree.stdout).toContain('├── skill')
    expect(tree.stdout).not.toContain('|-')
    const depth = await capture(() => runCli(['agent', '--help-tree-depth', '1']))
    expect(depth.stdout).toContain('skill')
    expect(depth.stdout).not.toContain('install')
    const docs = await capture(() => runCli(['agent', 'prompt', '--help-docs']))
    expect(docs.stdout).toStartWith('# xdocs agent prompt')
  })

  test.serial('renders the real public catalog from every root help mode and rejects synthetic home', async () => {
    const help = await runSourceCli(['-h'])
    expect(help.exitCode).toBe(0)
    expect(help.stdout).toContain('init')
    expect(help.stdout).toContain('agent')
    expect(help.stdout).toContain('upgrade')
    expect(help.stdout).toContain('EXAMPLES')
    expect(help.stdout).toContain('xdocs scan')
    expect(help.stdout).not.toContain('\nhome')
    expect(help.stdout).not.toContain('--check-updates-worker')

    const tree = await runSourceCli(['--help-tree'])
    expect(tree.exitCode).toBe(0)
    expect(tree.stdout).toStartWith('COMMAND TREE\n\nxdocs')
    expect(tree.stdout).toContain('├── init')
    expect(tree.stdout).toContain('├── agent')
    expect(tree.stdout).toContain('├── upgrade')
    expect(tree.stdout).not.toContain('home')
    expect(tree.stdout).not.toContain('--check-updates-worker')

    const depth = await runSourceCli(['--help-tree-depth', '1'])
    expect(depth.exitCode).toBe(0)
    expect(depth.stdout).toContain('agent')
    expect(depth.stdout).not.toContain('skill')

    const docs = await runSourceCli(['--help-docs'])
    expect(docs.exitCode).toBe(0)
    expect(docs.stdout).toStartWith('# xdocs\n')
    expect(docs.stdout).toContain('## Subcommands')
    expect(docs.stdout).toContain('- `agent`')
    expect(docs.stdout).toContain('- `upgrade`')
    expect(docs.stdout).toContain('## Examples')
    expect(docs.stdout).toContain('`xdocs scan`')
    expect(docs.stdout).not.toContain('home')
    expect(docs.stdout).not.toContain('--check-updates-worker')

    const home = await runSourceCli(['home'])
    expect(home.exitCode).toBe(2)
    expect(home.stdout).toBe('')
    expect(home.stderr).toContain('Unknown command')
  })

  test.serial('preserves all four prompts in the singular agent namespace', async () => {
    expect((await capture(() => runCli(['agent', 'prompt', 'list', '--names']))).stdout).toBe('write\nupdate\nagents\ngenerate\n')
    const listed = await capture(() => runCli(['agent', 'prompt', 'list', '--format', 'json']))
    expect(JSON.parse(listed.stdout)).toHaveLength(4)
    expect((await capture(() => runCli(['agent', 'prompt', 'show', 'write']))).stdout).toContain('xdocs')
  })

  test.serial('installs and removes skills in both local tool locations', async () => {
    const root = await temp()
    await capture(() => runCli(['agent', 'skill', 'install', '--local', '--cwd', root, '--format', 'json']))
    expect(existsSync(join(root, '.agents', 'skills', 'guiho-s-xdocs', 'SKILL.md'))).toBeTrue()
    expect(existsSync(join(root, '.claude', 'skills', 'guiho-s-xdocs', 'SKILL.md'))).toBeTrue()
    await capture(() => runCli(['agent', 'skill', 'uninstall', '--local', '--cwd', root, '--format', 'json']))
    expect(existsSync(join(root, '.agents', 'skills', 'guiho-s-xdocs'))).toBeFalse()
    expect(existsSync(join(root, '.claude', 'skills', 'guiho-s-xdocs'))).toBeFalse()
  })

  test.serial('applies, updates, shows, and removes exact instruction blocks', async () => {
    const root = await temp()
    await writeFile(join(root, 'AGENTS.md'), '# Agent\n')
    await writeFile(join(root, 'CLAUDE.md'), '# Claude\n')
    await capture(() => runCli(['agent', 'instruction', 'apply', '--cwd', root]))
    await capture(() => runCli(['agent', 'instruction', 'update', '--cwd', root]))
    for (const name of ['AGENTS.md', 'CLAUDE.md']) {
      const content = await readFile(join(root, name), 'utf8')
      expect(content.match(/<!-- BEGIN XDOCS/g)?.length).toBe(1)
      expect(content).toContain('<!-- END XDOCS -->')
    }
    expect((await capture(() => runCli(['agent', 'instruction', 'show']))).stdout).toContain('xdocs.yaml')
    await capture(() => runCli(['agent', 'instruction', 'remove', '--cwd', root]))
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toBe('# Agent\n')
  })

  test.serial('initializes YAML without implicit agent mutations', async () => {
    const root = await temp()
    await capture(() => runCli(['init', '--cwd', root]))
    expect(existsSync(join(root, 'xdocs.yaml'))).toBeTrue()
    expect(existsSync(join(root, 'XDOCS.md'))).toBeTrue()
    expect(existsSync(join(root, 'AGENTS.md'))).toBeFalse()
    expect(existsSync(join(root, '.agents'))).toBeFalse()
  })

  test.serial('preserves structured documentation domain commands under YAML', async () => {
    const root = await documentedProject()
    const scan = await capture(() => runCli(['scan', '--cwd', root, '--format', 'json']))
    expect(JSON.parse(scan.stdout).xdocsFiles.length).toBeGreaterThan(0)
    const tree = await capture(() => runCli(['tree', '--cwd', root, '--format', 'json']))
    expect(JSON.parse(tree.stdout).subject).toBe('fixture')
    const doctor = await capture(() => runCli(['doctor', '--cwd', root, '--format', 'json']))
    expect(JSON.parse(doctor.stdout).valid).toBeTrue()
  })

  test.serial('orders cached notices before ordinary output without corrupting JSON stdout', async () => {
    const root = await documentedProject()
    const cache = await temp()
    const previousCache = process.env['XDOCS_CACHE_DIR']
    process.env['XDOCS_CACHE_DIR'] = cache
    await writeFile(join(cache, 'cache.json'), JSON.stringify({
      newVersionAvailable: true,
      latestVersion: '9.9.9',
      upgradeCommand: 'xdocs upgrade',
      lastCheck: new Date().toISOString(),
    }))
    try {
      const text = await capture(() => runCli(['agent', 'prompt', 'list', '--names']))
      expect(text.stdout).toStartWith('New version available. Run this command to upgrade: xdocs upgrade\n')
      const json = await capture(() => runCli(['scan', '--cwd', root, '--format', 'json']))
      expect(JSON.parse(json.stdout).xdocsFiles.length).toBeGreaterThan(0)
      expect(json.stderr).toStartWith('New version available. Run this command to upgrade: xdocs upgrade\n')
      expect(json.stderr).toContain('configuration file loaded:')
    } finally {
      if (previousCache === undefined) delete process.env['XDOCS_CACHE_DIR']
      else process.env['XDOCS_CACHE_DIR'] = previousCache
    }
  })

  test.serial('maps Citty usage failures to exit code 2', async () => {
    const result = await capture(() => runCliWithErrorHandling(['not-a-command']))
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('Unknown command')
    expect(process.exitCode).toBe(2)
  })

  test.serial('routes nested upgrade version flags to the direct upgrade action', async () => {
    const previousPath = process.env['XDOCS_SELF_PATH']
    const previousUpdate = process.env['XDOCS_DISABLE_UPDATE_CHECK']
    process.env['XDOCS_SELF_PATH'] = process.execPath
    process.env['XDOCS_DISABLE_UPDATE_CHECK'] = '1'
    try {
      const result = await capture(() => runCli([
        'upgrade',
        '--version',
        readPackageVersion(),
        '--dry-run',
        '--format',
        'json',
      ]))
      expect(JSON.parse(result.stdout).outcome).toBe('up-to-date')
      expect(result.stderr).toBe('')
    } finally {
      if (previousPath === undefined) delete process.env['XDOCS_SELF_PATH']
      else process.env['XDOCS_SELF_PATH'] = previousPath
      if (previousUpdate === undefined) delete process.env['XDOCS_DISABLE_UPDATE_CHECK']
      else process.env['XDOCS_DISABLE_UPDATE_CHECK'] = previousUpdate
    }
  })

  test('keeps only the hidden worker internal and the final upgrade subtree public', () => {
    const root = createXDocsCommand()
    const commands = root.subCommands as Record<string, { subCommands?: Record<string, unknown> }>
    expect(root.default).toBeUndefined()
    expect(root.run).toBeFunction()
    expect(commands['home']).toBeUndefined()
    expect(Object.keys(commands['upgrade']?.subCommands ?? {})).toEqual(['check', 'list'])
  })
})

async function runSourceCli(args: string[]): Promise<{ stdout: string, stderr: string, exitCode: number }> {
  const entrypoint = Bun.fileURLToPath(new URL('./guiho-xdocs-bin.ts', import.meta.url))
  const child = Bun.spawn([process.execPath, entrypoint, ...args], {
    cwd: import.meta.dir,
    env: { ...Bun.env, XDOCS_DISABLE_UPDATE_CHECK: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function temp(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'xdocs-rfc-cli-'))
  temporaryPaths.push(path)
  return path
}

async function documentedProject(): Promise<string> {
  const root = await temp()
  await mkdir(join(root, 'out'))
  await writeFile(join(root, 'xdocs.yaml'), 'schema: 1\nscan:\n  exclude:\n    - out\nproject:\n  name: fixture\n')
  await writeFile(join(root, 'XDOCS.md'), '# Fixture\n')
  await writeFile(join(root, 'fixture.xdocs.md'), `---
subject: fixture
description: Fixture project.
parent: null
children: []
files: {}
documents: {}
tags: [fixture]
keywords: [fixture]
flags: []
---
Fixture.
`)
  return root
}

async function capture(action: () => Promise<void>): Promise<Captured> {
  const stdout: string[] = []
  const stderr: string[] = []
  const out = process.stdout.write
  const err = process.stderr.write
  process.stdout.write = ((chunk: string | Uint8Array) => (stdout.push(String(chunk)), true)) as typeof process.stdout.write
  process.stderr.write = ((chunk: string | Uint8Array) => (stderr.push(String(chunk)), true)) as typeof process.stderr.write
  try {
    await action()
  } finally {
    process.stdout.write = out
    process.stderr.write = err
  }
  return { stdout: stdout.join(''), stderr: stderr.join('') }
}
