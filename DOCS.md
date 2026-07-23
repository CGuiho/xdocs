---
name: xdocs-documentation
purpose: Provide the complete user and contributor reference for xdocs.
description: Canonical documentation for descriptors, YAML configuration, CLI commands, agent resources, upgrades, and release assets.
created: 2026-06-07
owner: xdocs-package
flags: []
tags:
  - documentation
  - cli
  - api
keywords:
  - xdocs
  - RFC 0034
  - TypeBox
  - agent resources
---

# xdocs Documentation

## Purpose

xdocs describes a repository through one root `XDOCS.md`, named
`*.xdocs.md` descriptors, and companion Markdown metadata. The CLI provides
coverage scans, generated documentation, merged views, containment trees,
metadata-only reads, context recommendations, and CI-friendly health checks.

## Descriptor model

A descriptor uses YAML frontmatter:

```yaml
---
subject: source-auth
description: Authentication implementation and contracts.
parent: source
children: []
files:
  service.ts: Authentication service.
documents:
  decisions.md: Authentication decisions.
tags:
  - backend
keywords:
  - authentication
flags: []
status: stable
---
```

Required fields are `subject`, `description`, `parent`, `children`, `files`,
`documents`, `tags`, `keywords`, and `flags`. TypeBox validates the decoded
YAML before metadata enters discovery, tree, context, or doctor logic.

Companion documents should contain `owner`, `tags`, and `keywords` frontmatter
and must be listed by their same-directory descriptor.

## Configuration

Only `xdocs.yaml` is supported. Resolution precedence:

1. explicit `--config <path>`
2. `<effective-cwd>/xdocs.yaml`
3. `~/.guiho/xdocs/xdocs.yaml`

```yaml
schema: 1
extensions:
  supported: [.xdocs.md]
ai:
  mode: prompt
scan:
  exclude: [node_modules, .git, dist, build, library, bin, bundle]
project:
  name: example
```

`ai.mode` is `prompt` or `auto`. Agent mutation settings do not exist; agent
files change only through explicit `xdocs agent` commands.

## Global flags

- `-h`, `--help`: Citty usage for the selected scope.
- `--help-tree`: full Unicode command subtree.
- `--help-tree-depth <positive-integer>`: bounded subtree.
- `--help-docs`: redirect-safe Markdown from the live Citty tree.
- root only: `-v`, `--version`.
- `--cwd <path>`: effective project directory.
- `--config <path>`: explicit YAML configuration.
- `--format <text|json|markdown>`: supported output.
- `--verbose`: detailed diagnostics.

Every help form is generated from the same live Citty definition, includes
practical examples, and exposes the approved public catalog. The internal
update worker is hidden and there is no public `home` command. No other short
aliases exist.

## Domain commands

### `xdocs init`

Creates `xdocs.yaml` and `XDOCS.md` when absent, then installs or refreshes the
bundled skill in both global tool locations. `xdocs init --local` installs the
same skill beneath the effective project root. Initialization does not modify
`AGENTS.md` or `CLAUDE.md`; instruction changes remain explicit.

### `xdocs scan`

Reports directory, descriptor, and companion-document coverage.

### `xdocs generate [path]`

Generates documentation for a scope. `--output <path>` writes a file.

### `xdocs merge [path]`

Merges scoped descriptors with source markers. `--output` writes a file.

### `xdocs tree`

Builds the parent/children containment hierarchy. Supports text, Markdown, and
JSON plus `--output`.

### `xdocs list [path]`

Lists implementation files and companion documents from descriptor maps.

### `xdocs meta [path]`

Reads descriptor frontmatter top-down. Options:

- `--documents`
- `--strict`
- `--owner <subject>`
- `--tag <tag>`
- `--keyword <keyword>`

### `xdocs context <query> [path]`

Returns a minimal deterministic reading set. Options:

- `--documents`
- `--files`
- `--limit <positive-integer>`
- `--owner`, `--tag`, `--keyword`
- `--explain`

