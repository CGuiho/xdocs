#!/usr/bin/env node
/*
 * Install the platform-native xdocs binary for package-manager installs.
 * Node is used only during installation. The installed `xdocs` command points
 * directly at the downloaded native binary and does not require Node at runtime.
 */

const { createWriteStream, existsSync, mkdirSync, chmodSync } = require('node:fs')
const { readFile } = require('node:fs/promises')
const { get } = require('node:https')
const { join } = require('node:path')

const root = join(__dirname, '..')
const packagePath = join(root, 'package.json')
const targetPath = join(root, 'bin', 'xdocs.exe')

main().catch((error) => {
  console.error(`xdocs: failed to install native binary: ${error.message}`)
  process.exit(1)
})

async function main() {
  if (process.env.XDOCS_SKIP_NATIVE_INSTALL === '1') {
    console.warn('xdocs: skipping native binary installation because XDOCS_SKIP_NATIVE_INSTALL=1')
    return
  }

  if (existsSync(join(root, 'source'))) {
    console.warn('xdocs: skipping native binary installation in a source checkout')
    return
  }

  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
  const version = packageJson.version
  if (typeof version !== 'string' || version.length === 0) throw new Error('package.json version is missing')

  const asset = assetName()
  const tag = `@guiho/xdocs@${version}`
  const url = `https://github.com/CGuiho/xdocs/releases/download/${encodeURIComponent(tag)}/${asset}`

  mkdirSync(join(root, 'bin'), { recursive: true })
  await download(url, targetPath)
  if (process.platform !== 'win32') chmodSync(targetPath, 0o755)

  console.log(`xdocs: installed native binary ${asset}`)
}

function assetName() {
  if (process.platform === 'linux') {
    if (process.arch === 'x64') return 'xdocs-linux-x64'
    if (process.arch === 'arm64') return 'xdocs-linux-arm64'
  }

  if (process.platform === 'darwin') {
    if (process.arch === 'x64') return 'xdocs-macos-x64'
    if (process.arch === 'arm64') return 'xdocs-macos-arm64'
  }

  if (process.platform === 'win32') {
    if (process.arch === 'x64') return 'xdocs-windows-x64.exe'
  }

  throw new Error(`unsupported platform: ${process.platform}/${process.arch}`)
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const location = response.headers.location
        if (!location) {
          reject(new Error(`redirect from ${url} did not include a Location header`))
          return
        }

        download(location, destination).then(resolve, reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`download failed (${response.statusCode}) from ${url}`))
        return
      }

      const file = createWriteStream(destination)
      response.pipe(file)
      file.on('finish', () => {
        file.close(resolve)
      })
      file.on('error', reject)
    })

    request.on('error', reject)
    request.end()
  })
}

// Keep npm pack from treating this package as broken before postinstall runs.
if (!existsSync(targetPath)) {
  mkdirSync(join(root, 'bin'), { recursive: true })
}
