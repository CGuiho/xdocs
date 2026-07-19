/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by CristÃ³vÃ£o GUIHO. All Rights Reserved.
 */

import { describe, expect, test } from 'bun:test'

import { extractReleaseNotes, normalizeReleaseVersion } from './extract-release-notes.js'

describe('GitHub Release changelog extraction', () => {
  test('normalizes supported XDocs version tag forms', () => {
    expect(normalizeReleaseVersion('@guiho/xdocs@0.6.2')).toBe('0.6.2')
    expect(normalizeReleaseVersion('refs/tags/@guiho/xdocs@0.6.2-alpha.1')).toBe('0.6.2-alpha.1')
    expect(normalizeReleaseVersion('v0.6.2')).toBe('0.6.2')
  })

  test('extracts only the exact version section up to the next level-two heading', () => {
    const changelog = `# Changelog

## Unreleased

- Future work.

## [0.6.2] - 2026-07-19

- Release fix.

### Validation

- Fifty checks passed.

## 0.6.1 - 2026-07-18

- Previous release.
`
    expect(extractReleaseNotes(changelog, '@guiho/xdocs@0.6.2')).toBe(`## [0.6.2] - 2026-07-19

- Release fix.

### Validation

- Fifty checks passed.
`)
    expect(extractReleaseNotes(changelog.replaceAll('\n', '\r\n'), 'v0.6.2')).not.toContain('0.6.1')
  })

  test('matches exact semantic versions rather than prefixes', () => {
    const changelog = `## 0.6.20

- Twenty.

## 0.6.2

- Two.
`
    expect(extractReleaseNotes(changelog, '0.6.2')).toContain('- Two.')
    expect(extractReleaseNotes(changelog, '0.6.2')).not.toContain('- Twenty.')
  })

  test('rejects missing, duplicate, empty, and invalid version sections', () => {
    expect(() => extractReleaseNotes('## 0.6.1\n\n- Old.\n', '0.6.2')).toThrow('no level-two section')
    expect(() => extractReleaseNotes('## 0.6.2\n\n- One.\n\n## 0.6.2\n\n- Two.\n', '0.6.2')).toThrow('duplicate')
    expect(() => extractReleaseNotes('## 0.6.2\n\n## 0.6.1\n\n- Old.\n', '0.6.2')).toThrow('empty')
    expect(() => extractReleaseNotes('## 0.6.2\n\n- Good.\n', 'latest')).toThrow('Invalid')
  })
})
