/**
 * @copyright Copyright (c) 2026 GUIHO Technologies as represented by CristÃ³vÃ£o GUIHO. All Rights Reserved.
 */

export {
  extractReleaseNotes,
  normalizeReleaseVersion,
}

const semanticVersionPattern = '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?'
const versionHeadingPattern = new RegExp(`^##\\s+\\[?v?(${semanticVersionPattern})\\]?(?:\\s|$)`)

function normalizeReleaseVersion(value: string): string {
  return value
    .trim()
    .replace(/^refs\/tags\//, '')
    .replace(/^@guiho\/xdocs@/, '')
    .replace(/^v(?=\d)/, '')
}

function extractReleaseNotes(changelog: string, tag: string): string {
  const targetVersion = normalizeReleaseVersion(tag)
  if (!new RegExp(`^${semanticVersionPattern}$`).test(targetVersion)) {
    throw new Error(`Invalid XDocs release version or tag: ${tag}`)
  }

  const lines = changelog.replaceAll('\r\n', '\n').split('\n')
  const matches: number[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index]?.match(versionHeadingPattern)
    if (match?.[1] === targetVersion) matches.push(index)
  }
  if (matches.length === 0) {
    throw new Error(`CHANGELOG.md has no level-two section for XDocs ${targetVersion}.`)
  }
  if (matches.length > 1) {
    throw new Error(`CHANGELOG.md has duplicate level-two sections for XDocs ${targetVersion}.`)
  }

  const start = matches[0] as number
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+\S/.test(lines[index] ?? '')) {
      end = index
      break
    }
  }
  const section = lines.slice(start, end).join('\n').trim()
  const body = lines.slice(start + 1, end).join('\n').trim()
  if (!body) throw new Error(`CHANGELOG.md section for XDocs ${targetVersion} is empty.`)
  return `${section}\n`
}

async function main(): Promise<void> {
  const [tag, changelogPath = 'CHANGELOG.md', outputPath] = Bun.argv.slice(2)
  if (!tag || !outputPath) {
    throw new Error('Usage: bun devops/extract-release-notes.ts <tag> [changelog-path] <output-path>')
  }
  const changelogFile = Bun.file(changelogPath)
  if (!await changelogFile.exists()) throw new Error(`Changelog not found: ${changelogPath}`)
  await Bun.write(outputPath, extractReleaseNotes(await changelogFile.text(), tag))
  console.log(`release notes: ${outputPath}`)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
