# Repository Notes

- `xdocs` is almost always written lowercase (CLI, code, text). Only capitalize as `XDocs` when used in a title or heading.
- The real package lives in `xdocs/`; run package commands there unless editing root docs or `ci/`.
- `@guiho40/xdocs` is a Bun/TypeScript ESM CLI/library. The library entrypoint is `xdocs/source/guiho-xdocs.ts` and the CLI entrypoint is `xdocs/source/guiho-xdocs-bin.ts`; `tsc` emits `xdocs/library/` for `main`/`types`, and Bun compiles `xdocs/bin/` for the CLI binary.
- New library entrypoints must use the full library name instead of generic `index.ts` files. For XDocs v3, use `guiho-xdocs.ts`.
- Use Bun, not npm/pnpm/yarn. Install from `xdocs/` with `bun install`. Private `@guiho40` packages use Google Artifact Registry from `xdocs/.npmrc`; auth helper is `bun _gaa` or `bunx google-artifactregistry-auth`.

## Commands

- Typecheck: `cd xdocs && bun run typecheck`
- Test all: `cd xdocs && bun test` (currently finds `source/xdocs.spec.ts` but runs 0 tests)
- Test one file: `cd xdocs && bun test source/xdocs.spec.ts`
- Build library: `cd xdocs && bun run build` (writes ignored `xdocs/library/`)
- Compile CLI binary: `cd xdocs && bun run binary` (writes ignored `xdocs/bin/`)
- Avoid `bun _ci` and `bun clean-installation` unless intentionally resetting dependencies; they remove `node_modules` and `bun.lock`.

## CLI Behavior

- Supported forms are `xdocs see`, `xdocs <semver-or-release-type>`, and `xdocs <path-to-package.json> <semver-or-release-type>`.
- Release types are hard-coded in `source/xdocs.ts`: `major`, `premajor`, `minor`, `preminor`, `patch`, `prepatch`, `prerelease`; prerelease bumps use `alpha.1`.
- A release run mutates `package.json`, also mutates sibling `package.build.json` when present, then runs `git add`, `git commit`, `git tag`, `git push`, and `git push --tags`. Test CLI release paths in a disposable fixture repo, not this worktree.

## Gotchas

- There is no lint or formatter config. Existing TS uses strict `tsconfig.json`, single quotes, and no semicolons; match nearby style.
- Generated outputs (`xdocs/library/`, `xdocs/bundle/`, `xdocs/bin/`, `*.tgz`) are ignored; do not hand-edit them.
- `ci/build-test-publish.sh` clones to `.temp/xdocs`, checks out an `@guiho40/xdocs@...` tag, authenticates Artifact Registry, then runs `typecheck -> bun test -> build -> binary -> bun publish`. Its explicit-argument branch currently builds `_tag` from undefined `_version`; verify before relying on it.
- `.vscode/terminals.json` references `bun clean-hard`, but `xdocs/package.json` does not define that script.

<!-- BEGIN AGENT KANBAN — DO NOT EDIT THIS SECTION -->
## Agent Kanban

Read `.agentkanban/INSTRUCTION.md` for task workflow rules.
Read `.agentkanban/memory.md` for project context.

If a task file (`.agentkanban/tasks/**/*.md`) was referenced earlier in this conversation, re-read it before responding and always respond in and at the end the task file.
<!-- END AGENT KANBAN -->
