---
name: xdocs-architecture
purpose: Explain the runtime, command, configuration, agent-resource, upgrade, and distribution architecture of xdocs.
description: Technical architecture for the Bun-native RFC 0034 xdocs CLI and its thin Node bootstrap.
created: 2026-06-01
owner: xdocs-package
flags: []
tags:
  - architecture
  - cli
  - rfc-0034
keywords:
  - Bun
  - Citty
  - TypeBox
  - native binary
---

# xdocs Architecture

## Runtime boundary

xdocs is Bun-only in core and shared source. The mandatory stack is Bun,
strict ESM TypeScript, raw Citty, and TypeBox. Core source does not import
`node:fs`, `node:fs/promises`, `node:path`, `node:os`, or
`node:child_process`.

The only Node-runtime surface is `scripts/xdocs-bin.mjs`, a thin npm bootstrap
that selects, downloads, caches, and spawns a native executable.

## Entrypoints

- `source/guiho-xdocs.ts`: Bun-first public library.
- `source/guiho-xdocs-bin.ts`: source CLI entrypoint.
- `source/guiho-xdocs-native-bin.ts`: native entrypoint that registers embedded
  skill, prompt, and package resources.
- `source/cli.ts`: the single Citty catalog and router.
- `scripts/xdocs-bin.mjs`: Node-compatible npm native bootstrap.

## Platform modules

- `source/schemas.ts`: TypeBox schemas and decoding.
- `source/runtime/path.ts`: narrow cross-platform path operations.
- `source/runtime/fs.ts`: Bun filesystem and Bun-spawned mutation operations.
- `source/runtime/home.ts`: home resolution from Bun environment state.
- `source/config.ts`: YAML discovery, decoding, defaults, and writing.
- `source/help.ts`: Developer Context tree and Markdown generated from Citty.
- `source/agents.ts`: explicit skill and instruction resource operations.
- `source/prompts.ts`: TypeBox-decoded embedded prompt catalog.
- `source/self-management.ts`: cache lifecycle, detached worker, upgrade, and
  uninstall orchestration.
- `source/upgrade-catalog.ts`: TypeBox-decoded GitHub release selection.
- `source/upgrade-transaction.ts`: observable replacement, verification,
  rollback, recovery, and cleanup.
- `source/release-assets.ts`: exact fourteen-asset contract.

## Domain modules

The structured-documentation domain remains separate:

- `source/discovery.ts` scans descriptors and companion documents.
- `source/metadata.ts` parses and TypeBox-validates YAML frontmatter.
- `source/tree.ts` builds containment trees.
- `source/meta.ts` reads metadata-only context.
- `source/context.ts` recommends deterministic reading sets.
- `source/doctor.ts` validates documentation health.
- `source/commands/` adapts Citty values to focused handlers.

## Startup lifecycle

1. Read and TypeBox-decode `~/.guiho/xdocs/cache.json`.
2. Print the exact cached update notice when a newer version exists.
3. Resolve and decode configuration for config-aware commands.
4. Report the absolute loaded YAML path.
5. Atomically acquire one cache-scoped update lease and spawn
   `--check-updates-worker` detached without awaiting network work.
6. Route the exact worker flag before Citty so a worker can never enter the
   ordinary startup lifecycle or recursively schedule another worker.
7. With no arguments, print `Hello Windows - xdocs v<version>`.

The complete remote check is bounded to 15 seconds. A TypeBox-decoded lease
with a unique ownership token coalesces concurrent invocations, is released on
every terminal outcome, and becomes reclaimable after 30 seconds. Primary
lease mutation uses a short ownership-checked guard so an old suspended worker
cannot delete a newer lease. Foreground scheduling errors are isolated and do
not reject into command routing.

Data/documentation commands do not mutate skills or instruction files.
Initialization is the deliberate setup exception: `xdocs init` installs the
bundled skill globally by default, while `xdocs init --local` uses project
scope. Instruction files remain explicit operations.

## Configuration

`xdocs.yaml` resolves from explicit path, effective project root, then
`~/.guiho/xdocs/xdocs.yaml`. TypeBox owns the extensions, AI, scan, and project
shape. Invalid YAML or schema data exits as configuration failure.

## Agent resources

The embedded skill is canonical at `skills/guiho-s-xdocs/SKILL.md`. Install,
update, and uninstall always operate on both `.agents/skills/guiho-s-xdocs` and
`.claude/skills/guiho-s-xdocs`, globally by default or locally with `--local`.

Instruction operations manage a bounded XDOCS block in `AGENTS.md`,
`CLAUDE.md`, both, or a newly created `AGENTS.md`. Prompt operations expose the
four embedded bodies and the `guiho-i-xdocs` release catalog.

## Upgrade transactions and catalog

`xdocs upgrade` resolves and prints an immutable plan before download, streams
typed phase starts plus known-length percentage or unknown-length byte progress,
validates a native candidate, swaps the canonical
executable synchronously, verifies the canonical path, and rolls back on swap
or version failure. Only deletion of a Windows backup may be deferred. JSON
output buffers the same plan, events, result, recovery, and error into one
document.

Every terminal outcome carries a recovery contract generated by the same
installer version-selection rules: a full-version pinned direct-install
command followed by a separate platform process-stop command. Discovery
failure uses the current version as an explicit repair target.

`xdocs upgrade list` exhausts GitHub Releases pagination and keeps every stable
and prerelease entry. SemVer ordering is newest first; rows expose the full tag,
exact prerelease identifier, publication timestamp, compatible-asset state,
current marker, and latest-stable marker.

## Distribution

`devops/build-binaries.ts` compiles twelve native binaries:

- Linux: arm64, x64, x64-baseline, x64-modern
- Darwin: arm64, x64, x64-baseline, x64-modern
- Windows: arm64, x64, x64-baseline, x64-modern

It then creates `guiho-s-xdocs.md` and `guiho-i-xdocs.md`, validates both as
named Markdown rather than executable or binary payloads, and fails unless the
output directory contains exactly those fourteen unique names.

The Bash and PowerShell installers show progress, install the binary globally,
configure PATH, install both skill copies, discover instruction files,
reconcile instructions, and verify the final executable. Darwin Bash installs
prefer an existing `.bash_profile` for login-shell PATH configuration.
The Bash installer delegates progress rendering to curl's progress bar.
PowerShell uses an explicit buffered `HttpClient` stream so percentage/byte
updates remain visible independently of host `Invoke-WebRequest` behavior.

The tag publish workflow extracts the exact version's level-two section from
`CHANGELOG.md` and uses only that section as the GitHub Release description.
Missing, duplicate, or empty version sections fail release creation.

## Exit discipline

- `0`: success
- `1`: unexpected operational failure
- `2`: usage or TypeBox validation failure
- `3`: configuration resolution or decoding failure
- `4`: release or network failure
- `5`: installation, upgrade, or filesystem mutation failure
- `130`: interruption

Text is human-readable. JSON commands emit one JSON document on stdout;
diagnostics and configuration reports use stderr when needed to preserve JSON.
