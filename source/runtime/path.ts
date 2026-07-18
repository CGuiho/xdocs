/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Small Bun-first path helpers used by the CLI. The module intentionally avoids
 * Node's path package so the native CLI core remains Bun-only.
 */

const separator = process.platform === 'win32' ? '\\' : '/'

export const pathSeparator = separator

export function normalizePath(input: string): string {
  if (input.length === 0) return '.'
  const slash = input.replaceAll('\\', '/')
  const driveMatch = slash.match(/^([A-Za-z]:)(\/|$)/)
  const drive = driveMatch?.[1] ?? ''
  const absolute = slash.startsWith('/') || Boolean(driveMatch)
  const rest = drive ? slash.slice(drive.length).replace(/^\/+/, '') : slash.replace(/^\/+/, '')
  const parts: string[] = []

  for (const part of rest.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (parts.length > 0 && parts.at(-1) !== '..') parts.pop()
      else if (!absolute) parts.push(part)
      continue
    }
    parts.push(part)
  }

  const prefix = drive ? `${drive}/` : absolute ? '/' : ''
  const normalized = `${prefix}${parts.join('/')}` || (absolute ? prefix : '.')
  return separator === '\\' ? normalized.replaceAll('/', '\\') : normalized
}

export function isAbsolute(path: string): boolean {
  return path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(path)
}

export function resolvePath(...parts: string[]): string {
  let combined = ''
  for (const part of parts) {
    if (!part) continue
    combined = isAbsolute(part) ? part : combined ? `${combined}/${part}` : part
  }
  if (!isAbsolute(combined)) combined = `${process.cwd()}/${combined}`
  return normalizePath(combined)
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join('/'))
}

export function dirname(path: string): string {
  const normalized = normalizePath(path)
  const slash = normalized.replaceAll('\\', '/')
  const index = slash.lastIndexOf('/')
  if (index < 0) return '.'
  if (index === 0) return separator
  if (/^[A-Za-z]:$/.test(slash.slice(0, index))) return `${slash.slice(0, index)}${separator}`
  return normalizePath(slash.slice(0, index))
}

export function basename(path: string): string {
  const normalized = normalizePath(path).replaceAll('\\', '/').replace(/\/+$/, '')
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}

export function relativePath(from: string, to: string): string {
  const fromAbsolute = resolvePath(from).replaceAll('\\', '/')
  const toAbsolute = resolvePath(to).replaceAll('\\', '/')
  const fromDrive = fromAbsolute.match(/^[A-Za-z]:/)?.[0].toLowerCase()
  const toDrive = toAbsolute.match(/^[A-Za-z]:/)?.[0].toLowerCase()
  if (fromDrive !== toDrive) return normalizePath(toAbsolute)

  const normalizeCase = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value
  const fromParts = fromAbsolute.split('/').filter(Boolean)
  const toParts = toAbsolute.split('/').filter(Boolean)
  let shared = 0
  while (
    shared < fromParts.length
    && shared < toParts.length
    && normalizeCase(fromParts[shared]!) === normalizeCase(toParts[shared]!)
  ) shared += 1

  const result = [
    ...Array.from({ length: fromParts.length - shared }, () => '..'),
    ...toParts.slice(shared),
  ].join('/')
  return normalizePath(result || '.')
}
