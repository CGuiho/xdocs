---
name: XDocs Upgrade Reliability Implementation Plan
purpose: Sequence the approved self-upgrade reliability design into executable, independently verifiable units.
description: Defines implementation order, ownership, acceptance criteria, tests, documentation duties, and stop conditions for xdocs issues 9 and 10.
created: 2026-07-15
flags:
  - approved
  - executable
tags:
  - implementation
  - cli
  - reliability
  - release
keywords:
  - xdocs upgrade
  - GitHub issue 9
  - GitHub issue 10
  - Windows executable replacement
  - upgrade list
owner: xdocs-plans
---

# XDocs Upgrade Reliability Implementation Plan

## Summary

Execute TODO task `3. Make Self-Upgrade Reliable and Recoverable` from the
approved upgrade reliability design. The implementation keeps Citty as the sole
router, separates release discovery from mutation, streams one typed event
contract to text and Markdown presenters, buffers the same events for JSON, and
installs the canonical executable synchronously before returning.

## Traceability

- Task index: [TODO.md](../../TODO.md), task `3`
- Task specification: [upgrade reliability](../todo/upgrade-reliability.md)
- Approved design: [upgrade reliability design](../superpowers/specs/2026-07-15-upgrade-reliability-design.md)
- GitHub issues: [#9](https://github.com/CGuiho/xdocs/issues/9) and [#10](https://github.com/CGuiho/xdocs/issues/10)
- Canonical package documentation: [DOCS.md](../../DOCS.md)

## Baseline and Constraints

- Preserve the existing Citty migration and `0.6.0-alpha.0` commits.
- Keep native execution Bun-only and do not add a Node.js runtime dependency.
- Do not edit generated `library/`, `bin/`, `bundle/`, or `vendor/` output.
- Do not publish, bump, tag, push, or close issues in this implementation unit.
- Cache state may be committed only after the canonical executable reports the
  exact target version.
- Only backup deletion may be deferred on Windows; installation may not be.

## Unit 1: Define Typed Catalog, Plan, Event, Result, and Recovery Contracts

- Goal: Add the immutable public contracts consumed by discovery, transaction,
  presentation, tests, and library callers.
- Dependencies: Approved design and passing baseline.
- Expected files: `source/types.ts`, `source/guiho-xdocs.ts`, focused tests.
- Data/schema impact: Adds schema version 1 upgrade and list envelopes; cache
  schema remains backward compatible.
- Cache impact: None in this unit.
- Documentation impact: Update source descriptors after behavior is stable.
- Tests/checks: Type-level and pure helper tests for SemVer normalization,
  channel classification, asset compatibility, and recovery command quoting.
- Acceptance criteria:
  - Contracts exactly represent the design's plan, events, outcomes, errors,
    recovery, releases, and list envelope.
  - Domain helpers do not write to stdout or read mutable CLI state.
- Stop condition: Stop if a contract would require a mutable `latest` recovery
  target or an untyped presenter-only decision.

## Unit 2: Implement the Complete Release Catalog and Upgrade Planner

- Goal: Fetch every GitHub release page, normalize and deduplicate xdocs tags,
  sort valid SemVer values newest first, select compatible assets, and construct
  the exact immutable upgrade plan before downloading an asset body.
- Dependencies: Unit 1.
- Expected files: `source/self-management.ts`, colocated focused specs.
- Data/schema impact: GitHub API input is validated into repository-local types.
- Cache impact: Latest checks may read catalog data but do not claim installs.
- Documentation impact: Catalog behavior documented in Unit 7.
- Tests/checks: Pagination boundaries, malformed pages, later-page failure,
  stable/alpha/beta/rc/other channels, duplicate tags, dates, assets, and SemVer
  precedence including numeric prereleases and build metadata.
- Acceptance criteria:
  - Requests use `per_page=100` and follow `Link: rel=next` until exhausted.
  - A partial later-page failure fails instead of returning incomplete data.
  - `upgrade list` can identify current and latest stable releases.
- Stop condition: Stop if GitHub responses cannot be mapped deterministically to
  exact tag URLs and compatible assets.

## Unit 3: Implement the Verified Upgrade Transaction

- Goal: Download, validate, preflight, rename/swap, verify, cache, clean, and roll
  back through an event-emitting transaction with one-owner locking/journaling.
- Dependencies: Units 1-2.
- Expected files: `source/self-management.ts`, focused transaction specs.
- Data/schema impact: A same-directory transaction journal records canonical,
  temporary, backup, and target paths.
- Cache impact: Cache writes begin only after exact canonical verification.
- Tests/checks: Event ordering, gated body streaming, invalid download, preflight
  mismatch, rename failure, canonical mismatch, rollback/rollback failure,
  cache ordering, lock contention, and interrupted journal recovery.
- Acceptance criteria:
  - Windows renames the running canonical executable to backup and puts the
    candidate at the canonical path before verification and return.
  - Failed replacement or verification restores the previous canonical file.
  - Backup cleanup may be scheduled; canonical replacement never is.
- Stop condition: Stop on any platform where the code could report `upgraded`
  without executing the absolute canonical path and matching the exact target.

## Unit 4: Implement Streaming Presenters and Recovery Guidance

- Goal: Render the same plan, events, terminal envelope, and recovery guidance in
  text, Markdown, and JSON while preserving clean machine stdout.
- Dependencies: Units 1-3.
- Expected files: `source/commands/upgrade.ts`, `source/cli.ts`, `source/help.ts`,
  focused command/output specs.
- Data/schema impact: Fixed schema version 1 envelopes.
- Cache impact: None.
- Tests/checks: Captured output ordering before gated awaits, every terminal
  outcome, exactly one JSON document, Markdown without ANSI, fallback-current
  recovery, and exact stable/prerelease pinned commands.
- Acceptance criteria:
  - Plan and `Downloading...` are flushed before network waits.
  - All outcomes show installer guidance before the separate optional stop
    command; discovery failure visibly labels a current-version repair fallback.
  - Failed and rolled-back transactions produce a nonzero CLI result.
- Stop condition: Stop if JSON progress would be mixed with human stdout or if
  a failure path can omit exact pinned recovery guidance.

## Unit 5: Harden Direct and Package Installers

- Goal: Make every installation path use unique temporary files, native and
  version validation, canonical swap, exact final verification, rollback,
  shadowing warnings, and reliable cleanup.
- Dependencies: Unit 3 transaction semantics are settled.
- Expected files: `devops/install.ps1`, `devops/install.sh`,
  `scripts/install-package.ts`, focused installer tests/scripts.
- Data/schema impact: None.
- Cache impact: Installers do not mutate upgrade cache.
- Tests/checks: Exact stable/prerelease tags, asset fallback, paths with spaces,
  download/validation/swap/verification failures, rollback, cleanup, and package
  vendor path verification.
- Acceptance criteria:
  - `-Version`/`--version` pins an exact tag and verifies exact output.
  - Existing destination remains usable after any failed install.
  - Package installer follows the same exact asset/tag/version contract.
- Stop condition: Stop if an installer overwrites the canonical destination
  before candidate validation or cannot restore the previous destination.

## Unit 6: Add Windows-Native and Command-Level Regression Coverage

- Goal: Prove the executable rename model and user-visible ordering on Windows,
  with portable transaction coverage for Linux/macOS CI.
- Dependencies: Units 2-5.
- Expected files: colocated `source/*.spec.ts`, installer smoke fixtures, CI only
  if current workflows cannot run the focused tests.
- Data/schema impact: None.
- Cache impact: Verify no cache change before canonical verification.
- Tests/checks: Keep a real temporary executable running, rename it, install a
  real target at the canonical path, verify before return, defer only backup
  deletion, roll back a mismatch, and execute the printed PowerShell installer
  against a temporary installation directory where feasible.
- Acceptance criteria:
  - Tests distinguish immediate canonical installation from scheduled cleanup.
  - Output tests prove plan and phase lines appear before awaited work.
  - Catalog tests prove every paginated release is represented in SemVer order.
- Stop condition: Do not substitute mocked rename-only coverage for the available
  Windows-native behavior test.

## Unit 7: Align Documentation, TODO, Skill, Help, and Descriptors

- Goal: Make every shipping and repository-local documentation surface match the
  implemented contract and recorded validation state.
- Dependencies: Units 1-6 behavior is stable.
- Expected files: `README.md`, `DOCS.md`, `CHANGELOG.md`,
  `skills/guiho-s-xdocs/SKILL.md`, `TODO.md`, task/implementation notes,
  `source/help.ts`, and affected `*.xdocs.md` descriptors.
- Data/schema impact: Document fixed JSON and list envelopes.
- Cache impact: Document post-verification cache ordering.
- Tests/checks: Search for scheduled replacement claims, mutable recovery targets,
  partial list behavior, and stale output examples.
- Acceptance criteria:
  - Help and docs explain immediate replacement, list ordering/channels, phase
    streaming, recovery commands, fallback-current behavior, and cleanup.
  - Descriptors list each significant changed implementation/document file.
  - TODO task status reflects evidence and is not completed prematurely.
- Stop condition: Do not mark task `completed` until Unit 8 succeeds.

## Unit 8: Full Validation and Handoff

- Goal: Prove the source, library, launcher, installer, and native binary paths
  are ready for a release PR.
- Dependencies: Units 1-7.
- Expected files: Implementation note and validation report only when useful.
- Tests/checks:
  - `bun run typecheck`
  - `bun test`
  - `bun run build`
  - `bun run binary`
  - `bun run binaries`
  - focused installer/recovery smoke tests
  - strict metadata for touched scopes
  - `xdocs doctor`, `xdocs tree`, and `git diff --check`
- Acceptance criteria:
  - All feasible commands pass; any environment-only limitation is isolated with
    exact evidence and does not conceal a product failure.
  - Working tree contains only intended source/docs changes and ignored generated
    artifacts remain unedited.
  - Coherent commits are ready for the parent agent to push and open a PR.
- Stop condition: Do not version, tag, publish, push, open or merge a PR, or close
  issues from this delegated implementation worktree.

## First Executable Unit

Run Unit 1: introduce the typed contracts and pure SemVer/catalog/recovery helpers,
then prove them with focused tests before mutation code changes.
