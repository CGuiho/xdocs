/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createXDocsCommand, runCli } from './cli.js'
import { XDocsError } from './errors.js'
import { readPackageVersion } from './help.js'

type CapturedOutput = {
  stdout: string
  stderr: string
}

describe('Citty CLI', () => {
  test.serial('renders root, command, and nested command usage without project access', async () => {
    const missingProject = join(tmpdir(), 'xdocs-missing-project')
    const { stdout } = await captureOutput(async () => {
      await runCli(['--cwd', missingProject, '-h'])
      for (const command of ['init', 'scan', 'generate', 'prompt', 'merge', 'tree', 'list', 'meta', 'context', 'doctor', 'agents', 'upgrade', 'uninstall']) {
        await runCli([command, '--cwd', missingProject, '--help'])
      }
      await runCli(['agents', 'install', '--cwd', missingProject, '--help'])
      await runCli(['agents', 'instructions', '--cwd', missingProject, '--help'])
      await runCli(['upgrade', 'check', '--cwd', missingProject, '--help'])
      await runCli(['upgrade', 'list', '--cwd', missingProject, '--help'])
    })

    expect(stdout).toContain('xdocs [OPTIONS]')
    expect(stdout).toContain('xdocs context [OPTIONS] <QUERY> [PATH]')
    expect(stdout).toContain('xdocs agents install [OPTIONS] <SCOPE>')
    expect(stdout).toContain('xdocs upgrade check [OPTIONS]')
  })

  test.serial('renders short and long version outside a project', async () => {
    const missingProject = join(tmpdir(), 'xdocs-missing-project')
    const { stdout } = await captureOutput(async () => {
      await runCli(['--cwd', missingProject, '-v'])
      await runCli(['--cwd', missingProject, '--version'])
    })

    expect(stdout).toBe(`xdocs ${readPackageVersion()}\nxdocs ${readPackageVersion()}\n`)
  })

  test.serial('keeps extended help tree and Markdown help available', async () => {
    const tree = await captureOutput(() => runCli(['agents', '--help-tree']))
    const docs = await captureOutput(() => runCli(['context', '--help-docs']))

    expect(tree.stdout).toContain('xdocs agents install')
    expect(docs.stdout).toContain('# xdocs context')
  })

  test('reports contextual Citty usage errors before project automation', async () => {
    const cases: Array<{ args: string[], message: string }> = [
      { args: ['unknown'], message: 'Unknown command' },
      { args: ['--unknown', 'scan'], message: 'Unknown option: --unknown' },
      { args: ['scan', '--unknown'], message: 'Unknown option: --unknown' },
      { args: ['scan', 'extra'], message: 'Unexpected argument: extra' },
      { args: ['prompt'], message: 'Missing required argument: --name' },
      { args: ['prompt', '--name', 'invalid'], message: 'Invalid value for argument' },
      { args: ['context'], message: 'Missing required positional argument: QUERY' },
      { args: ['context', 'query', '--limit', '0'], message: 'Expected a positive integer' },
      { args: ['agents'], message: 'No command specified' },
      { args: ['agents', 'install'], message: 'Missing required positional argument: SCOPE' },
      { args: ['agents', 'install', 'workspace'], message: 'Expected local or global' },
      { args: ['upgrade', '--arch', 'mips'], message: 'Invalid value for argument' },
      { args: ['scan', '--format', 'yaml'], message: 'Invalid value for argument' },
    ]

    for (const entry of cases) {
      try {
        await runCli(entry.args)
        throw new Error(`Expected failure for ${entry.args.join(' ')}`)
      } catch (error) {
        expect(error).toBeInstanceOf(XDocsError)
        expect((error as Error).message).toContain(entry.message)
        expect((error as Error).message).toContain('USAGE')
      }
    }
  })

  test.serial('runs data commands with clean structured output and file outputs', async () => {
    const dir = await createDocumentedProject()
    try {
      const scan = await captureOutput(() => runCli(['scan', '--cwd', dir, '--format', 'json']))
      expect(JSON.parse(scan.stdout).xdocsFiles).toHaveLength(2)
      expect(scan.stderr).toBe('')

      const tree = await captureOutput(() => runCli(['tree', '--cwd', dir, '--format', 'json']))
      expect(JSON.parse(tree.stdout).subject).toBe('fixture')

      const list = await captureOutput(() => runCli(['list', '--cwd', dir, '--format', 'json']))
      expect(Array.isArray(JSON.parse(list.stdout))).toBe(true)

      const meta = await captureOutput(() => runCli(['meta', '--cwd', dir, '--format', 'json']))
      expect(JSON.parse(meta.stdout).descriptors).toHaveLength(1)

      const context = await captureOutput(() => runCli(['context', 'fixture', '--cwd', dir, '--format', 'json']))
      expect(JSON.parse(context.stdout).entries.length).toBeGreaterThan(0)

      const doctor = await captureOutput(() => runCli(['doctor', '--cwd', dir, '--format', 'json']))
      expect(JSON.parse(doctor.stdout).valid).toBe(true)

      await captureOutput(() => runCli(['generate', '--cwd', dir, '--output', 'out/generated.md']))
      await captureOutput(() => runCli(['merge', '--cwd', dir, '--output', 'out/merged.md']))
      await captureOutput(() => runCli(['tree', '--cwd', dir, '--output', 'out/tree.txt']))

      expect(existsSync(join(dir, 'out', 'generated.md'))).toBe(true)
      expect(existsSync(join(dir, 'out', 'merged.md'))).toBe(true)
      expect(existsSync(join(dir, 'out', 'tree.txt'))).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test.serial('routes init and nested agents commands through Citty', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-citty-init-'))
    try {
      await writeFile(join(dir, 'AGENTS.md'), '# Fixture Agent Instructions\n', 'utf8')
      await captureOutput(() => runCli(['init', '--cwd', dir, '--tool', 'agents']))
      expect(existsSync(join(dir, 'XDOCS.md'))).toBe(true)
      expect(existsSync(join(dir, 'xdocs.config.toml'))).toBe(true)
      expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true)
      expect(existsSync(join(dir, '.agents', 'skills', 'guiho-s-xdocs', 'SKILL.md'))).toBe(true)

      const install = await captureOutput(() => runCli(['agents', 'install', 'local', '--cwd', dir, '--tool', 'agents', '--format', 'json']))
      expect(JSON.parse(install.stdout)[0].scope).toBe('local')

      const instructions = await captureOutput(() => runCli(['agents', 'instructions', '--cwd', dir, '--format', 'json']))
      expect(JSON.parse(instructions.stdout).exists).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test.serial('routes prompt, equal-version upgrade, and uninstall dry-run', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-citty-self-'))
    const executable = join(dir, process.platform === 'win32' ? 'xdocs.exe' : 'xdocs')
    const previousSelfPath = process.env['XDOCS_SELF_PATH']
    try {
      await writeFile(executable, process.platform === 'win32' ? 'MZ' : '\x7fELF', 'binary')
      process.env['XDOCS_SELF_PATH'] = executable

      const prompt = await captureOutput(() => runCli(['prompt', '--name', 'write']))
      expect(prompt.stdout).toContain('xdocs')

      const upgrade = await captureOutput(() => runCli(['upgrade', '--version', readPackageVersion(), '--format', 'json']))
      const upgradeJson = JSON.parse(upgrade.stdout)
      expect(upgradeJson.outcome).toBe('up-to-date')
      expect(upgradeJson.schemaVersion).toBe(1)
      expect(upgradeJson.recovery.installCommand).toContain(readPackageVersion())

      const upgradeText = await captureOutput(() => runCli(['upgrade', '--version', readPackageVersion()]))
      expect(upgradeText.stdout.indexOf('Upgrading the CLI...')).toBeLessThan(upgradeText.stdout.indexOf('current :'))
      expect(upgradeText.stdout.indexOf('current :')).toBeLessThan(upgradeText.stdout.indexOf('Already up to date.'))
      expect(upgradeText.stdout).toContain('If the upgrade did not take effect')
      const installToken = process.platform === 'win32' ? 'install.ps1' : 'install.sh'
      const stopToken = process.platform === 'win32' ? 'Get-Process xdocs' : 'pkill -x xdocs'
      expect(upgradeText.stdout.indexOf(installToken)).toBeLessThan(upgradeText.stdout.indexOf(stopToken))

      const upgradeMarkdown = await captureOutput(() => runCli(['upgrade', '--version', readPackageVersion(), '--format', 'markdown']))
      expect(upgradeMarkdown.stdout).toContain('# xdocs upgrade')
      expect(upgradeMarkdown.stdout).toContain('| current |')
      expect(upgradeMarkdown.stdout).toContain('```text')

      const downgrade = await captureOutput(() => runCli(['upgrade', '--version', '0.0.0']))
      expect(downgrade.stdout).toContain('Already up to date.')
      expect(downgrade.stdout).not.toContain('Target discovery failed.')
      expect(downgrade.stdout).toContain(readPackageVersion())

      const uninstall = await captureOutput(() => runCli(['uninstall', '--dry-run', '--format', 'json']))
      expect(JSON.parse(uninstall.stdout).dryRun).toBe(true)
    } finally {
      if (previousSelfPath === undefined) delete process.env['XDOCS_SELF_PATH']
      else process.env['XDOCS_SELF_PATH'] = previousSelfPath
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('removes the legacy parser helpers from the public library API', async () => {
    const api = await import('./guiho-xdocs.js') as Record<string, unknown>
    expect(api['parseArgs']).toBeUndefined()
    expect(api['stringFlag']).toBeUndefined()
    expect(api['booleanFlag']).toBeUndefined()
    expect(api['listFlag']).toBeUndefined()
  })

  test('keeps bare/default and background-worker routes hidden in the Citty tree', async () => {
    const root = createXDocsCommand()
    const subCommands = root.subCommands as Record<string, { meta?: { hidden?: boolean }, default?: string, subCommands?: Record<string, { meta?: { hidden?: boolean } }> }>
    expect(root.default).toBe('home')
    expect(subCommands['home']?.meta?.hidden).toBe(true)
    expect(subCommands['xdocs-update-check-worker']?.meta?.hidden).toBe(true)
    expect(subCommands['upgrade']?.default).toBe('apply')
    expect(subCommands['upgrade']?.subCommands?.['apply']?.meta?.hidden).toBe(true)
  })
})

async function captureOutput(action: () => Promise<void>): Promise<CapturedOutput> {
  const stdout: string[] = []
  const stderr: string[] = []
  const originalStdoutWrite = process.stdout.write
  const originalStderrWrite = process.stderr.write

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout.push(String(chunk))
    return true
  }) as typeof process.stdout.write
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr.push(String(chunk))
    return true
  }) as typeof process.stderr.write

  try {
    await action()
  } finally {
    process.stdout.write = originalStdoutWrite
    process.stderr.write = originalStderrWrite
  }

  return { stdout: stdout.join(''), stderr: stderr.join('') }
}

async function createDocumentedProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'xdocs-citty-project-'))
  await mkdir(join(dir, 'out'))
  await writeFile(join(dir, 'XDOCS.md'), '# Fixture\n', 'utf8')
  await writeFile(join(dir, 'xdocs.config.toml'), [
    'schema = 1',
    '',
    '[project]',
    'name = "fixture"',
    '',
    '[scan]',
    'exclude = ["out"]',
    '',
    '[agents]',
    'auto_agents_md = false',
    'auto_skill_install = false',
    'skill_tool = "agents"',
    '',
  ].join('\n'), 'utf8')
  await writeFile(join(dir, 'fixture.xdocs.md'), [
    '---',
    'subject: fixture',
    'description: Fixture project for Citty CLI command coverage.',
    'parent: null',
    'children: []',
    'files: {}',
    'documents: {}',
    'tags:',
    '  - fixture',
    'keywords:',
    '  - fixture',
    '  - citty',
    'flags: []',
    'status: stable',
    '---',
    '',
    'Fixture descriptor.',
    '',
  ].join('\n'), 'utf8')
  return dir
}
