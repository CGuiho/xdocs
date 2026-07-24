---
name: XDocs Go Rewrite Validation
purpose: Record reproducible local and remote evidence for the native Go rewrite and xdocs/v0.8.0 release.
description: Validation report for Go tests, cross-builds, metadata, installers, Mirror, exact assets, GitHub publication, and issue closure.
created: "2026-07-24"
owner: xdocs-validation
flags:
  - release-pending
tags:
  - validation
  - go
keywords:
  - XDocs 0.8.0
  - eleven assets
  - Git-only version
---

# XDocs Go Rewrite Validation

## Summary

Local implementation and release-candidate validation passed. Remote
publication, public exact-version installation, and issue closure remain the
final release gates.

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
| Exact-version changelog extraction | Passed; only `0.8.0` section |
| `mirror config check` | Passed |
| `mirror version plan 0.8.0 --format json` | Passed with Git-only output and `xdocs/v0.8.0` |

## Release Candidate

The builder produced the eight documented Linux, Darwin, and Windows
executables plus `guiho-s-xdocs.zip`, `guiho-i-xdocs.md`, and
`checksums.txt`.

Exactly eleven files were present. Every payload checksum matched
`checksums.txt`; the skill ZIP contained `guiho-s-xdocs/SKILL.md`; and the
Windows AMD64 candidate reported `xdocs v0.8.0`.

## Manual Checks

- `mirror.yaml` has `source: git`, only `git` output, and
  `{name}/v{version}` tags.
- `package.json` and `jsr.json` were not edited and are not version inputs.
- publish CI has no `environment` key or protected approval gate.
- GitHub Release creation uses the exact extracted version section, never the
  full changelog.

## Failures Or Blockers

None locally after the independent findings-first review and final hardening
pass.

## Pending Remote Checks

- main CI after push;
- tag publish workflow;
- exact eleven GitHub Release assets;
- exact `0.8.0` release description;
- public Linux and Windows exact-version installation;
- matching GitHub issue closure.

## Residual Risks

GitHub service availability and external runner behavior remain outside local
control. Publication is not complete until the remote checks above pass.

## Readiness

Ready to commit and publish `xdocs/v0.8.0`.

## References

- [Implementation review](../reviews/implementation/xdocs-go-rewrite-review.md)
- [Plan](../plans/xdocs-go-rewrite.md)
- [Task](../todo/xdocs-go-rewrite.md)
