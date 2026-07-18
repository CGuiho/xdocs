import { expect, test } from 'bun:test'
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import packageJson from '../package.json' with { type: 'json' }

test('npm bootstrap runs with Node and no Bun executable in PATH', async () => {
  const node = Bun.which('node')
  expect(node).toBeTruthy()
  const home = await mkdtemp(join(tmpdir(), 'xdocs-node-bootstrap-'))
  try {
    const platform = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux'
    const asset = `xdocs-${platform}-${process.arch === 'arm64' ? 'arm64' : 'x64-baseline'}${platform === 'windows' ? '.exe' : ''}`
    const cached = join(home, '.guiho', 'xdocs', 'npm', packageJson.version, asset)
    await mkdir(dirname(cached), { recursive: true })
    await copyFile(process.execPath, cached)

    const wrapper = join(import.meta.dir, '..', 'scripts', 'xdocs-bin.mjs')
    const child = Bun.spawn([node!, wrapper, '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        HOME: home,
        USERPROFILE: home,
        PATH: dirname(node!),
        XDOCS_VARIANT: 'baseline',
      },
    })
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(code).toBe(0)
    expect(stdout).toContain(Bun.version)
    expect(stderr).not.toContain('downloading')
  } finally {
    await rm(home, { recursive: true, force: true })
  }
}, 30_000)

test('npm bootstrap contains no xdocs domain implementation', async () => {
  const wrapper = await readFile(join(import.meta.dir, '..', 'scripts', 'xdocs-bin.mjs'), 'utf8')
  expect(wrapper).toStartWith('#!/usr/bin/env node')
  expect(wrapper).not.toContain('Bun.')
  expect(wrapper).not.toContain('scanProject')
  expect(wrapper).not.toContain('defineCommand')
})
