/**
 * Build and verify the exact RFC 0034 fourteen-asset release set.
 */

import { assertExactReleaseAssets, xdocsNativeTargets, xdocsReleaseAssetNames } from '../source/release-assets.js'
import { makeDirectory, removePath } from '../source/runtime/fs.js'

assertExactReleaseAssets(xdocsReleaseAssetNames)

const root = Bun.fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]+$/, '')
const slash = process.platform === 'win32' ? '\\' : '/'
const bin = `${root}${slash}bin`
await removePath(bin, { recursive: true, force: true })
await makeDirectory(bin)

for (const [target, asset] of xdocsNativeTargets) {
  const output = `${bin}${slash}${asset}`
  const child = Bun.spawn([
    process.execPath,
    'build',
    'source/guiho-xdocs-native-bin.ts',
    '--compile',
    '--production',
    '--minify-whitespace',
    '--minify-syntax',
    '--target',
    target,
    '--outfile',
    output,
  ], { cwd: root, stdout: 'inherit', stderr: 'inherit' })
  if (await child.exited !== 0) throw new Error(`Failed to build ${target} -> ${asset}`)
  if ((await Bun.file(output).stat()).size === 0) throw new Error(`Built binary is empty: ${asset}`)
  console.log(`built: ${target} -> bin/${asset}`)
}

const skill = await Bun.file(`${root}${slash}skills${slash}guiho-s-xdocs${slash}SKILL.md`).text()
const promptManifest = await Bun.file(`${root}${slash}prompts${slash}guiho-i-xdocs.md`).text()
const promptBodies: Record<string, string> = {}
for (const name of ['write', 'update', 'agents', 'generate']) {
  promptBodies[`${name}.md`] = await Bun.file(`${root}${slash}prompts${slash}${name}.md`).text()
}
await Bun.write(`${bin}${slash}guiho-s-xdocs`, `${skill.trimEnd()}\n`)
await Bun.write(`${bin}${slash}guiho-i-xdocs`, JSON.stringify({
  schema: 1,
  manifest: promptManifest,
  prompts: promptBodies,
}, null, 2) + '\n')

const actual: string[] = []
for await (const entry of new Bun.Glob('*').scan({ cwd: bin, onlyFiles: true })) actual.push(entry)
actual.sort()
assertExactReleaseAssets(actual)
console.log('verified exactly 12 native binaries plus guiho-s-xdocs and guiho-i-xdocs')
