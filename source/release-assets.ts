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

export const xdocsAgentAssetNames = ['guiho-s-xdocs.md', 'guiho-i-xdocs.md'] as const
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

export function assertMarkdownAgentAsset(name: string, content: string): void {
  if (!xdocsAgentAssetNames.includes(name as typeof xdocsAgentAssetNames[number])) {
    throw new Error(`Unknown xdocs Markdown agent asset: ${name}`)
  }
  if (!content.trim()) throw new Error(`Markdown agent asset is empty: ${name}`)
  if (content.startsWith('MZ') || content.includes('\0')) {
    throw new Error(`Markdown agent asset contains binary content: ${name}`)
  }
  if (!/^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(content)) {
    throw new Error(`Markdown agent asset is missing YAML frontmatter: ${name}`)
  }
  const expectedName = name.slice(0, -3)
  if (!new RegExp(`^name:\\s*["']?${expectedName}["']?\\s*$`, 'm').test(content)) {
    throw new Error(`Markdown agent asset has the wrong name metadata: ${name}`)
  }
  if (!/^#\s+\S/m.test(content)) {
    throw new Error(`Markdown agent asset is missing a Markdown heading: ${name}`)
  }
}
