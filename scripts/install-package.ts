#!/usr/bin/env bun
/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Package-manager install helper for xdocs.
 *
 * Downloads a compatible native candidate, verifies its exact version, swaps it
 * into the vendor path, verifies the canonical vendor path, and restores the
 * previous vendor binary if replacement or verification fails.
 */

import { mkdir, rename, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

type PackageJson = { version?: string }

class InstallerRollbackError extends Error {
  override readonly name = 'InstallerRollbackError'
}

const packageJson = await Bun.file(new URL('../package.json', import.meta.url)).json() as PackageJson
const sourceEntrypoint = Bun.file(new URL('../source/guiho-xdocs-bin.ts', import.meta.url))

if (await sourceEntrypoint.exists()) {
  console.log('source checkout detected; skipping native binary download')
  process.exit(0)
}

const version = normalizeVersion(process.env['XDOCS_VERSION'] ?? packageJson.version ?? 'latest')
const repo = process.env['XDOCS_REPO'] ?? 'CGuiho/xdocs'
const candidates = detectAssetCandidates()
const destination = new URL(`../vendor/xdocs${process.platform === 'win32' ? '.exe' : ''}`, import.meta.url)
const executableVerificationTimeoutMilliseconds = 15_000

for (const asset of candidates) {
  const bundledAsset = Bun.file(new URL(`../bin/${asset}`, import.meta.url))
  if (!await bundledAsset.exists()) continue
  try {
    await installCandidate(bundledAsset, destination, packageJson.version ?? version)
    console.log(`installed and verified bundled xdocs native binary: ${asset}`)
    process.exit(0)
  } catch (error) {
    console.error(`error: bundled ${asset} failed verification: ${message(error)}`)
    process.exit(1)
  }
}

for (const asset of candidates) {
  const tag = version === 'latest' ? 'latest' : `@guiho/xdocs@${version}`
  const url = tag === 'latest'
    ? `https://github.com/${repo}/releases/latest/download/${asset}`
    : `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${asset}`
  console.log(`    Downloading ${asset} from ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    if (asset !== candidates.at(-1)) {
      console.log(`    ${asset} not available (${response.status}), trying next variant...`)
      continue
    }
    console.error(`error: failed to download ${url}`)
    console.error(`status: ${response.status} ${response.statusText}`)
    process.exit(1)
  }
  try {
    await installCandidate(response, destination, version)
    console.log(`installed and verified xdocs native binary: ${asset}`)
    process.exit(0)
  } catch (error) {
    console.error(`error: ${asset} failed validation or installation: ${message(error)}`)
    if (error instanceof InstallerRollbackError) {
      console.error('error: installation stopped because rollback did not complete; the preserved backup requires recovery.')
      process.exit(1)
    }
    if (asset !== candidates.at(-1)) continue
    process.exit(1)
  }
}

console.error('error: no compatible xdocs binary found for this platform')
process.exit(1)

async function installCandidate(source: Blob | Response, destinationUrl: URL, expectedVersion: string): Promise<void> {
  const destinationPath = fileURLToPath(destinationUrl)
  const extension = process.platform === 'win32' ? '.exe' : ''
  const transactionId = `${process.pid}-${crypto.randomUUID()}`
  const temporaryPath = `${destinationPath}.install-${transactionId}${extension}`
  const backupPath = `${destinationPath}.backup-${transactionId}${extension}`
  let backupCreated = false
  let candidateInstalled = false
  let installationCommitted = false
  await mkdir(dirname(destinationPath), { recursive: true })
  try {
    if (source instanceof Response) await Bun.write(temporaryPath, source)
    else await Bun.write(temporaryPath, source)
    if (!await isNativeBinary(temporaryPath)) throw new Error('download was not a native executable for this platform')
    await makeExecutable(temporaryPath)
    const candidateVersion = await executableVersion(temporaryPath)
    const normalizedExpected = normalizeVersion(expectedVersion)
    if (normalizedExpected !== 'latest' && candidateVersion !== normalizedExpected) throw new Error(`candidate reports ${candidateVersion}, expected ${normalizedExpected}`)
    if (await Bun.file(destinationPath).exists()) {
      await rename(destinationPath, backupPath)
      backupCreated = true
    }
    await rename(temporaryPath, destinationPath)
    candidateInstalled = true
    const installedVersion = await executableVersion(destinationPath)
    if (installedVersion !== candidateVersion) throw new Error(`installed binary reports ${installedVersion}, expected ${candidateVersion}`)
    await rm(backupPath, { force: true })
    installationCommitted = true
  } catch (error) {
    if (candidateInstalled) await rm(destinationPath, { force: true }).catch(() => undefined)
    if (backupCreated) {
      try {
        await rename(backupPath, destinationPath)
      } catch (rollbackError) {
        throw new InstallerRollbackError(
          `${message(error)} Rollback also failed: ${message(rollbackError)} Preserved backup: ${backupPath}`,
        )
      }
    }
    throw error
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    if (installationCommitted) await rm(backupPath, { force: true }).catch(() => undefined)
  }
}

async function executableVersion(path: string): Promise<string> {
  const proc = Bun.spawn([path, '--version'], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', env: { ...process.env, XDOCS_DISABLE_UPDATE_CHECK: '1' } })
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    proc.kill()
  }, executableVerificationTimeoutMilliseconds)
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited.finally(() => clearTimeout(timeout)),
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  if (timedOut) throw new Error(`executable verification timed out after ${executableVerificationTimeoutMilliseconds}ms`)
  if (exitCode !== 0) throw new Error(`executable verification failed with exit code ${exitCode}: ${stderr.trim()}`)
  const match = stdout.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/)?.[0]
  if (!match) throw new Error(`executable verification returned no semantic version: ${stdout.trim()}`)
  return match
}

async function isNativeBinary(path: string): Promise<boolean> {
  const bytes = new Uint8Array(await Bun.file(path).slice(0, 4).arrayBuffer())
  if (process.platform === 'win32') return bytes[0] === 0x4d && bytes[1] === 0x5a
  if (process.platform === 'linux') return bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46
  return [[0xcf, 0xfa, 0xed, 0xfe], [0xce, 0xfa, 0xed, 0xfe], [0xca, 0xfe, 0xba, 0xbe]]
    .some((magic) => magic.every((value, index) => bytes[index] === value))
}

async function makeExecutable(path: string): Promise<void> {
  if (process.platform === 'win32') return
  const proc = Bun.spawn(['chmod', '755', path], { stdout: 'ignore', stderr: 'pipe' })
  const exitCode = await proc.exited
  if (exitCode !== 0) throw new Error(`failed to make xdocs native binary executable (exit ${exitCode})`)
}

function normalizeVersion(value: string): string {
  return value.replace(/^@guiho\/xdocs@/, '').replace(/^v/, '')
}

function detectAssetCandidates(): string[] {
  const os = detectOs()
  const arch = detectArch()
  const ext = os === 'windows' ? '.exe' : ''
  return arch === 'x64'
    ? [`xdocs-${os}-x64-baseline${ext}`, `xdocs-${os}-x64${ext}`, `xdocs-${os}-x64-modern${ext}`]
    : [`xdocs-${os}-${arch}${ext}`]
}

function detectOs(): 'linux' | 'macos' | 'windows' {
  if (process.platform === 'linux') return 'linux'
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  throw new Error(`unsupported OS: ${process.platform}`)
}

function detectArch(): 'x64' | 'arm64' {
  if (process.arch === 'x64' || process.arch === 'arm64') return process.arch
  throw new Error(`unsupported architecture: ${process.arch}`)
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
