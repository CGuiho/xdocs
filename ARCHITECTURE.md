---
name: xdocs-architecture
purpose: Explain the native runtime, command, configuration, agent-resource, upgrade, and release architecture of xdocs.
description: Technical architecture for the Go and Cobra XDocs CLI.
created: 2026-06-01
owner: xdocs-package
flags: []
tags:
  - architecture
  - cli
  - go
keywords:
  - Go
  - Cobra
  - YAML
  - native binary
  - Git version
---

# XDocs Architecture

## Runtime boundary

XDocs is a native Go CLI. `main.go` is the only executable entrypoint and
constructs one Cobra command tree from `cmd/`. Domain behavior lives under
`internal/`; command adapters handle parsing and presentation without becoming
a second catalog or business-logic layer.

The shipping runtime has no Bun, Node, npm, pnpm, yarn, TypeScript, or C
dependency. Release builds set `CGO_ENABLED=0`. The legacy `source/` and package
metadata remain only as migration history and are not part of builds,
installers, version discovery, CI, or publishing.

## Entrypoint and command catalog

- `main.go` embeds the skill and prompt catalog and injects version, commit,
  build date, and target metadata.
- `cmd/root.go` owns the root command, persistent flags, lifecycle hooks, error
  codes, and hidden worker routes.
- `cmd/domain.go` adapts structured-documentation services.
- `cmd/agent.go` exposes explicit skill, instruction, and prompt operations.
- `cmd/upgrade.go` exposes release discovery, upgrade, and uninstall behavior.
- `cmd/help.go` derives tree and Markdown help from the live Cobra tree.

The public commands are `init`, `scan`, `generate`, `merge`, `tree`, `list`,
`meta`, `context`, `doctor`, `agent`, `upgrade`, and `uninstall`. Cobra’s
generated help and completion commands are hidden so the live catalog is the
documented catalog.

## Strict configuration

`internal/config` resolves configuration in this order:

1. explicit `--config`;
2. `<cwd>/xdocs.yaml`;
3. `~/.guiho/xdocs/xdocs.yaml`.

`go.yaml.in/yaml/v3` decodes exactly one YAML document with unknown fields
rejected. Typed structs and semantic validation enforce schema 1, named
`*.xdocs.md` descriptors, `prompt` or `auto` AI mode, and safe exclusion names.

## Structured-documentation domain

`internal/xdocs` owns descriptor parsing, metadata-only discovery, containment
trees, minimal reading-context recommendations, health checks, generation,
merge, and listing. Descriptors use YAML frontmatter and named `*.xdocs.md`
filenames. Same-directory Markdown companion documents are mapped by the
descriptor’s `documents` field.

Domain packages return typed values and errors. Text, Markdown, and JSON
rendering occurs at the command boundary. Data commands never mutate agent
files.

## Embedded agent resources

`go:embed` packages `skills/guiho-s-xdocs/**` and `prompts/*.md` into every
binary. `internal/agent` applies resources atomically and idempotently.

Skill actions always address both supported destinations, either globally or
under `--local` project scope:

- `.agents/skills/guiho-s-xdocs`
- `.claude/skills/guiho-s-xdocs`

Instruction actions reconcile a bounded XDocs block in `AGENTS.md`,
`CLAUDE.md`, or both. Prompt actions read the four embedded prompt resources.

## Background update lifecycle

Foreground commands only read a strictly decoded local cache. A notice is
shown only when the cache is fresh, the entry is valid, and the cached stable
SemVer is newer than the running version.

An expired invocation may acquire one cache-scoped lease and detach a hidden
worker. The worker:

- cannot schedule another worker;
- is bounded to 15 seconds;
- coalesces simultaneous invocations;
- treats leases older than 30 seconds as stale;
- writes cache state atomically;
- never makes foreground command success depend on network availability.

Only GitHub releases tagged `xdocs/vX.Y.Z` or a valid SemVer prerelease in that
namespace enter the Go catalog. Legacy package-style tags are ignored.

## Self-upgrade

`internal/upgrade` resolves a target release and the exact compatible asset,
downloads it with a bounded HTTP client, verifies its entry in
`checksums.txt`, stages the candidate, and replaces the executable.

Unix uses same-directory atomic rename and rollback. Windows launches the
hidden replacement helper after the running process exits. A token-owned
transaction lock prevents overlapping upgrades, unique sibling paths isolate
each transaction, and the helper records verification and checked rollback in
an atomic completion journal surfaced by the next normal invocation. Failures
return categorized exit codes and preserve an exact-version installer recovery
command.

## Version authority

Git is the only version authority. Mirror reads and writes Git versions with
the canonical tag:

```text
xdocs/vX.Y.Z
```

`package.json` and `jsr.json` are neither inputs nor outputs. Linker metadata
injects the tag-derived version into release binaries. The embedded skill’s
version is updated deliberately for the release and validated with the source.

## Distribution

`devops/build-binaries.go` produces eight compatibility-first binaries:

- Linux AMD64 v1, ARM64 v8.0, ARMv7, and ARMv6;
- Darwin AMD64 v1 and ARM64 v8.0;
- Windows AMD64 v1 and ARM64 v8.0.

It also creates `guiho-s-xdocs.zip`, `guiho-i-xdocs.md`, and
`checksums.txt`. The build fails unless the output directory contains exactly
these eleven assets.

The Bash and PowerShell installers select one compatible binary, download the
checksum manifest and skill ZIP, verify SHA-256, install under
`~/.local/bin`, validate the binary and both skill version fields, stage the
binary and both skill copies as one rollback-capable transaction, reconcile
project instructions, and verify the executable.

Publish CI runs directly from `xdocs/v*` tags without a protected-environment
approval gate. It validates Go, builds exactly eleven assets, extracts only the
matching `CHANGELOG.md` version section, creates or updates the GitHub release,
asserts the exact remote asset set, and performs an immutable-commit installer
acceptance test.

## Exit discipline

- `0`: success
- `1`: unexpected operational failure
- `2`: usage or validation failure
- `3`: configuration failure
- `4`: remote release or network failure
- `5`: installation, upgrade, or filesystem mutation failure
- `130`: interruption

JSON commands write one document to stdout. Human diagnostics use stderr where
needed so structured output remains machine-readable.
