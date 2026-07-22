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

Local implementation validation passed. Public release validation is pending
the coordinated Mirror release.

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

## Readiness

Ready for coordinated version preparation. Public release assets, release notes,
installers, 0.7.0 update lifecycle, and GitHub issue closure remain pending.
