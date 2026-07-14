---
name: xdocs Citty CLI Migration Implementation
purpose: Preserve execution progress, implementation decisions, validation evidence, and handoff state for TODO task 2.
description: Tracks the full replacement of xdocs handwritten CLI parsing and routing with Citty across source, tests, documentation, and native distribution.
created: 2026-07-14
flags:
  - completed
tags:
  - cli
  - migration
  - implementation
keywords:
  - xdocs
  - Citty
  - argument parsing
  - command routing
  - validation evidence
owner: xdocs-todo
---

# xdocs Citty CLI Migration Implementation

## Summary

Execution record for [TODO task 2](../../TODO.md) and the approved
[Citty migration plan](../plans/citty-cli-migration.md).

## Decisions

- Citty will be the only parser and router; no handwritten compatibility parser
  will remain.
- Repository search found no non-CLI consumer of the public parser helpers, so
  `parseArgs`, `stringFlag`, `booleanFlag`, `listFlag`, and `XDocsParsedArgs`
  will be removed and documented as an intentional library API break.
- Existing equal-version self-upgrade work in the dirty worktree is preserved and
  integrated into the new upgrade command adapter and tests.

## Progress Log

- `2026-07-14T22:14:24+02:00` - Baseline passed: typecheck, 112 tests/293
  expectations, library build, Node-target bundle, and current-platform native
  binary compile.
- `2026-07-14T22:14:24+02:00` - Migration plan written and reviewed as ready for
  execution.
- `2026-07-14T22:43:55+02:00` - Citty command tree, focused command adapters,
  hidden/default routes, contextual validation, and intentional parser API
  removal completed.
- `2026-07-14T22:43:55+02:00` - Canonical docs, changelog, bundled skill,
  descriptors, tests, and distribution artifacts brought into alignment.

## Verification Evidence

- `bun run typecheck` passed.
- `bun test` passed with 103 tests, 334 expectations, and no failures.
- `bun run build` and `bun run bundle` passed; the Node-target bundle contains
  the Citty command implementation.
- `bun run binary` passed for the current Windows target.
- `bun run binaries` passed for all 12 macOS, Linux, and Windows release assets.
- Windows native smoke checks passed for help, version, contextual unknown-command
  errors, and clean JSON scan output outside the source runtime.
- Bun and Node imported the built library successfully, and the removed parser
  helpers were absent from the public API.
- `bun pm pack --ignore-scripts` produced a 124-file, 94.59 KB package archive;
  the no-source packed launcher delegated to its vendored native binary and
  reported `xdocs 0.5.2`.
- Strict metadata and doctor checks passed for `source`, `docs/plans`,
  `docs/reviews`, and `docs/todo`; the whole xdocs tree remained valid. The
  whole-repository doctor retained 36 pre-existing warnings in untouched legacy
  documents and prompts, with no errors.

## Handoff

Migration complete. Publishing, versioning, tagging, and committing remain
separate actions and were not performed by this implementation task.

## References

- [Task specification](citty-cli-migration.md)
- [Migration plan](../plans/citty-cli-migration.md)
- [Plan review](../reviews/plans/citty-cli-migration-review.md)
