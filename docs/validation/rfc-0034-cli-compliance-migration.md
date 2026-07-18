---
name: xdocs RFC 0034 CLI Compliance Migration Validation
purpose: Record reproducible evidence for the completed xdocs breaking migration.
description: Commands, results, skipped remote operations, residual risks, and readiness verdict.
created: 2026-07-18
owner: xdocs-validation
flags:
  - passed
tags:
  - validation
  - cli
keywords:
  - typecheck
  - tests
  - binaries
  - xdocs doctor
---

# xdocs RFC 0034 CLI Compliance Migration Validation

## Summary

All local completion-gate checks passed. The implementation is ready for
Mirror-managed versioning and push.

## Results

| Check | Result |
| --- | --- |
| `bun run typecheck` | Passed |
| `bun test` | Passed, 47 tests |
| `bun run build` | Passed |
| `bun run bundle` | Passed |
| `bun run binary` | Passed |
| `bun run binaries` | Passed; exact fourteen assets |
| Compiled banner/version/prompt/help/config smoke | Passed |
| Compiled latest/current-version upgrade dry-runs | Passed; nested `--version` routes to `upgrade` |
| Compiled cached-notice-before-banner ordering | Passed |
| Node bootstrap without Bun in PATH | Passed |
| Running Windows executable replacement | Passed |
| Prohibited core Node imports | Passed, zero |
| Exact release asset assertion | Passed |
| Installer regression/syntax | Passed |
| Repository-wide strict metadata/tree/doctor | Passed |
| `git diff --check` | Passed |

## Manual checks

- Verified no public shipping reference to the removed TOML, root prompt,
  plural agent, automatic mutation, old cache, or `macos` contracts.
- Verified the GitHub publish workflow compares the complete remote asset set
  with the exact fourteen generated files.
- Verified downstream TOML consumers are listed without cross-repository edits.

## Skipped operations

- npm/JSR package publication
- GitHub release creation/upload
- deployment
- real global skill installation
- live executable overwrite

These are intentionally outside this task.

## Residual risk

Remote hosting credentials and production publication were not exercised.
Local mocks, installer recovery tests, the Node bootstrap smoke test, compiled
native binaries, and workflow exact-set checks cover the implementation paths.

## Readiness

Ready for Mirror-managed versioning, per-file commits, and push.
