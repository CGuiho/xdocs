/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsParsedArgs } from './types.js'
import { XDocsError } from './errors.js'

const booleanFlags = new Set([
  'help',
  'version',
  'verbose',
  'global',
])

const shortFlagMap: Record<string, string> = {
  '-h': '--help',
  '-v': '--version',
}

const listFlags = new Set([
  'extensions',
  'exclude',
])

/**
 * Parse raw CLI arguments into a structured object.
 *
 * Supports:
 * - Commands as the first non-flag token: `xdocs scan`
 * - Long flags with value: `--name=write` or `--name write`
 * - Long boolean flags: `--verbose`
 * - Short flags: `-h`, `-v`
 * - List values as comma-separated: `--extensions=.xdocs.md,.custom.md`
 * - Positional arguments after the command
 */
export const parseArgs = (rawArgs: string[]): XDocsParsedArgs => {
  const args = expandShortFlags(rawArgs)
  const flags: Record<string, string | boolean | string[]> = {}
  const positionals: string[] = []
  let command: string | undefined

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]

    if (token === undefined) continue

    if (token === '--') {
      positionals.push(...args.slice(index + 1).filter((a): a is string => a !== undefined))
      break
    }

    if (token.startsWith('--')) {
      const withoutPrefix = token.slice(2)
      const equalsIndex = withoutPrefix.indexOf('=')
      const rawKey = equalsIndex >= 0 ? withoutPrefix.slice(0, equalsIndex) : withoutPrefix

      if (booleanFlags.has(rawKey)) {
        flags[normalizeKey(rawKey)] = true
        continue
      }

      const value =
        equalsIndex >= 0
          ? withoutPrefix.slice(equalsIndex + 1)
          : (args[index + 1] !== undefined && !args[index + 1]?.startsWith('-'))
            ? args[++index] ?? ''
            : ''

      if (!value) throw new XDocsError(`Missing value for --${rawKey}`)

      const key = normalizeKey(rawKey)

      if (listFlags.has(rawKey)) {
        const values = value.split(',').filter(Boolean)
        const current = flags[key]
        flags[key] = [...(Array.isArray(current) ? current : []), ...values]
        continue
      }

      flags[key] = value
      continue
    }

    if (token.startsWith('-') && token.length > 1) {
      throw new XDocsError(`Unknown short flag: ${token}`)
    }

    if (command === undefined) {
      command = token
    } else {
      positionals.push(token)
    }
  }

  return { command, positionals, flags }
}

/** Convert kebab-case to camelCase. */
const normalizeKey = (key: string) =>
  key.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())

/** Expand short flags like -h to --help. */
const expandShortFlags = (rawArgs: string[]) =>
  rawArgs.map((token) => shortFlagMap[token] ?? token)

/** Extract a string flag value or undefined. */
export const stringFlag = (flags: Record<string, string | boolean | string[]>, key: string): string | undefined => {
  const value = flags[key]
  return typeof value === 'string' ? value : undefined
}

/** Extract a boolean flag value. */
export const booleanFlag = (flags: Record<string, string | boolean | string[]>, key: string): boolean => {
  return flags[key] === true
}

/** Extract a list flag value or undefined. */
export const listFlag = (flags: Record<string, string | boolean | string[]>, key: string): string[] | undefined => {
  const value = flags[key]
  return Array.isArray(value) ? value : undefined
}
