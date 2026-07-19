/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { expect, test } from 'bun:test'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { buildUpgradeRecovery } from '../source/upgrade-catalog.js'

const fixtureVersion = '9.0.0-alpha.1'
const installerTestTimeoutMilliseconds = 60_000
const repositoryRoot = resolve(import.meta.dir, '..')

test('uses the Darwin runtime label when selecting the macOS Bash profile', async () => {
  const installer = await Bun.file(join(repositoryRoot, 'devops', 'install.sh')).text()
  expect(installer).toContain('[[ "$OS" == "darwin"')
  expect(installer).not.toContain('[[ "$OS" == "macos"')
})

test('uses Markdown agent assets and preserves shell PATH expansion', async () => {
  const bashInstaller = await Bun.file(join(repositoryRoot, 'devops', 'install.sh')).text()
  const powerShellInstaller = await Bun.file(join(repositoryRoot, 'devops', 'install.ps1')).text()
  for (const installer of [bashInstaller, powerShellInstaller]) {
    expect(installer).toContain('guiho-s-xdocs.md')
    expect(installer).toContain('guiho-i-xdocs.md')
  }
  expect(bashInstaller).toContain('export PATH=%q:$PATH')
  expect(bashInstaller).not.toContain('export PATH=%q:\\$PATH')
  expect(bashInstaller).toContain('curl --fail --location --progress-bar')
  expect(powerShellInstaller).toContain('Refusing to persist a literal PATH variable reference')
  expect(powerShellInstaller).toContain('Test-MarkdownAgentAsset')
  expect(powerShellInstaller).toContain('Invoke-DownloadWithProgress')
  expect(powerShellInstaller).toContain('Download progress:')
})

