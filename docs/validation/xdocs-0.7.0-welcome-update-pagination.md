---
name: xdocs-0.7.0-welcome-update-pagination-validation
purpose: Record reproducible XDocs 0.7.0 implementation and release evidence.
description: Validation ledger for welcome, bounded update handoff, pagination, Mirror YAML, builds, release assets, installers, and issue closure.
created: 2026-07-22
owner: xdocs-validation
flags: []
tags: [validation, cli, release]
keywords: [XDocs 0.7.0, welcome, worker, pagination]
---

# XDocs 0.7.0 Welcome, Update, And Pagination Validation

## Status

Complete. Local implementation, CI, publication, public installation, native
runtime, live catalog, and issue-closure validation passed.

## Required Evidence

| Check | Required result |
| --- | --- |
| `bun run typecheck` | Pass |
| `bun test` | Pass |
| `bun run build` | Pass |
| `bun run binary` | Pass |
| `bun run binaries` | Exactly twelve native binaries plus two `.md` agent assets |
| Native bare invocation | Deterministic welcome, no foreground network wait |
| Cold then warm invocation | Worker writes cache; later invocation warns |
| Worker process checks | One bounded worker, no recursive/persistent process |
| Upgrade list | Defaults to eight and navigates with `--page`/`--size` |
| JSON output | Schema version 2 and one valid JSON document |
| `xdocs doctor .` | Pass |
| `mirror config check` | Pass with `mirror.yaml` |
| Public installer/release | 0.7.0 installs and exactly fourteen assets exist |

## Current Evidence

- `bun run typecheck` passed.
- `bun test` passed all 79 tests and 383 assertions.
- `bun run build`, `bun run binary`, and `bun run binaries` passed.
- The release builder verified exactly twelve native binaries plus
  `guiho-s-xdocs.md` and `guiho-i-xdocs.md`.
- The compiled Windows x64 baseline binary passed welcome, version, and
  pagination-help smoke tests.
- An isolated compiled binary created `cache.json` on cold invocation, released
  its lease, and left zero XDocs processes.
- Live GitHub pagination returned schema version 2, requested page 1/size 3,
  three visible releases, twenty total releases, and the exact next command.
- Strict XDocs metadata, tree, and doctor validation passed with zero errors and
  zero warnings.
- `mirror config check --config mirror.yaml` passed.
- Static scans found no obsolete Mirror TOML filename and no protected
  production environment gate.
- [Publish run 30030108905](https://github.com/CGuiho/xdocs/actions/runs/30030108905)
  passed and created the public 0.7.0 release.
- The public release contains exactly fourteen assets: twelve native binaries
  plus `guiho-s-xdocs.md` and `guiho-i-xdocs.md`.
- Release notes contain only the exact `0.7.0` changelog section and no 0.6.7
  content.
- The public PowerShell installer installed and verified XDocs 0.7.0, both
  global skill copies, and project instructions.
- The exact public Bash installer installed and verified XDocs 0.7.0 on Linux
  x64; the installed Linux welcome passed.
- An installed cold invocation created cache version 0.7.0, released the lease,
  and left zero worker processes. A fresh simulated stable 0.7.1 cache displayed
  the expected welcome warning and upgrade command.
- Live installed JSON pagination returned schema version 2, default page 1,
  default size 8, exactly eight visible releases, and twenty-one total releases.
  Page 2/size 3 returned three releases with previous/next metadata and text
  rendered the exact next command.
- Evidence was posted to issues
  [#15](https://github.com/CGuiho/xdocs/issues/15#issuecomment-5061538257) and
  [#16](https://github.com/CGuiho/xdocs/issues/16#issuecomment-5061538669), then
  both issues were closed as completed.

## Readiness

Released and accepted. No known blocker or residual delivery risk remains.
