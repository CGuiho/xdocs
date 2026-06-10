/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Build release binaries for the supported xdocs platform matrix.
 */

import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

type BinaryTarget = {
  readonly bunTarget: string
  readonly assetName: string
}

const targets: readonly BinaryTarget[] = [
  { bunTarget: 'bun-linux-x64', assetName: 'xdocs-linux-x64' },
  { bunTarget: 'bun-linux-arm64', assetName: 'xdocs-linux-arm64' },
  { bunTarget: 'bun-darwin-x64', assetName: 'xdocs-macos-x64' },
  { bunTarget: 'bun-darwin-arm64', assetName: 'xdocs-macos-arm64' },
  { bunTarget: 'bun-windows-x64', assetName: 'xdocs-windows-x64.exe' },
]

const root = fileURLToPath(new URL('..', import.meta.url))
const binDirectory = join(root, 'bin')
const bunExecutable = process.execPath

await rm(binDirectory, { recursive: true, force: true })
await mkdir(binDirectory, { recursive: true })

const builds = targets.map(async (target) => {
  const outputPath = join(binDirectory, target.assetName)
  const proc = Bun.spawn({
    cmd: [
      bunExecutable,
      'build',
      'source/guiho-xdocs-native-bin.ts',
      '--compile',
      '--production',
      '--minify-whitespace',
      '--minify-syntax',
      '--target',
      target.bunTarget,
      '--outfile',
      outputPath,
    ],
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  if (exitCode !== 0) {
    throw new Error([
      `Failed to build ${target.bunTarget} -> ${target.assetName}`,
      stdout.trim(),
      stderr.trim(),
    ].filter(Boolean).join('\n'))
  }

  process.stdout.write(`built: ${target.bunTarget} -> bin/${target.assetName}\n`)
})

await Promise.all(builds)
