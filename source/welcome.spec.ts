import { describe, expect, test } from 'bun:test'

import { renderUpdateNotice, renderWelcome } from './welcome.js'

describe('xdocs welcome', () => {
  test('renders a deterministic cross-platform welcome', () => {
    expect(renderWelcome({ version: '0.7.0', platform: 'win32', arch: 'x64' })).toBe([
      '╔════════════════════════════════════════════════════════════╗',
      '║  XDOCS                                                     ║',
      '║  Structured documentation for codebases and AI agents     ║',
      '╚════════════════════════════════════════════════════════════╝',
      '',
      '  organization  GUIHO',
      '  platform      Windows x64',
      '  version       v0.7.0',
      '',
      '  Run `xdocs --help` to see available commands.',
      '',
    ].join('\n'))
  })

  test('shows only a genuinely newer cached version', () => {
    const newer = { newVersionAvailable: true, latestVersion: '0.7.1', upgradeCommand: 'xdocs upgrade', lastCheck: '2026-07-22T00:00:00Z' }
    expect(renderUpdateNotice('0.7.0', newer)).toContain('v0.7.1')
    expect(renderUpdateNotice('0.7.1', { ...newer, latestVersion: '0.7.1' })).toBe('')
    expect(renderUpdateNotice('0.7.2', newer)).toBe('')
    expect(renderUpdateNotice('0.7.0', { ...newer, newVersionAvailable: false })).toBe('')
  })
})
