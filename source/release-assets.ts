/**
 * Exact RFC 0034 release asset contract.
 */

export const xdocsNativeTargets = [
  ['bun-linux-arm64', 'xdocs-linux-arm64'],
  ['bun-linux-x64', 'xdocs-linux-x64'],
  ['bun-linux-x64-baseline', 'xdocs-linux-x64-baseline'],
  ['bun-linux-x64-modern', 'xdocs-linux-x64-modern'],
  ['bun-darwin-arm64', 'xdocs-darwin-arm64'],
  ['bun-darwin-x64', 'xdocs-darwin-x64'],
  ['bun-darwin-x64-baseline', 'xdocs-darwin-x64-baseline'],
  ['bun-darwin-x64-modern', 'xdocs-darwin-x64-modern'],
  ['bun-windows-arm64', 'xdocs-windows-arm64.exe'],
  ['bun-windows-x64', 'xdocs-windows-x64.exe'],
  ['bun-windows-x64-baseline', 'xdocs-windows-x64-baseline.exe'],
  ['bun-windows-x64-modern', 'xdocs-windows-x64-modern.exe'],
] as const

export const xdocsAgentAssetNames = ['guiho-s-xdocs', 'guiho-i-xdocs'] as const
export const xdocsReleaseAssetNames = [
  ...xdocsNativeTargets.map((target) => target[1]),
  ...xdocsAgentAssetNames,
] as const

export function assertExactReleaseAssets(actual: readonly string[]): void {
  const expected = [...xdocsReleaseAssetNames].sort()
  const normalized = [...actual].sort()
  if (normalized.length !== 14 || new Set(normalized).size !== 14 || JSON.stringify(normalized) !== JSON.stringify(expected)) {
    throw new Error(`Invalid xdocs release assets.\nExpected: ${expected.join(', ')}\nActual: ${normalized.join(', ')}`)
  }
}
