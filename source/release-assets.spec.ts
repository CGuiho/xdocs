import { describe, expect, test } from 'bun:test'
import {
  assertExactReleaseAssets,
  xdocsAgentAssetNames,
  xdocsNativeTargets,
  xdocsReleaseAssetNames,
} from './release-assets.js'

describe('RFC 0034 release assets', () => {
  test('defines exactly twelve native assets and two agent artifacts', () => {
    expect(xdocsNativeTargets).toHaveLength(12)
    expect(xdocsAgentAssetNames).toEqual(['guiho-s-xdocs', 'guiho-i-xdocs'])
    expect(xdocsReleaseAssetNames).toHaveLength(14)
    expect(new Set(xdocsReleaseAssetNames).size).toBe(14)
    expect(xdocsReleaseAssetNames.some((name) => name.includes('macos'))).toBeFalse()
    expect(() => assertExactReleaseAssets(xdocsReleaseAssetNames)).not.toThrow()
  })

  test('rejects missing, duplicate, extra, and legacy assets', () => {
    expect(() => assertExactReleaseAssets(xdocsReleaseAssetNames.slice(1))).toThrow()
    expect(() => assertExactReleaseAssets([...xdocsReleaseAssetNames.slice(0, -1), xdocsReleaseAssetNames[0]])).toThrow()
    expect(() => assertExactReleaseAssets([...xdocsReleaseAssetNames, 'extra'])).toThrow()
    expect(() => assertExactReleaseAssets(xdocsReleaseAssetNames.map((name) => name.replace('darwin', 'macos')))).toThrow()
  })

  test('core source contains no prohibited Node imports', async () => {
    const prohibited = /from ['"]node:(?:fs|fs\/promises|child_process|path|os)['"]/
    const violations: string[] = []
    for await (const path of new Bun.Glob('**/*.ts').scan({ cwd: import.meta.dir, onlyFiles: true })) {
      if (path.endsWith('.spec.ts')) continue
      if (prohibited.test(await Bun.file(`${import.meta.dir}/${path}`).text())) violations.push(path)
    }
    expect(violations).toEqual([])
  })
})
