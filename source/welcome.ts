import type { XDocsUpdateCache } from './types.js'
import { compareSemanticVersions } from './upgrade-catalog.js'

export { renderWelcome, renderUpdateNotice }

type WelcomeOptions = {
  version: string
  platform?: string
  arch?: string
  update?: XDocsUpdateCache | null
}

function renderWelcome(options: WelcomeOptions): string {
  const lines = [
    '╔════════════════════════════════════════════════════════════╗',
    '║  XDOCS                                                     ║',
    '║  Structured documentation for codebases and AI agents     ║',
    '╚════════════════════════════════════════════════════════════╝',
    '',
    '  organization  GUIHO',
    `  platform      ${platformLabel(options.platform ?? process.platform)} ${archLabel(options.arch ?? process.arch)}`,
    `  version       v${options.version}`,
    '',
    '  Run `xdocs --help` to see available commands.',
  ]
  const notice = renderUpdateNotice(options.version, options.update)
  if (notice) lines.push('', ...notice.trimEnd().split('\n'))
  return lines.join('\n') + '\n'
}

function renderUpdateNotice(currentVersion: string, update?: XDocsUpdateCache | null): string {
  if (!update?.newVersionAvailable) return ''
  if (compareSemanticVersions(update.latestVersion, currentVersion) <= 0) return ''
  return `  ⚠ New version available: v${update.latestVersion}\n    Run \`${update.upgradeCommand ?? 'xdocs upgrade'}\` to update.\n`
}

function platformLabel(platform: string): string {
  if (platform === 'win32') return 'Windows'
  if (platform === 'darwin') return 'macOS'
  if (platform === 'linux') return 'Linux'
  return platform
}

function archLabel(arch: string): string {
  if (arch === 'x64') return 'x64'
  if (arch === 'arm64') return 'arm64'
  return arch
}
