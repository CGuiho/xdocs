---
name: XDocs Upgrade Reliability Implementation
purpose: Preserve implementation progress, decisions, validation evidence, and handoff state for TODO task 3.
description: Tracks execution of the reliable self-upgrade, complete catalog, recovery guidance, installer hardening, documentation, and verification work.
created: 2026-07-15
flags:
  - completed
tags:
  - cli
  - reliability
  - implementation
keywords:
  - xdocs upgrade
  - transaction
  - rollback
  - validation evidence
owner: xdocs-todo
---

# XDocs Upgrade Reliability Implementation

## Summary

Execution record for [TODO task 3](../../TODO.md) and the approved
[upgrade reliability plan](../plans/upgrade-reliability-implementation.md).

## Decisions

- Canonical installation is synchronous and verified; only deletion of the old
  renamed backup may be deferred.
- Text and Markdown stream typed events while JSON emits one buffered envelope.
- Recovery always pins an exact target; pre-plan discovery failure uses a visibly
  labeled current-version repair fallback.
- Catalog parity is repository-local for this priority repair; no shared package
  is introduced across RunX, Mirror, and xdocs.

## Progress Log

- `2026-07-15` - Approved design converted into an executable plan and reviewed
  as ready with no blocker or high-severity findings.
- `2026-07-15` - Added the complete paginated SemVer release catalog, compatible
  asset selection, fixed list envelope, and exact recovery command generation.
- `2026-07-15` - Added a lock/journal-aware verified transaction with preflight,
  immediate canonical swap, rollback, post-verification cache, and deferred backup
  cleanup only.
- `2026-07-15` - Integrated streamed text/Markdown plans and phases, one-document
  JSON, complete list tables, pinned recovery, direct installers, package installer,
  help, README, DOCS, skill, changelog, and descriptors.
- `2026-07-18` - Independent review found and fixed backup destruction on rollback
  failure, unbounded executable verification, pre-plan recovery omissions,
  ambiguous journal cleanup, explicit-version fallback regression, cross-platform
  magic acceptance, downgrade behavior, and missing Windows CI coverage.
- `2026-07-18` - Added a Windows-only real-running-executable replacement test,
  explicit asset fallback, pre-plan recovery, downgrade, ambiguous journal, and
  verification-timeout regression coverage.
- `2026-07-18` - Added executable PowerShell/Bash installer fixtures that compile
  an exact prerelease binary, install into a path containing spaces, and verify
  the canonical installed version without mutating the developer's PATH.
- `2026-07-18` - Final review added verified target recovery after backup cleanup,
  terminal package-installer rollback failures, deterministic future-version dry
  runs, downgrade-specific presentation, scheduled-cleanup assertions, and direct
  execution of generated recovery commands through PowerShell, Git Bash, and Bash.
- `2026-07-19` - Issue #9 acceptance audit removed stable-only and output-page
  truncation from `upgrade list`, exposed full tags and exact custom channels,
  added explicit compatible-asset state, matched the required pre-download human
  plan, and added canonical-swap obstruction coverage.
- `2026-07-19` - Issue #10 acceptance audit standardized the required
  exact-version recovery wording and added every-outcome presenter assertions;
  existing installer integration executes the generated stable Windows command
  from PowerShell and Git Bash and the generated prerelease POSIX command from
  Bash.

## Verification Evidence

- Catalog/recovery focused tests passed: 5 tests, 23 expectations.
- Transaction focused tests passed: 4 tests, 14 expectations.
- Full suite passed after the transaction commit: 112 tests, 371 expectations.
- Repository TypeScript check passes through the installed TypeScript 6 compiler.
- Package-installer standalone TypeScript check passes.
- PowerShell installer parses as a valid script block.
- Git Bash validates `devops/install.sh` with `bash -n`.
- Strict source metadata passed after the catalog and transaction modules.
- `git diff --check` passes.
- Issue #9 focused validation passes: 30 tests, 171 expectations across CLI,
  catalog, transaction, Windows-running-executable, and human-output suites.
- Live GitHub Releases validation returned all 14 published releases, including
  `0.6.0-alpha.0`, in both aligned text and one-document JSON; channels were
  `alpha` and `stable`, and every Windows x64 row reported compatible-asset
  state.
- Issue #10 focused validation passes: 34 tests and 218 expectations across
  presenters, JSON CLI output, transaction envelopes, stable/prerelease recovery
  generation, and executable native installer commands.
- Post-review repository and standalone package-installer TypeScript checks pass
  through the installed TypeScript 6 compiler.
- The final focused Bun invocation reached 0 tests because Bun returned `EPERM`
  while reading all five requested spec files and the linked-worktree tsconfig;
  this is an execution-environment failure, not a test assertion result.
- Post-review Bun tests/build/native binaries remain pending because sandboxed Bun
  cannot read the linked `C:\tmp` worktree. The new Windows CI job is present in
  the worktree but has not run until the branch can be pushed.

## Handoff

Implementation and repository-local acceptance validation are complete on
`main`. Final issue closure waits for the authorized patch release so the
published native binary can receive a post-release smoke test.

## References

- [Task specification](upgrade-reliability.md)
- [Implementation plan](../plans/upgrade-reliability-implementation.md)
- [Plan review](../reviews/plans/upgrade-reliability-implementation-review.md)
- [Approved design](../superpowers/specs/2026-07-15-upgrade-reliability-design.md)
