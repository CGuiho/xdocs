/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 *
 * Embedded resources used only by Bun-compiled native binaries. The Node-safe
 * library build reads these files from disk instead.
 */

// @ts-expect-error -- Bun text import for native binary embedding.
import writePrompt from '../prompts/write.md' with { type: 'text' }
// @ts-expect-error -- Bun text import for native binary embedding.
import updatePrompt from '../prompts/update.md' with { type: 'text' }
// @ts-expect-error -- Bun text import for native binary embedding.
import agentsPrompt from '../prompts/agents.md' with { type: 'text' }
// @ts-expect-error -- Bun text import for native binary embedding.
import generatePrompt from '../prompts/generate.md' with { type: 'text' }
// @ts-expect-error -- Bun text import for native binary embedding.
import xdocsSkill from '../skills/guiho-s-xdocs/SKILL.md' with { type: 'text' }
import packageJson from '../package.json' with { type: 'json' }

export type XDocsEmbeddedResources = {
  prompts: Record<string, string>
  skill: string
  version: string
}

declare global {
  // eslint-disable-next-line no-var
  var __XDOCS_EMBEDDED_RESOURCES__: XDocsEmbeddedResources | undefined
}

/** Register prompt/skill/package resources for a native compiled binary. */
export const registerEmbeddedResources = (): void => {
  globalThis.__XDOCS_EMBEDDED_RESOURCES__ = {
    prompts: {
      write: writePrompt,
      update: updatePrompt,
      agents: agentsPrompt,
      generate: generatePrompt,
    },
    skill: xdocsSkill,
    version: typeof packageJson.version === 'string' ? packageJson.version : '0.0.0',
  }
}