### `xdocs doctor [path]`

Validates descriptors, companion metadata, tree links, and documented files.
Use `--no-documents` or `--warnings-as-errors` where appropriate.

## Agent commands

### Skills

```bash
xdocs agent skill install [--local]
xdocs agent skill uninstall [--local]
xdocs agent skill update [--local]
xdocs agent skill list [--filter <keyword>]
xdocs agent skill show <id>
```

Mutation defaults to global scope and always targets:

```text
~/.agents/skills/guiho-s-xdocs
~/.claude/skills/guiho-s-xdocs
```

`--local` substitutes the effective project root. Update and uninstall also
remove the legacy `guiho-as-xdocs` directories.

### Instructions

```bash
xdocs agent instruction apply
xdocs agent instruction remove
xdocs agent instruction update
xdocs agent instruction show
```

If only one of `AGENTS.md` or `CLAUDE.md` exists, it is used. If both exist,
both are used. If neither exists, `AGENTS.md` is created. Actions manage:

```text
<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->
...
<!-- END XDOCS -->
```

Apply and update are idempotent; show emits the raw canonical body.

### Prompts

```bash
xdocs agent prompt list
xdocs agent prompt list --names
xdocs agent prompt show write
```

IDs are `write`, `update`, `agents`, and `generate`. `show` prints only the raw
body. Native binaries embed the manifest and all bodies. The release contains
one `guiho-i-xdocs.md` catalog artifact, not four separate prompt assets.

## Startup and update cache

Bare startup prints the deterministic GUIHO welcome:

```text
╔════════════════════════════════════════════════════════════╗
║  XDOCS                                                     ║
║  Structured documentation for codebases and AI agents     ║
╚════════════════════════════════════════════════════════════╝

  organization  GUIHO
  platform      Windows x64
  version       v<version>

  Run `xdocs --help` to see available commands.
```

The foreground reads only `~/.guiho/xdocs/cache.json`. When
`newVersionAvailable` is true and `latestVersion` is newer than the running
SemVer, it prints:

```text
  ⚠ New version available: v<latest>
    Run `xdocs upgrade` to update.
```

The foreground awaits only the local lease-and-detached-spawn handoff, never
the remote request. Its exact internal flag is handled before Citty, so it cannot enter
the normal root lifecycle or launch another worker. An exclusive lease permits
at most one check per cache directory, a 15-second deadline bounds the entire
remote check, and every outcome releases its ownership token. Valid stale,
corrupt, and orphaned leases are recoverable after 30 seconds without allowing
an old worker to remove a newer lease. Cache and lease data are TypeBox-
validated. Corrupt cache never blocks normal commands, and scheduler failures
never reject into foreground command execution.

## Upgrade and uninstall

```bash
xdocs upgrade [--version <version>] [--arch <x64|arm64>]
              [--variant <baseline|default|modern>] [--dry-run]
              [--format <text|json>]
xdocs upgrade check
xdocs upgrade list [--page <page>] [--size <size>]
xdocs uninstall [--dry-run]
```

The complete stable and prerelease catalog is fetched, decoded, deduplicated,
and sorted newest SemVer first before local pagination. Page defaults to 1 and
size defaults to 8, with a maximum size of 100. Human text uses only
`VERSION`, `CHANNEL`, `PUBLISHED`, `CURRENT`, `LATEST`, and `ASSET`; dates use
`YYYY-MM-DD`, marker cells use `yes` or remain blank, and asset compatibility
uses `yes`/`no`. Text intentionally omits full tags, release URLs, and asset
names. Markdown preserves its complete release table, and JSON schema version 2
preserves complete release objects plus pagination totals and navigation. Text
and Markdown print copyable previous/next commands. GitHub pagination is
exhausted internally; later-page failure aborts
instead of returning a partial catalog. The x64 default variant is baseline.
GitHub release responses are TypeBox-validated.

