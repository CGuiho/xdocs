/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { describe, expect, test } from 'bun:test'

import {
  buildUpgradeListEnvelope,
  buildUpgradeRecovery,
  classifyReleaseChannel,
  compareSemanticVersions,
  fetchReleaseCatalog,
  normalizeXDocsVersion,
} from './upgrade-catalog.js'

describe('upgrade release catalog', () => {
  test('orders stable and prerelease versions by SemVer precedence', () => {
    const versions = ['1.0.0-alpha.10', '1.0.0', '1.0.0-rc.1', '1.0.0-alpha.2', '1.0.0-beta.1']
    versions.sort((a, b) => compareSemanticVersions(b, a))
    expect(versions).toEqual(['1.0.0', '1.0.0-rc.1', '1.0.0-beta.1', '1.0.0-alpha.10', '1.0.0-alpha.2'])
    expect(compareSemanticVersions('1.0.0+build.2', '1.0.0+build.1')).toBe(0)
  })

  test('normalizes only valid xdocs semantic-version tags and classifies channels', () => {
    expect(normalizeXDocsVersion('@guiho/xdocs@2.0.0-alpha.3')).toBe('2.0.0-alpha.3')
    expect(normalizeXDocsVersion('v2.0.0-rc.1')).toBe('2.0.0-rc.1')
    expect(normalizeXDocsVersion('2.0.0-alpha.01')).toBeNull()
    expect(classifyReleaseChannel('2.0.0')).toBe('stable')
    expect(classifyReleaseChannel('2.0.0-alpha.1')).toBe('alpha')
    expect(classifyReleaseChannel('2.0.0-beta.1')).toBe('beta')
    expect(classifyReleaseChannel('2.0.0-rc.1')).toBe('rc')
    expect(classifyReleaseChannel('2.0.0-preview.1')).toBe('preview')
  })

  test('follows pagination, deduplicates versions, and selects compatible assets', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => release(`1.0.${index}`, `xdocs-windows-x64-baseline.exe`))
    const calls: string[] = []
    const fetcher = (async (input: string | URL | Request) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('page=1')) {
        return Response.json(firstPage, { headers: { link: '<https://api.github.test/releases?per_page=100&page=2>; rel="next"' } })
      }
      return Response.json([
        release('2.0.0-alpha.1', 'xdocs-windows-x64-baseline.exe'),
        release('1.0.99', 'xdocs-windows-x64-baseline.exe'),
        {
          tag_name: 'unrelated@9.9.9',
          html_url: 'https://example.test/unrelated',
          published_at: null,
          prerelease: false,
          draft: false,
          assets: [],
        },
      ])
    })

    const releases = await fetchReleaseCatalog({ platform: 'windows', arch: 'x64', fetcher })
    expect(calls).toHaveLength(2)
    expect(releases).toHaveLength(101)
    expect(releases[0]?.version).toBe('2.0.0-alpha.1')
    expect(releases[0]?.channel).toBe('alpha')
    expect(releases[0]?.compatibleAsset?.name).toBe('xdocs-windows-x64-baseline.exe')
    expect(buildUpgradeListEnvelope('1.0.99', releases).latestStableVersion).toBe('1.0.99')
  })

  test('fails instead of returning a partial catalog when a later page fails', async () => {
    let page = 0
    const fetcher = (async () => {
      page += 1
      if (page === 1) return Response.json([release('1.0.0', 'xdocs-linux-x64-baseline')], { headers: { link: '<https://api.github.test/page/2>; rel="next"' } })
      return new Response('rate limited', { status: 429, statusText: 'Too Many Requests' })
    })

    await expect(fetchReleaseCatalog({ platform: 'linux', arch: 'x64', fetcher })).rejects.toThrow('complete xdocs release catalog')
  })

  test('retains prereleases and releases without a compatible platform asset', async () => {
    const fetcher = async (): Promise<Response> => Response.json([
      release('3.0.0', 'xdocs-linux-x64-baseline'),
      release('3.1.0-preview.2', 'xdocs-windows-x64-baseline.exe'),
    ])
    const releases = await fetchReleaseCatalog({ platform: 'windows', arch: 'x64', fetcher })
    const envelope = buildUpgradeListEnvelope('2.0.0', releases)
    expect(envelope.releases.map(({ version, channel }) => ({ version, channel }))).toEqual([
      { version: '3.1.0-preview.2', channel: 'preview' },
      { version: '3.0.0', channel: 'stable' },
    ])
    expect(envelope.releases[1]?.compatibleAsset).toBeNull()
  })

  test('builds exact-version recovery commands with installer before optional stop guidance', () => {
    const windows = buildUpgradeRecovery({ platform: 'windows', targetVersion: '2.0.0-alpha.3', targetSource: 'explicit' })
    expect(windows.installCommand).toContain('-Version "2.0.0-alpha.3"')
    expect(windows.installCommand).not.toContain('latest')
    expect(windows.stopProcessCommand).toContain('Get-Process xdocs')

    const linux = buildUpgradeRecovery({ platform: 'linux', targetVersion: '1.2.3', targetSource: 'fallback-current' })
    expect(linux.installCommand).toEndWith("--version '1.2.3'")
    expect(linux.targetSource).toBe('fallback-current')
    expect(linux.stopProcessCommand).toBe('pkill -x xdocs || true')
  })
})

function release(version: string, assetName: string): Record<string, unknown> {
  const tag = `@guiho/xdocs@${version}`
  return {
    tag_name: tag,
    html_url: `https://github.com/CGuiho/xdocs/releases/tag/${encodeURIComponent(tag)}`,
    published_at: `2026-07-${String((Number(version.split('.')[2]?.split('-')[0]) % 28) + 1).padStart(2, '0')}T00:00:00Z`,
    prerelease: version.includes('-'),
    draft: false,
    assets: [{ name: assetName, browser_download_url: `https://example.test/${assetName}`, size: 42 }],
  }
}
