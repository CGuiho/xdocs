/**
 * Initialize the explicit xdocs project files.
 */

import type { XDocsCliOptions } from '../types.js'
import type { XDocsSkillScope } from '../types.js'
import { installSkills } from '../agents.js'
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

export const runInit = async (
  options: XDocsCliOptions,
  input: { scope?: XDocsSkillScope } = {},
): Promise<void> => {
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
  const scope = input.scope ?? 'global'
  const skills = await installSkills(scope, { cwd })
  for (const result of skills) {
    const action = result.installed ? 'installed' : result.updated ? 'updated' : 'current'
    process.stdout.write(`${action}: guiho-s-xdocs skill (${result.tool}, ${scope}) -> ${result.path}\n`)
  }

  process.stdout.write('\nxdocs initialized.\n')
}
