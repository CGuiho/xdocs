---
name: xdocs-ignore-paths-and-frontmatter-validation
purpose: Record reproducible verification evidence for Git-aware ignores and frontmatter opt-outs.
description: Captures Go tests, native command smoke checks, XDocs health, review corrections, and the exact eleven-artifact portable build.
created: 2026-08-03
owner: xdocs-validation
flags:
  - passed
tags:
  - validation
  - configuration
  - frontmatter
keywords:
  - gitignore
  - ignore rules
  - frontmatter opt-out
  - eleven assets
---

# Ignore Paths And Frontmatter Validation

## Baseline And Scope

- Checkout: `C:\GUIHO\xdocs`.
- `git fetch --prune origin` and `git pull --ff-only origin main` completed
  before planning; the remote baseline was `origin/main` at `6f6e8e3`.
- Pull request 18 integrated reviewed head `4ee1f02` into `main` through merge
  commit `aa8c055`; the release-preparation commits build on that merge.
- `mirror.yaml` now enables changelog maintenance because the tag workflow
  requires an exact-version section for GitHub Release notes.
- The developer authorized a minor version apply, tag push, and public GitHub
  Release. Mirror planned `0.9.0 -> 0.10.0` and tag `xdocs/v0.10.0`.

## Functional Coverage

Automated tests verify:

- default, omitted, disabled, replaced, and cleared ignore configuration;
- strict rejection of unknown fields, invalid kinds, absolute or malformed
  globs, traversal, empty segments, current-directory segments, and any rule
  that does not explicitly set `frontmatter: false`;
- root and nested `.gitignore`, negation, directory rules, boundary-aware `**`,
  Windows case behavior, and ignored ancestors;
- ignored files, directories, descriptor references, raw invalid frontmatter,
  root index coverage, and descriptorless generate output do not leak;
- `scan.exclude` applies to explicitly scoped directories and descendants;
- README-style opt-outs remain discovered, listed in descriptor metadata,
  searchable through context, valid in doctor, and marked
  `frontmatterRequired: false`; and
- a scoped directory is not incorrectly matched by its own `.gitignore`.

## Go Verification

| Check | Result |
| --- | --- |
| `gofmt -w main.go cmd internal devops` | passed |
| `go mod tidy` plus `git diff --exit-code -- go.mod go.sum` | passed; module files unchanged |
| sequential `go test -count=1 -p 1 ./...` | passed for every package |
| `go vet ./...` | passed |
| `CGO_ENABLED=0 go build -trimpath -o bin/xdocs.exe .` | passed |
| PowerShell installer parse | passed |
| Git Bash `bash -n devops/install.sh` | passed |
| `git diff --check` | passed |

The shared Windows Go module-cache stat writer emitted non-fatal access-denied
warnings during some builds. A repository-local ignored `GOCACHE` and
`GOTMPDIR` prevented shared build-cache locking; all recorded commands returned
success.

## Native XDocs Verification

The newly built Windows AMD64 binary produced:

- strict metadata: 33 valid descriptors with documents included;
- README.md and AGENTS.md reported as `frontmatter=not-required` while remaining
  owned by and referenced from `xdocs-package`;
- doctor: valid, zero errors, zero warnings; and
- scan: 215 files, 33 directories, 63 Markdown documents, 33 covered
  directories, zero uncovered directories, and 34 xdocs files including the
  root index.

## Release-Matrix Verification

The pure-Go release builder ran with version `0.10.0`, commit metadata
`702dfb041ef8487144be3679b73cd655ee7c3b16`, and build date
`2026-08-03T00:55:46+02:00`. It produced exactly:

- eight native binaries for Linux AMD64/ARM64/ARMv7/ARMv6, Darwin AMD64/ARM64,
  and Windows AMD64/ARM64;
- `guiho-s-xdocs.zip`;
- `guiho-i-xdocs.md`; and
- `checksums.txt`.

The directory contained exactly eleven artifacts. All ten manifest entries
were independently recomputed with SHA-256 and matched. The native Windows
AMD64 binary reported `xdocs v0.10.0`, and both packaged skill version fields
reported `0.10.0`.

## Review Evidence

Independent review findings were corrected with regressions for scoped ignored
ancestors, raw invalid-frontmatter filtering, ignored root coverage,
descriptorless generation, Git glob edge behavior, and excluded descendants.
Both final re-reviews reported no findings. The accepted review is recorded in
`docs/reviews/implementation/ignore-paths-and-frontmatter-review.md`.

## Published Release Verification

- Mirror applied `0.9.0 -> 0.10.0` and pushed canonical tag
  `xdocs/v0.10.0`, which dereferences to exact validated release commit
  `1d353b79b73e23d7aeb73f670c60a2743039d1c6`.
- GitHub Actions run `30771328125` completed successfully. Its `Publish` and
  `Verify exact-version public Windows installer` jobs both passed.
- The stable public GitHub Release contains exactly the expected eleven assets
  and only the exact 0.10.0 changelog section as its description.
- The independently downloaded public checksum manifest validated
  `xdocs-windows-amd64.exe` as
  `2c2da7c1b58454d5dc8d5054d277b49bd8c7576d98c7b8536936ca9a8c5aab32`.
  That downloaded binary reported `xdocs v0.10.0`.
- Public release:
  `https://github.com/CGuiho/xdocs/releases/tag/xdocs/v0.10.0`.
