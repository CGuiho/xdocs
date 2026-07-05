/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import type { XDocsCliOptions, XDocsParsedArgs } from '../types.js'
import { XDocsError } from '../errors.js'
import { stringFlag } from '../flags.js'
import { getPrompt, getPromptNames } from '../prompts.js'

/** Run the prompt command. */
export const runPrompt = async (_options: XDocsCliOptions, parsed: XDocsParsedArgs): Promise<void> => {
  const name = stringFlag(parsed.flags, 'name')
  const available = getPromptNames().join(', ')

  if (!name) {
    throw new XDocsError(`Missing --name flag. Usage: xdocs prompt --name=write\n\nAvailable prompts: ${available}`)
  }

  const prompt = getPrompt(name)

  if (!prompt) {
    throw new XDocsError(`Unknown prompt name: "${name}"\n\nAvailable prompts: ${available}`)
  }

  process.stdout.write(prompt.body + '\n')
}
