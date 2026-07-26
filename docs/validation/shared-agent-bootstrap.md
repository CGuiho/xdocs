---
name: xdocs-shared-agent-bootstrap-validation
purpose: Record reproducible evidence for the plain-invocation shared agent bootstrap.
description: Captures focused and full Go verification, release-matrix checks, isolated native smoke evidence, XDocs health, exclusions, and deferred release work.
created: 2026-07-26
owner: xdocs-validation
flags:
  - passed
tags:
  - validation
  - cli
  - agents
keywords:
  - plain invocation
  - global skill bootstrap
  - managed instruction block
  - no-op idempotence
  - eleven assets
---

# Shared Agent Bootstrap Validation

## Baseline and scope

- Checkout: `C:\GUIHO\xdocs`
- Branch: `main` at `8e4cd71`, tracking `origin/main`
- Saved baseline: `xdocs/v0.8.1`
- Newer separate tag observed: `xdocs/v0.9.0` at `09374fc`
- The 0.9.0 tag was inspected only for context and was not merged, rebased,
  cherry-picked, tagged, published, or pushed.
- `mirror.yaml` has `agents.write_changelog: false`, so this implementation did
  not edit `CHANGELOG.md`.

## Functional coverage

Automated tests verify:

- the exact plain welcome remains unchanged after successful bootstrap;
- the embedded skill is installed globally for both `.agents` and `.claude`;
- existing `AGENTS.md` and `CLAUDE.md` are both reconciled;
- `AGENTS.md` is created when neither instruction file exists;
- unmanaged bytes, file modes, and LF/CRLF conventions are preserved;
- already-current skills and instruction files retain their forced historical
  modification timestamps on a repeated invocation;
- missing, duplicated, noncanonical, and reversed markers are refused;
- all selected instruction targets are preflighted before any instruction
  write, and bootstrap marker failure occurs before global skill mutation; and
- version, help, explicit agent, scan, and uninstall dry-run paths do not enter
  bootstrap.

The bootstrap service does not call configuration, scan, generation, merge,
tree, metadata, context, or doctor services.

## Go verification

| Check | Result |
| --- | --- |
| `go test ./internal/agent ./cmd` | passed |
| `gofmt -l main.go cmd internal devops` | passed; no files printed |
| `go mod tidy` plus `git diff --exit-code -- go.mod go.sum` | passed; module files unchanged |
| `go test -count=1 ./...` | passed for all packages |
| `go vet ./...` | passed |
| `CGO_ENABLED=0 go build -trimpath -o bin/xdocs.exe .` | passed |

## Release-matrix verification

`go run ./devops/build-binaries.go --version 0.8.1 --commit 8e4cd71f48fb56b963486f8e50333124854e28ae`
with build date `2026-07-26T00:00:00Z` passed and produced exactly:

- eight native binaries;
- `guiho-s-xdocs.zip`;
- `guiho-i-xdocs.md`; and
- `checksums.txt`.

The directory contained exactly eleven assets. All ten manifest entries were
recomputed with SHA-256 and matched. The Windows AMD64 artifact ran natively:
`--version`, `--help`, and the plain bootstrap passed. The plain smoke used an
isolated home and repository beneath ignored `bin/`; both global skill files
and the fallback `AGENTS.md` were present afterward. Linux, Darwin, ARM,
Windows ARM64, and other foreign targets were build-only and were not executed.

An initial attempt to place the isolated smoke directory beneath `C:\tmp` was
blocked by the workspace sandbox before setup completed. The same smoke was
rerun beneath ignored `bin/` and passed; this was an environment-path failure,
not a product failure.

## XDocs verification

The newly built native binary ran with background update checks disabled.

| Check | Result |
| --- | --- |
| strict metadata for `cmd` | passed, zero errors |
| doctor for `cmd` | passed, zero errors/warnings |
| strict metadata for `internal/agent` | passed, zero errors |
| doctor for `internal/agent` | passed, zero errors/warnings |
| strict metadata for `docs/todo` | passed, zero errors |
| strict metadata for `docs/plans` | passed, zero errors |
| strict metadata for `skills/guiho-s-xdocs` | passed, zero errors |
| strict metadata for `docs/validation` | passed, zero errors |
| doctor for `docs/validation` | passed, zero errors/warnings |
| `xdocs tree` | passed with the complete repository hierarchy |
| full `xdocs doctor . --format json` | valid, zero errors/warnings |

## Readiness and deferred work

The implementation is locally validated and ready for integration review. It
is an externally visible feature, so the GUIHO SWE version decision is
`minor`; Mirror planning/application is deliberately deferred because this
saved `main` remains on 0.8.1 while public 0.9.0 exists separately, and the
user did not authorize integration, versioning, tagging, releasing,
publishing, or pushing.
