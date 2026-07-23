/**
 * @copyright Copyright © 2026 GUIHO Technologies as represented by Cristóvão GUIHO. All Rights Reserved.
 */

import { describe, expect, test } from 'bun:test'

const workflow = await Bun.file('.github/workflows/publish.yml').text()
const ciWorkflow = await Bun.file('.github/workflows/ci.yml').text()

describe('XDocs publish workflow', () => {
  test('keeps main CI as a generic unpinned latest-release smoke', () => {
    expect(ciWorkflow).toContain('curl -fsSL https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.sh | bash')
    expect(ciWorkflow).toContain("'^xdocs [0-9]+\\.[0-9]+\\.[0-9]+([+-][0-9A-Za-z.-]+)?$'")
    expect(ciWorkflow).not.toContain('GITHUB_REF_NAME')
  })

  test('classifies stable and prerelease GitHub releases explicitly', () => {
    expect(workflow).toContain('RELEASE_FLAGS+=(--prerelease)')
    expect(workflow).toContain('RELEASE_FLAGS+=(--latest)')
    expect(workflow).toContain('--verify-tag "${RELEASE_FLAGS[@]}"')
    expect(workflow).toContain('gh release edit "${GITHUB_REF_NAME}"')
  })

  test('accepts the exact tagged installer only after release asset verification', () => {
    const assetsIndex = workflow.indexOf('Verify exact fourteen-asset GitHub release')
    const installerIndex = workflow.indexOf('Verify exact-version public Linux installer')

    expect(assetsIndex).toBeGreaterThan(-1)
    expect(installerIndex).toBeGreaterThan(assetsIndex)
    expect(workflow).toContain('https://raw.githubusercontent.com/CGuiho/xdocs/${GITHUB_REF_NAME}/devops/install.sh')
    expect(workflow).toContain('bash -s -- --version "$VERSION"')
    expect(workflow).toContain('test "$("$install_dir/xdocs" --version)" = "xdocs $VERSION"')
    expect(workflow).toContain('$HOME/.agents/skills/guiho-s-xdocs/SKILL.md')
    expect(workflow).toContain('$HOME/.claude/skills/guiho-s-xdocs/SKILL.md')
    expect(workflow).toContain('$project_dir/AGENTS.md')
  })

  test('remains valid YAML after the release acceptance changes', () => {
    expect(() => Bun.YAML.parse(workflow)).not.toThrow()
    expect(() => Bun.YAML.parse(ciWorkflow)).not.toThrow()
  })
})
