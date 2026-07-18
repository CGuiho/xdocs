/**
 * Resolve the user's home without importing node:os.
 */

import { XDocsError } from '../errors.js'

export function homeDirectory(): string {
  const home = Bun.env['HOME'] ?? Bun.env['USERPROFILE']
  if (!home) throw new XDocsError('Unable to resolve the user home directory from HOME or USERPROFILE.')
  return home
}
