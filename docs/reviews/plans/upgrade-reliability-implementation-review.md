---
name: XDocs Upgrade Reliability Implementation Plan Review
purpose: Verify that the upgrade reliability implementation plan is traceable, sequenced, testable, and safe to execute.
description: Reviews the xdocs issues 9 and 10 implementation plan against the approved design, repository constraints, failure recovery, documentation duties, and validation matrix.
created: 2026-07-15
flags:
  - approved
  - ready-for-execution
tags:
  - review
  - plan
  - reliability
keywords:
  - xdocs upgrade
  - plan readiness
  - rollback
  - Windows replacement
  - upgrade list
owner: xdocs-plan-reviews
---

# XDocs Upgrade Reliability Implementation Plan Review

## Verdict

Ready for execution.

## Findings

No blocker or high-severity finding remains.

- Medium, resolved in plan: A presenter-first rewrite could still hide a broken
  scheduled replacement. Unit 3 requires immediate canonical swap and exact
  absolute-path verification before Unit 4 renders success.
- Medium, resolved in plan: Cache state could get ahead of the installed binary.
  Units 3 and 8 explicitly prohibit cache mutation until verification succeeds.
- Medium, resolved in plan: GitHub pagination and SemVer handling could silently
  omit prereleases or later pages. Unit 2 requires complete pagination, later-page
  failure, deterministic deduplication, and channel/precedence coverage.
- Medium, resolved in plan: Recovery guidance could fail before target discovery.
  Unit 4 requires an explicit current-version repair fallback with a pinned target
  and a separately labeled optional stop command for every terminal outcome.
- Low, resolved in plan: Direct and package installers could drift from the CLI's
  asset/tag rules. Unit 5 gives them one exact compatibility contract and Unit 8
  validates all installation surfaces.

## Sequencing Risks

Contracts and pure discovery must precede transaction mutation. Presenters follow
the transaction so they cannot invent success, installers follow settled swap
semantics, and documentation follows verified behavior. The ordering prevents a
large CLI handler from owning network, filesystem, cache, and rendering decisions.

## Acceptance Criteria Review

Every unit names its goal, dependencies, expected files, data/cache/docs impact,
tests, acceptance criteria, and stop condition. The final matrix covers typecheck,
full tests, library and native builds, binary matrix, installers, recovery output,
Windows executable behavior, xdocs metadata/tree/doctor, and diff hygiene.

## TODO Alignment

The plan is linked to TODO task `3`, its task specification, the approved design,
and GitHub issues 9 and 10. It prevents completion before full validation and
prevents publishing, pushing, issue closure, or version changes in this delegated
worktree.

## First Executable Unit

Introduce the typed catalog, plan, event, result, list-envelope, and recovery
contracts plus pure SemVer/channel/asset/recovery helpers and focused tests.

## References

- [Implementation plan](../../../plans/upgrade-reliability-implementation.md)
- [Task specification](../../../todo/upgrade-reliability.md)
- [Approved design](../../../superpowers/specs/2026-07-15-upgrade-reliability-design.md)
- [TODO.md](../../../../TODO.md)
