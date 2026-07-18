/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Bun-native filesystem helpers. Directory mutations use Bun Shell, whose
 * interpolation is argument-safe and cross-platform.
 */

import { $ } from 'bun'
import { basename, dirname, joinPath } from './path.js'

export type RuntimeDirent = {
  name: string
  isDirectory(): boolean
  isFile(): boolean
}

export type RuntimeStat = {
  size: number
  mode: number
  isDirectory(): boolean
  isFile(): boolean
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await Bun.file(path).stat()
    return true
  } catch {
    return false
  }
}

export async function readText(path: string, _encoding?: string): Promise<string> {
  return Bun.file(path).text()
}

export async function readJson(path: string): Promise<unknown> {
  return Bun.file(path).json()
}

export async function writeText(path: string, content: string | Uint8Array, _encoding?: string): Promise<void> {
  await makeDirectory(dirname(path))
  await Bun.write(path, content)
}

export async function makeDirectory(path: string, _options?: { recursive?: boolean }): Promise<void> {
  await $`mkdir -p ${path}`.quiet()
}

export async function removePath(path: string, options: { recursive?: boolean, force?: boolean } = {}): Promise<void> {
  if (!(await pathExists(path))) return
  if (options.recursive && process.platform === 'win32') {
    await runPowerShell(
      'Remove-Item -LiteralPath $env:XDOCS_FS_TARGET -Recurse -Force -ErrorAction Stop',
      { XDOCS_FS_TARGET: path },
    )
    return
  }
  if (options.recursive) await $`rm -rf ${path}`.quiet()
  else await Bun.file(path).delete()
}

export async function movePath(from: string, to: string): Promise<void> {
  await makeDirectory(dirname(to))
  if (process.platform === 'win32') {
    await runPowerShell(
      'Move-Item -LiteralPath $env:XDOCS_FS_SOURCE -Destination $env:XDOCS_FS_TARGET -Force -ErrorAction Stop',
      { XDOCS_FS_SOURCE: from, XDOCS_FS_TARGET: to },
    )
    return
  }
  await $`mv ${from} ${to}`.quiet()
}

export async function copyPath(from: string, to: string): Promise<void> {
  await makeDirectory(dirname(to))
  await $`cp ${from} ${to}`.quiet()
}

export async function chmodPath(path: string, mode: number): Promise<void> {
  if (process.platform === 'win32') return
  await $`chmod ${mode.toString(8)} ${path}`.quiet()
}

export async function statPath(path: string): Promise<RuntimeStat> {
  const stat = await Bun.file(path).stat()
  return {
    size: stat.size,
    mode: stat.mode,
    isDirectory: () => stat.isDirectory(),
    isFile: () => stat.isFile(),
  }
}

export async function readDirectory(path: string, _options?: { withFileTypes?: boolean }): Promise<RuntimeDirent[]> {
  const names: string[] = []
  const glob = new Bun.Glob('*')
  for await (const name of glob.scan({ cwd: path, dot: true, onlyFiles: false })) {
    if (!name.includes('/') && !name.includes('\\')) names.push(name)
  }

  return Promise.all(names.sort().map(async (name) => {
    const stat = await statPath(joinPath(path, name))
    return {
      name: basename(name),
      isDirectory: () => stat.isDirectory(),
      isFile: () => stat.isFile(),
    }
  }))
}

async function runPowerShell(command: string, environment: Record<string, string>): Promise<void> {
  const process = Bun.spawn(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', command], {
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'pipe',
    env: { ...Bun.env, ...environment },
  })
  const [exitCode, stderr] = await Promise.all([process.exited, new Response(process.stderr).text()])
  if (exitCode !== 0) throw new Error(stderr.trim() || `PowerShell filesystem operation failed with exit code ${exitCode}.`)
}
