---
name: XDocs Go Rewrite Validation
purpose: Record reproducible local and remote evidence for the native Go rewrite, xdocs/v0.9.0 release, and integrated main history.
description: Validation report for Go tests, cross-builds, metadata, installers, Mirror, exact assets, GitHub publication, and issue closure.
created: "2026-07-24"
owner: xdocs-validation
flags: []
tags:
  - validation
  - go
keywords:
  - XDocs 0.9.0
  - eleven assets
  - Git-only version
---

# XDocs Go Rewrite Validation

## Summary

The native Go implementation and public `xdocs/v0.9.0` release passed. The
published release line and the later plain-invocation bootstrap line were
merged non-destructively and the integrated implementation passed refreshed
local validation on 2026-07-28.

## Scope

- native Go and Cobra CLI;
- strict YAML and XDocs metadata;
- agent resources;
- cached updates and self-upgrade safety;
- Git-only Mirror version planning;
- installers, workflows, exact notes, and exact eleven assets.

## Commands Run

| Check | Result |
| --- | --- |
| `gofmt -w .` | Passed |
| `go mod tidy` plus module diff check | Passed; no module drift |
| `go test -count=1 ./...` | Passed for all Go packages |
| `go vet ./...` | Passed |
| Windows update and upgrade package cross-compilation | Passed |
| Windows AMD64 cross-build | Passed |
| Native banner, version, command-tree, and embedded prompt smokes | Passed |
| `go run . meta . --documents --strict --format json` | Passed |
| `go run . tree --format json` | Passed |
| `go run . doctor --warnings-as-errors --format json` | Passed; zero errors and zero warnings |
| PowerShell installer parse | Passed |
| Git Bash `sh -n devops/install.sh` | Passed |
| Installer architecture and transaction contract tests | Passed in `devops/installers_test.go` |
| Unix replacement success and rollback tests | Passed |
| Concurrent stale lease and upgrade-lock takeover tests | Passed with exactly one winner |
| Strict JSON EOF and empty-array compatibility tests | Passed |
| Agent dual-target rollback/backup preservation tests | Passed |
| Exact-version changelog extraction | Passed for the published release workflow |
| `mirror config check` | Passed |
| Public `xdocs/v0.9.0` release | Passed; stable release with exactly eleven authored assets |
| Public Windows AMD64 checksum and version | Passed; checksum matched and binary reported `xdocs v0.9.0` |
| 2026-07-28 integrated `go test -count=1 ./...` | Passed for every package |
| 2026-07-28 integrated `go vet ./...` | Passed |
| 2026-07-28 integrated native help/bootstrap smoke | Passed twice without rewriting current resources |
| 2026-07-28 integrated eight-target build and checksums | Passed; exactly eleven files and ten checksum entries |
| 2026-07-28 strict metadata/tree/doctor | Passed; 32 valid descriptors, zero errors, zero warnings |

## Release Candidate

The builder produced the eight documented Linux, Darwin, and Windows
executables plus `guiho-s-xdocs.zip`, `guiho-i-xdocs.md`, and
`checksums.txt`.

Exactly eleven files were present. Every payload checksum matched
`checksums.txt`; the skill ZIP contained `guiho-s-xdocs/SKILL.md`; and the
Windows AMD64 candidate reported `xdocs v0.9.0`.

## Manual Checks

- `mirror.yaml` has `source: git`, only `git` output, and
  `{name}/v{version}` tags.
- `package.json` and `jsr.json` were not edited and are not version inputs.
- publish CI has no `environment` key or protected approval gate.
- GitHub Release creation uses the exact extracted version section, never the
  full changelog.

## Failures Or Blockers

The first integrated Go run was blocked by sandbox access to the default Go
cache and left upgrade-test lock contention. An isolated rerun with dedicated
temporary and cache directories passed every package and vet check. A native
bootstrap smoke accidentally retained the real Windows home because PowerShell
variables are case-insensitive; the existing resources were current and their
timestamps remained unchanged across both invocations. No repository or
production state was changed by that mistake.

## Pending Remote Checks

- integrated main CI after the normal push.

## Residual Risks

GitHub service availability and external runner behavior remain outside local
control. Publication is not complete until the remote checks above pass.

## Readiness

Ready to push the integrated main history. Task archival waits for that push,
CI, and the Mirror patch-plan decision; no new version is authorized here.

## References

- [Implementation review](../reviews/implementation/xdocs-go-rewrite-review.md)
- [Plan](../plans/xdocs-go-rewrite.md)
- [Task](../todo/xdocs-go-rewrite.md)
