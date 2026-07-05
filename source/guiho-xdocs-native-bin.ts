#!/usr/bin/env bun
/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { registerEmbeddedResources } from './embedded-resources.js'

registerEmbeddedResources()

const { runCliWithErrorHandling } = await import('./cli.js')

await runCliWithErrorHandling()
