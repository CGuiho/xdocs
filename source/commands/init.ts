/**
 * Initialize the explicit xdocs project files.
 */

import type { XDocsCliOptions } from '../types.js'
import { writeDefaultConfig } from '../config.js'
import { pathExists, writeText } from '../runtime/fs.js'
import { basename, joinPath } from '../runtime/path.js'

const createRootXDocsContent = (projectName: string): string =>
  `# ${projectName} -- XDocs Root

The single root index for this repository. There is exactly one \`XDOCS.md\` per
repository and it does not use frontmatter. List the packages and applications
in the repo below; each one has its own root named \`*.xdocs.md\` descriptor.

## Packages

## Applications
`

export const runInit = async (options: XDocsCliOptions, _input: Record<string, never> = {}): Promise<void> => {
  const cwd = options.cwd
  const configPath = joinPath(cwd, 'xdocs.yaml')
  if (await pathExists(configPath)) process.stdout.write('exists: xdocs.yaml\n')
  else {
    await writeDefaultConfig(cwd)
    process.stdout.write('created: xdocs.yaml\n')
  }

  const xdocsPath = joinPath(cwd, 'XDOCS.md')
  if (await pathExists(xdocsPath)) process.stdout.write('exists: XDOCS.md\n')
  else {
    await writeText(xdocsPath, createRootXDocsContent(basename(cwd)))
    process.stdout.write('created: XDOCS.md\n')
  }
  process.stdout.write('\nxdocs initialized. Use `xdocs agent skill install --local` and `xdocs agent instruction apply` for explicit agent setup.\n')
}
