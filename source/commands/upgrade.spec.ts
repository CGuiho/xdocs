/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { expect, test } from 'bun:test'

import type { XDocsCliOptions, XDocsUpgradeEnvelope, XDocsUpgradeEvent, XDocsUpgradePlan } from '../types.js'
import { buildUpgradeRecovery } from '../upgrade-catalog.js'
import { renderEvent, renderPlan, renderTerminal } from './upgrade.js'

test('renders the complete upgrade plan before ordered long-running phases', async () => {
  const plan: XDocsUpgradePlan = {
    currentVersion: '1.0.0',
    targetVersion: '2.0.0',
    platform: 'windows',
    arch: 'x64',
    variant: 'baseline',
    assetName: 'xdocs-windows-x64-baseline.exe',
    downloadUrl: 'https://example.test/xdocs.exe',
    executablePath: 'C:\\tools\\xdocs.exe',
    temporaryPath: 'C:\\tools\\.xdocs-candidate.exe',
    backupPath: 'C:\\tools\\.xdocs-backup.exe',
    releaseUrl: 'https://example.test/release',
  }
  const options: XDocsCliOptions = { cwd: '.', format: 'text', verbose: false }
  const events: XDocsUpgradeEvent[] = [
    event(3, 'download'),
    {
      sequence: 4,
      phase: 'download',
      status: 'progress',
      message: '62.5%',
      progress: { receivedBytes: 5, totalBytes: 8, percent: 62.5 },
    },
    event(7, 'replace'),
    event(9, 'verify'),
  ]

  const output = await captureStdout(() => {
    renderPlan(options, plan)
    for (const value of events) renderEvent(options, value)
  })

  expect(output).toContain('  Upgrading the CLI\n')
  for (const expected of [
    'current : 1.0.0',
    'target  : 2.0.0',
    'os      : windows',
    'arch    : x64',
    'binary  : xdocs-windows-x64-baseline.exe',
    'path    : C:\\tools\\xdocs.exe',
    'url     : https://example.test/xdocs.exe',
  ]) expect(output).toContain(expected)
  expect(output.indexOf('url     :')).toBeLessThan(output.indexOf('Downloading...'))
  expect(output).toContain('[#########################---------------] 62.5% (5 B/8 B)')
  expect(output.indexOf('Downloading...')).toBeLessThan(output.indexOf('Replacing...'))
  expect(output.indexOf('Replacing...')).toBeLessThan(output.indexOf('Verifying...'))
})

test('renders useful download progress without a content length', async () => {
  const options: XDocsCliOptions = { cwd: '.', format: 'text', verbose: false }
  const output = await captureStdout(() => renderEvent(options, {
    sequence: 4,
    phase: 'download',
    status: 'progress',
    message: 'received bytes',
    progress: { receivedBytes: 1_572_864, totalBytes: null, percent: null },
  }))
  expect(output).toBe('Download progress: 1.5 MiB received\n')
})

test('prints pinned install and separate stop recovery after every terminal outcome', async () => {
  const options: XDocsCliOptions = { cwd: '.', format: 'text', verbose: false }
  for (const outcome of ['upgraded', 'failed', 'rolled-back', 'up-to-date'] as const) {
    const output = await captureStdout(() => renderTerminal(options, envelope(outcome)))
    expect(output).toContain(`install XDocs ${outcome === 'up-to-date' ? '1.0.0' : '2.0.0'} directly:`)
    expect(output).toContain(outcome === 'up-to-date' ? '-Version "1.0.0"' : '-Version "2.0.0"')
    expect(output).not.toContain('latest')
    expect(output).toContain('If XDocs is still running and blocks installation, stop it first:')
    expect(output).toContain('Get-Process xdocs')
    expect(output.indexOf('install XDocs')).toBeLessThan(output.indexOf('stop it first'))
  }
})

function event(sequence: number, phase: XDocsUpgradeEvent['phase']): XDocsUpgradeEvent {
  return { sequence, phase, status: 'started', message: `${phase} started` }
}

function envelope(outcome: XDocsUpgradeEnvelope['outcome']): XDocsUpgradeEnvelope {
  const targetVersion = outcome === 'up-to-date' ? '1.0.0' : '2.0.0'
  const plan: XDocsUpgradePlan = {
    currentVersion: '1.0.0',
    targetVersion,
    platform: 'windows',
    arch: 'x64',
    variant: 'baseline',
    assetName: 'xdocs-windows-x64-baseline.exe',
    downloadUrl: 'https://example.test/xdocs.exe',
    executablePath: 'C:\\tools\\xdocs.exe',
    temporaryPath: 'C:\\tools\\.xdocs-candidate.exe',
    backupPath: 'C:\\tools\\.xdocs-backup.exe',
    releaseUrl: 'https://example.test/release',
  }
  return {
    schemaVersion: 1,
    command: 'xdocs upgrade',
    outcome,
    plan,
    events: [],
    result: outcome === 'failed' ? null : {
      verifiedVersion: outcome === 'upgraded' ? targetVersion : '1.0.0',
      cacheUpdated: false,
      cleanup: { backupPath: null, scheduled: false },
    },
    recovery: buildUpgradeRecovery({
      platform: 'windows',
      targetVersion,
      targetSource: outcome === 'up-to-date' ? 'fallback-current' : 'explicit',
    }),
    error: outcome === 'failed' || outcome === 'rolled-back'
      ? { code: 'test-failure', message: 'forced failure' }
      : null,
  }
}

async function captureStdout(action: () => void): Promise<string> {
  let output = ''
  const original = process.stdout.write
  process.stdout.write = ((chunk: unknown) => {
    output += String(chunk)
    return true
  }) as typeof process.stdout.write
  try {
    action()
    return output
  } finally {
    process.stdout.write = original
  }
}
