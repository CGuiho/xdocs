/**
 * RFC 0034 agent command handlers.
 */

import type { XDocsCliOptions, XDocsSkillScope } from '../types.js'
import {
  applyInstructions,
  installSkills,
  listEmbeddedSkills,
  removeInstructions,
  showEmbeddedSkill,
  uninstallSkills,
  updateInstructions,
  updateSkills,
  xdocsInstructionTemplate,
} from '../agents.js'
import { getPrompt, getPrompts } from '../prompts.js'
import { XDocsError } from '../errors.js'

export type SkillAction = 'install' | 'uninstall' | 'update'
export type InstructionAction = 'apply' | 'remove' | 'update'

export async function runAgentSkillMutation(
  options: XDocsCliOptions,
  action: SkillAction,
  scope: XDocsSkillScope,
): Promise<void> {
  const result = action === 'uninstall'
    ? await uninstallSkills(scope, { cwd: options.cwd })
    : await (action === 'install' ? installSkills : updateSkills)(scope, { cwd: options.cwd })
  writeResult(options, { action, scope, result })
}

export function runAgentSkillList(options: XDocsCliOptions, filter?: string): void {
  writeResult(options, listEmbeddedSkills(filter))
}

export function runAgentSkillShow(options: XDocsCliOptions, id: string): void {
  writeResult(options, showEmbeddedSkill(id))
}

export async function runAgentInstructionMutation(options: XDocsCliOptions, action: InstructionAction): Promise<void> {
  const result = action === 'remove'
    ? await removeInstructions(options.cwd)
    : await (action === 'apply' ? applyInstructions : updateInstructions)(options.cwd)
  writeResult(options, { action, result })
}

export function runAgentInstructionShow(): void {
  process.stdout.write(xdocsInstructionTemplate)
}

export function runAgentPromptList(options: XDocsCliOptions, namesOnly: boolean): void {
  const prompts = getPrompts()
  if (namesOnly) {
    process.stdout.write(prompts.map((prompt) => prompt.name).join('\n') + '\n')
    return
  }
  writeResult(options, prompts.map(({ name, description }) => ({ name, description })))
}

export function runAgentPromptShow(id: string): void {
  const prompt = getPrompt(id)
  if (!prompt) throw new XDocsError(`Unknown prompt id: "${id}"`, 2)
  process.stdout.write(prompt.body.trimEnd() + '\n')
}

function writeResult(options: XDocsCliOptions, value: unknown): void {
  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(value, null, 2) + '\n')
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) process.stdout.write(formatValue(item) + '\n')
    return
  }
  process.stdout.write(formatValue(value) + '\n')
}

function formatValue(value: unknown, prefix = ''): string {
  if (value === null || typeof value !== 'object') return `${prefix}${String(value)}`
  if (Array.isArray(value)) return value.map((item) => formatValue(item, prefix)).join('\n')
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, item]) => {
      if (item && typeof item === 'object') return [`${prefix}${key}:`, formatValue(item, `${prefix}  `)]
      return `${prefix}${key}: ${String(item)}`
    })
    .join('\n')
}
