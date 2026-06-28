#!/usr/bin/env bun
/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Small package-manager launcher for the downloaded native xdocs binary.
 */

const binaryPath = new URL(`../vendor/xdocs${process.platform === 'win32' ? '.exe' : ''}`, import.meta.url)
const executablePath = Bun.fileURLToPath(binaryPath)
const binary = Bun.file(binaryPath)

if (!(await binary.exists())) {
  const installerPath = new URL('install-package.ts', import.meta.url)
  const proc = Bun.spawn([process.execPath, Bun.fileURLToPath(installerPath)], {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })

  const exitCode = await proc.exited
  if (exitCode !== 0 || !(await Bun.file(binaryPath).exists())) {
    console.error('error: xdocs native binary is missing. Reinstall @guiho/xdocs or run `bun run scripts/install-package.ts`.')
    process.exit(exitCode || 1)
  }
}

const proc = Bun.spawn([executablePath, ...process.argv.slice(2)], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})

process.exit(await proc.exited)