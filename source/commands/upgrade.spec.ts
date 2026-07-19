/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { expect, test } from 'bun:test'

import type { XDocsCliOptions, XDocsUpgradeEvent, XDocsUpgradePlan } from '../types.js'
import { renderEvent, renderPlan } from './upgrade.js'

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
  expect(output.indexOf('Downloading...')).toBeLessThan(output.indexOf('Replacing...'))
  expect(output.indexOf('Replacing...')).toBeLessThan(output.indexOf('Verifying...'))
})

function event(sequence: number, phase: XDocsUpgradeEvent['phase']): XDocsUpgradeEvent {
  return { sequence, phase, status: 'started', message: `${phase} started` }
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
