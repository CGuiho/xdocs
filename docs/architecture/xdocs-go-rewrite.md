---
name: XDocs Go Rewrite Architecture
purpose: Define the target architecture for replacing the XDocs Bun runtime with a native Go and Cobra CLI.
description: Accepted architecture for Go modules, strict YAML, XDocs domain services, agent resources, updates, upgrades, installers, CI, releases, and Git-native versioning.
created: "2026-07-24"
owner: xdocs-architecture-docs
flags:
  - accepted
tags:
  - architecture
  - go
  - cobra
keywords:
  - xdocs go rewrite
  - eleven artifacts
  - git version source
---

# XDocs Go Rewrite Architecture

## Scope

XDocs becomes a native Go CLI. The existing TypeScript implementation remains
in the repository as migration reference, but it is no longer used by CI,
installers, release builds, versioning, or the shipping executable.

## Runtime

- Module: `github.com/CGuiho/xdocs`
- Toolchain: Go 1.26.5, language floor Go 1.23.
- Router: one testable Cobra command tree.
- YAML: `go.yaml.in/yaml/v3` with `KnownFields(true)` and explicit semantic
  validation.
- Core APIs: Go standard library for files, HTTP, JSON, hashing, processes,
  archives, and atomic writes.
- Release builds: `CGO_ENABLED=0`.

`main.go` only embeds agent resources, receives linker build information,
constructs dependencies, executes Cobra, and maps typed errors to exit codes.
All domain behavior lives under `internal/`.

## Command Contract

The Go tree preserves `init`, `scan`, `generate`, `merge`, `tree`, `list`,
`meta`, `context`, `doctor`, `agent`, `upgrade`, and `uninstall`. Every command
supports `-h`/`--help`, `--help-tree`, `--help-tree-depth`, and `--help-docs`.
Only root exposes `-v`/`--version`. With no arguments, XDocs prints
`Hello Windows - xdocs v<version>`.

Common persistent flags are `--cwd`, `--config`, `--format`, and `--verbose`.
Domain flags and JSON shapes remain compatible with XDocs 0.7.x unless the Go
contract requires a breaking release-platform change.

## Domain Packages

- `internal/config`: exact explicit/project/global `xdocs.yaml` precedence,
  strict decode, defaults, and initialization.
- `internal/xdocs`: frontmatter, descriptors, companion documents, discovery,
  scan, tree, metadata, context ranking, doctor, generation, merge, and list.
- `internal/agent`: embedded skill, instruction, and prompt catalog; atomic
  dual-tool installation and idempotent instruction blocks.
- `internal/update`: local cached notices, bounded detached release checks, and
  typed GitHub release normalization.
- `internal/upgrade`: target selection, checksums, staged replacement,
  rollback/recovery, release listing, and uninstall.
- `internal/help`: command-tree and Markdown help generated from the live Cobra
  tree.

## Configuration And State

Configuration resolution is:

1. `--config`;
2. `./xdocs.yaml`;
3. `~/.guiho/xdocs/xdocs.yaml`.

Global cache and worker state live only in `~/.guiho/xdocs/`. Foreground
commands never wait for network I/O. Corrupt cache or lease state is treated
as recoverable local state.

## Release And Versioning

Mirror reads and writes versions through Git only:

- project name: `xdocs`;
- source: `git`;
- output: `git`;
- tag: `xdocs/vX.Y.Z`.

The first Go milestone is `xdocs/v0.8.0`. Linker flags embed version, commit,
build date, and exact build target.

The GitHub release contains exactly 11 assets: eight pure-Go binaries,
`guiho-s-xdocs.zip`, `guiho-i-xdocs.md`, and `checksums.txt`.

## CI And Approval

CI uses official Go setup, formatting, tidy-diff, tests, vet, native smoke,
cross-build, checksum, installer, and asset-count checks. The publish job has
no GitHub Environment or manual approval gate and triggers only on
`xdocs/v*` tags.

## Security And Reliability

- Strict external-data decoding and semantic validation.
- Finite HTTP timeouts and response-size bounds.
- No foreground network request.
- Checksums before installation or replacement.
- Atomic Unix replacement and staged Windows replacement.
- JSON stdout contains one JSON document and no progress output.
- Instruction mutations preserve all unmanaged content.

## Migration Boundary

TypeScript files and package metadata are retained only as historical and API
migration references. `package.json` is not a version source, release input, or
runtime dependency. Removing the legacy TypeScript tree is a separate cleanup
after Go parity is proven.
