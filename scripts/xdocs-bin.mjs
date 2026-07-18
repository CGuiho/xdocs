#!/usr/bin/env node
/**
 * Thin Node-compatible npm bootstrap for the native xdocs binary.
 * All documentation behavior remains in the downloaded Bun-compiled binary.
 */

import { constants, createWriteStream } from 'node:fs'
import { access, chmod, mkdir, rename, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { get } from 'node:https'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const { version } = createRequire(import.meta.url)('../package.json')
const repo = process.env.XDOCS_REPO || 'CGuiho/xdocs'
const platform = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : process.platform
if (!['linux', 'darwin', 'windows'].includes(platform)) fail(`unsupported platform: ${process.platform}`)
if (!['x64', 'arm64'].includes(process.arch)) fail(`unsupported architecture: ${process.arch}`)
const variant = process.env.XDOCS_VARIANT || 'baseline'
if (!['baseline', 'default', 'modern'].includes(variant)) fail(`unsupported XDOCS_VARIANT: ${variant}`)
const extension = platform === 'windows' ? '.exe' : ''
const suffix = process.arch === 'arm64' ? 'arm64' : variant === 'default' ? 'x64' : `x64-${variant}`
const asset = `xdocs-${platform}-${suffix}${extension}`
const binary = join(homedir(), '.guiho', 'xdocs', 'npm', version, asset)

if (!await exists(binary)) {
  const temporary = `${binary}.download-${process.pid}`
  const tag = encodeURIComponent(`@guiho/xdocs@${version}`)
  const url = `https://github.com/${repo}/releases/download/${tag}/${asset}`
  console.error(`xdocs: downloading ${asset} for @guiho/xdocs ${version}`)
  await mkdir(dirname(binary), { recursive: true })
  try {
    await download(url, temporary)
    if (platform !== 'windows') await chmod(temporary, 0o755)
    await rename(temporary, binary)
  } catch (error) {
    await rm(temporary, { force: true })
    fail(error instanceof Error ? error.message : String(error))
  }
}

const child = spawn(binary, process.argv.slice(2), { stdio: 'inherit', env: process.env })
child.on('error', (error) => fail(error.message))
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})

async function exists(path) {
  try {
    await access(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

function download(url, destination, redirects = 5) {
  return new Promise((resolve, reject) => {
    const request = get(url, { headers: { 'User-Agent': 'xdocs-npm-bootstrap' } }, (response) => {
      if (response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume()
        if (!response.headers.location || redirects === 0) return reject(new Error('xdocs binary redirect failed'))
        return resolve(download(new URL(response.headers.location, url), destination, redirects - 1))
      }
      if (response.statusCode !== 200) {
        response.resume()
        return reject(new Error(`xdocs binary download failed: HTTP ${response.statusCode}`))
      }
      const total = Number(response.headers['content-length'] || 0)
      let received = 0
      const file = createWriteStream(destination)
      response.on('data', (chunk) => {
        received += chunk.length
        if (total > 0) process.stderr.write(`\rxdocs: ${Math.floor(received / total * 100)}%`)
      })
      response.pipe(file)
      file.on('finish', () => {
        process.stderr.write(total > 0 ? '\n' : '')
        file.close(resolve)
      })
      file.on('error', reject)
    })
    request.on('error', reject)
  })
}

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(5)
}