if (process.platform === 'win32') {
  test('printed Windows recovery command works from PowerShell and Git Bash', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-powershell-installer-'))
    const fixture = join(dir, 'fixture.exe')
    const source = join(dir, 'fixture.cs')
    let server: ReturnType<typeof Bun.serve> | undefined
    try {
      await writeFile(source, `using System;

internal static class Program
{
    private static int Main(string[] args)
    {
        Console.WriteLine("${fixtureVersion}");
        return 0;
    }
}
`, 'utf8')
      await compileWindowsFixture(source, fixture)
      server = Bun.serve({
        port: 0,
        idleTimeout: 120,
        fetch: (request) => {
          const path = new URL(request.url).pathname
          if (path === '/install.ps1') return new Response(Bun.file(join(repositoryRoot, 'devops', 'install.ps1')))
          if (path.endsWith('guiho-s-xdocs.md')) {
            return new Response('---\nname: guiho-s-xdocs\n---\n\n# xdocs skill\n')
          }
          if (path.endsWith('guiho-i-xdocs.md')) {
            return new Response('---\nname: guiho-i-xdocs\n---\n\n# xdocs prompts\n')
          }
          if (path.endsWith('xdocs-windows-x64-baseline.exe')) {
            return new Response('missing baseline fixture', { status: 404 })
          }
          return new Response(Bun.file(fixture))
        },
      })
      const baseUrl = `http://127.0.0.1:${server.port}`
      const recovery = buildUpgradeRecovery({
        platform: 'windows',
        targetVersion: fixtureVersion,
        targetSource: 'explicit',
        installerUrl: `${baseUrl}/install.ps1`,
      })
      expect(recovery.installCommand).toContain(fixtureVersion)

      const gitBash = await findGitBash()
      const shells: Array<{ name: string, command: string[] }> = [
        {
          name: 'PowerShell',
          command: ['powershell.exe', '-NoProfile', '-Command', recovery.installCommand],
        },
        {
          name: 'Git Bash',
          command: [gitBash, '-lc', recovery.installCommand],
        },
      ]
      for (const shell of shells) {
        const installDir = join(dir, `${shell.name} install path with spaces`)
        const home = join(dir, `${shell.name} isolated home`)
        await mkdir(home, { recursive: true })
        const { exitCode, stdout, stderr } = await spawnCaptured(shell.command, {
          ...process.env,
          HOME: home,
          USERPROFILE: home,
          XDOCS_DOWNLOAD_BASE_URL: baseUrl,
          XDOCS_INSTALL_DIR: installDir,
          XDOCS_SKIP_PATH_UPDATE: '1',
        })
        expect(exitCode, `${shell.name}\n${stdout}\n${stderr}`).toBe(0)
        const installed = join(installDir, 'xdocs.exe')
        expect(await executableVersion(installed)).toBe(fixtureVersion)
        expect(stdout).toContain('Download progress:')
        expect(stdout).toContain(`Verified: ${installed} --version -> ${fixtureVersion}`)
        for (const tool of ['.agents', '.claude']) {
          const installedSkill = await Bun.file(join(home, tool, 'skills', 'guiho-s-xdocs', 'SKILL.md')).text()
          expect(installedSkill).toContain('name: guiho-s-xdocs')
          expect(installedSkill.startsWith('MZ')).toBeFalse()
        }
      }
    } finally {
      server?.stop(true)
      await rm(dir, { recursive: true, force: true })
    }
  }, installerTestTimeoutMilliseconds)
} else {
  test('printed Bash recovery command installs and verifies an exact prerelease fixture', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xdocs-bash-installer-'))
    const fixture = join(dir, 'fixture')
    const source = join(dir, 'fixture.ts')
    const fakeBin = join(dir, 'fake-bin')
    const fakeCurl = join(fakeBin, 'curl')
    const installDir = join(dir, 'install path with spaces')
    try {
      await mkdir(fakeBin, { recursive: true })
      await writeFile(source, `console.log('${fixtureVersion}')\n`, 'utf8')
      await compileFixture(source, fixture)
      await writeFile(fakeCurl, `#!/bin/sh
output=''
url=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    *install.sh)
      cat "$XDOCS_INSTALLER_SCRIPT"
      exit 0
      ;;
  esac
  if [ "$1" = '--output' ]; then
    output="$2"
    shift 2
  elif [ "${'$'}{1#http}" != "$1" ]; then
    url="$1"
    shift
  else
    shift
  fi
done
case "$url" in
  *-x64-baseline) exit 22 ;;
  *guiho-s-xdocs.md) printf '%s\\n' '---' 'name: guiho-s-xdocs' '---' '' '# xdocs skill' >"$output" ;;
  *guiho-i-xdocs.md) printf '%s\\n' '---' 'name: guiho-i-xdocs' '---' '' '# xdocs prompts' >"$output" ;;
  *) cp "$XDOCS_INSTALLER_FIXTURE" "$output" ;;
esac
`, 'utf8')
      await chmod(fakeCurl, 0o755)
      const recovery = buildUpgradeRecovery({
        platform: process.platform === 'darwin' ? 'macos' : 'linux',
        targetVersion: fixtureVersion,
        targetSource: 'explicit',
        installerUrl: 'https://fixture.invalid/install.sh',
      })
      const { exitCode, stdout, stderr } = await spawnCaptured(
        ['bash', '-c', recovery.installCommand],
        {
          ...process.env,
          PATH: `${fakeBin}:${process.env['PATH'] ?? ''}`,
          HOME: dir,
          SHELL: '/bin/bash',
          XDOCS_INSTALLER_FIXTURE: fixture,
          XDOCS_INSTALLER_SCRIPT: join(repositoryRoot, 'devops', 'install.sh'),
          XDOCS_INSTALL_DIR: installDir,
        },
      )
      expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
      const installed = join(installDir, 'xdocs')
      expect(await executableVersion(installed)).toBe(fixtureVersion)
      expect(stdout).toContain(`Verified: ${installed} --version -> ${fixtureVersion}`)
      const bashrc = await Bun.file(join(dir, '.bashrc')).text()
      expect(bashrc).toContain(`export PATH=${installDir.replaceAll(' ', '\\ ')}:$PATH`)
      expect(bashrc).not.toContain('\\$PATH')
      const freshShell = await spawnCaptured(
        ['bash', '--noprofile', '--rcfile', join(dir, '.bashrc'), '-i', '-c', 'command -v xdocs && command -v ls && command -v mkdir'],
        { ...process.env, HOME: dir, SHELL: '/bin/bash' },
      )
      expect(freshShell.exitCode, `${freshShell.stdout}\n${freshShell.stderr}`).toBe(0)
      expect(freshShell.stdout).toContain(installDir)
      for (const tool of ['.agents', '.claude']) {
        const installedSkill = await Bun.file(join(dir, tool, 'skills', 'guiho-s-xdocs', 'SKILL.md')).text()
        expect(installedSkill).toContain('name: guiho-s-xdocs')
        expect(installedSkill.startsWith('MZ')).toBeFalse()
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }, installerTestTimeoutMilliseconds)
}

async function compileFixture(source: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true })
  const proc = Bun.spawn([process.execPath, 'build', source, '--compile', '--outfile', destination], {
    cwd: repositoryRoot,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  if (exitCode !== 0) throw new Error(`Fixture compilation failed (${exitCode}): ${stdout}\n${stderr}`)
}

async function compileWindowsFixture(source: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true })
  const windowsDirectory = process.env['WINDIR'] ?? 'C:\\Windows'
  const compiler = join(windowsDirectory, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
  if (!await Bun.file(compiler).exists()) {
    throw new Error(`Windows C# compiler not found: ${compiler}`)
  }
  const proc = Bun.spawn([
    compiler,
    '/nologo',
    '/optimize+',
    '/target:exe',
    `/out:${destination}`,
    source,
  ], {
    cwd: repositoryRoot,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  if (exitCode !== 0) throw new Error(`Windows fixture compilation failed (${exitCode}): ${stdout}\n${stderr}`)
}

async function executableVersion(path: string): Promise<string> {
  const proc = Bun.spawn([path, '--version'], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' })
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  if (exitCode !== 0) throw new Error(`Fixture failed (${exitCode}): ${stderr}`)
  return stdout.trim()
}

async function spawnCaptured(
  command: string[],
  env: Record<string, string | undefined>,
): Promise<{ exitCode: number, stdout: string, stderr: string }> {
  const proc = Bun.spawn(command, {
    cwd: repositoryRoot,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    env,
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  return { exitCode, stdout, stderr }
}

async function findGitBash(): Promise<string> {
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  ]
  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) return candidate
  }
  throw new Error('Git Bash is required for the Windows recovery-command regression.')
}
