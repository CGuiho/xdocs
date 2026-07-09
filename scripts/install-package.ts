#!/usr/bin/env bun
/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Package-manager install helper for xdocs.
 *
 * This script downloads the platform-native xdocs binary into `vendor/xdocs` or
 * `vendor/xdocs.exe`. Package-manager installs use the small Bun launcher in
 * `scripts/xdocs-bin.ts`; direct installers remain the no-Bun runtime path.
 */

type PackageJson = {
  version?: string
}

const packageJson = await Bun.file(new URL('../package.json', import.meta.url)).json() as PackageJson
const sourceEntrypoint = Bun.file(new URL('../source/guiho-xdocs-bin.ts', import.meta.url))

if (await sourceEntrypoint.exists()) {
  console.log('source checkout detected; skipping native binary download')
  process.exit(0)
}

const version = process.env['XDOCS_VERSION'] ?? packageJson.version ?? 'latest'
const repo = process.env['XDOCS_REPO'] ?? 'CGuiho/xdocs'
const candidates = detectAssetCandidates()
const destination = new URL(`../vendor/xdocs${process.platform === 'win32' ? '.exe' : ''}`, import.meta.url)

for (const asset of candidates) {
  const bundledAsset = Bun.file(new URL(`../bin/${asset}`, import.meta.url))

  if (await bundledAsset.exists()) {
    await Bun.write(destination, bundledAsset)
    await makeExecutable(destination)
    console.log(`installed bundled xdocs native binary: ${asset}`)
    process.exit(0)
  }
}

for (const asset of candidates) {
  const tag = version === 'latest' ? 'latest' : `@guiho/xdocs@${version}`
  const url = tag === 'latest'
    ? `https://github.com/${repo}/releases/latest/download/${asset}`
    : `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${asset}`

  console.log(`    Downloading ${asset} from GitHub Releases...`)
  const response = await fetch(url)

  if (!response.ok) {
    if (candidates.length > 1 && asset !== candidates[candidates.length - 1]) {
      console.log(`    ${asset} not available (${response.status}), trying next variant...`)
      continue
    }
    console.error(`error: failed to download ${url}`)
    console.error(`status: ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  await Bun.write(destination, response)
  await makeExecutable(destination)
  console.log(`installed xdocs native binary: ${asset}`)
  process.exit(0)
}

console.error('error: no compatible xdocs binary found for this platform')
process.exit(1)

async function makeExecutable(path: URL) {
  if (process.platform === 'win32') return

  const result = Bun.spawn(['chmod', '755', Bun.fileURLToPath(path)], {
    stdout: 'ignore',
    stderr: 'inherit',
  })
  const exitCode = await result.exited

  if (exitCode !== 0) {
    console.error('error: failed to make xdocs native binary executable')
    process.exit(exitCode)
  }
}

function detectAssetCandidates() {
  const os = detectOs()
  const arch = detectArch()
  const ext = os === 'windows' ? '.exe' : ''

  if (arch === 'x64') {
    return [`xdocs-${os}-x64-baseline${ext}`, `xdocs-${os}-x64${ext}`, `xdocs-${os}-x64-modern${ext}`]
  }

  return [`xdocs-${os}-${arch}${ext}`]
}

function detectOs() {
  if (process.platform === 'linux') return 'linux'
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  console.error(`error: unsupported OS: ${process.platform}`)
  process.exit(1)
}

function detectArch() {
  if (process.arch === 'x64') return 'x64'
  if (process.arch === 'arm64') return 'arm64'
  console.error(`error: unsupported architecture: ${process.arch}`)
  process.exit(1)
}