Upgrade phases are plan, download, validate, replace, verify, cache, and
cleanup. A journal and backup support interruption recovery and rollback.
Text output flushes the complete immutable plan before `Downloading...`, then
streams a progress bar and percentage when `Content-Length` is known or received
bytes when it is not, and
prints `Replacing...` and `Verifying...` only when those phases begin.
After successful replacement xdocs refreshes both global skill copies and
updates instructions in the current project.

After every upgraded, failed, rolled-back, or already-current result, text and
Markdown print a copy-paste native installer command pinned to the resolved
full version, followed by a separate platform-specific process-stop command.
Pre-plan discovery failure falls back to a visibly labeled reinstall of the
current version. JSON exposes the equivalent `recovery.targetVersion`,
`installCommand`, and `stopProcessCommand` fields without mixing human output
into stdout.

## Installers

Use the public copy-paste installers directly:

```powershell
irm https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1 | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.sh | bash
```

`devops/install.ps1` and `devops/install.sh` print target version,
architecture, variant, source URL, live download progress, binary destination,
skill destinations, discovered instruction files, reconciliation, and final
verification.

They install the matching native binary and download `guiho-s-xdocs.md` plus
`guiho-i-xdocs.md`. Both files must be valid named Markdown; PE executables,
NUL-containing content, empty responses, and invalid metadata are rejected
before either installed `SKILL.md` is changed. Failures preserve or restore the
previous executable.
POSIX downloads use curl's progress bar. PowerShell downloads stream through a
bounded buffer and print deterministic percentage/byte updates for the binary,
skill, and prompt assets.
Both installers accept an explicit full stable or prerelease version, resolve
that release's matching platform/architecture asset, and exit nonzero unless
the canonical installed executable reports exactly that version.

## npm bootstrap

`scripts/xdocs-bin.mjs` is Node-compatible and isolated from Bun core source.
It detects platform, architecture, and x64 variant; caches by package version
under `~/.guiho/xdocs/npm`; downloads missing binaries; applies Unix executable
permissions; forwards args, stdio, and environment; and exits with the native
process result.

## Release assets

Exactly fourteen assets:

```text
xdocs-linux-arm64
xdocs-linux-x64
xdocs-linux-x64-baseline
xdocs-linux-x64-modern
xdocs-darwin-arm64
xdocs-darwin-x64
xdocs-darwin-x64-baseline
xdocs-darwin-x64-modern
xdocs-windows-arm64.exe
xdocs-windows-x64.exe
xdocs-windows-x64-baseline.exe
xdocs-windows-x64-modern.exe
guiho-s-xdocs.md
guiho-i-xdocs.md
```

The build and GitHub workflow reject missing, duplicate, extra, legacy, or
wrongly suffixed assets.

The tag workflow extracts only the exact version's `## <version>` section from
`CHANGELOG.md` for the GitHub Release description. Extraction stops at the next
level-two heading and fails on missing, duplicate, or empty matching sections.
Stable releases are explicitly marked latest and prereleases are explicitly
marked prerelease. After the exact fourteen assets are public, the workflow
downloads the installer from the immutable tag, requests that exact version,
and accepts the release only when the installed binary reports exactly
`xdocs <version>`, both global skill copies exist, and the project instruction
block was reconciled. Main-branch CI's unpinned installer check remains a
generic latest-stable smoke and is not release evidence.

## TypeScript API

The public entrypoint exports configuration, discovery, metadata, meta,
context, doctor, tree, prompts, help, agent resources, update cache, release
catalog, upgrade transaction, release assets, and CLI runners.

The library is Bun-first. Node compatibility is deliberately limited to the
npm bootstrap.

## Validation

```bash
bun run typecheck
bun test
bun run build
bun run bundle
bun run binary
bun run binaries
```

Validation also covers compiled smoke behavior, Node-only bootstrap execution,
installer syntax, prohibited imports, exact assets, and xdocs metadata/tree/
doctor checks.
