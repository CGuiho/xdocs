---
name: XDocs Upgrade Reliability
purpose: Define the expected outcome, constraints, and completion signals for TODO task 3.
description: Specifies reliable observable self-upgrade, complete release listing, exact recovery guidance, and hardened installation paths for xdocs issues 9 and 10.
created: 2026-07-15
flags:
  - testing
tags:
  - cli
  - reliability
  - release
keywords:
  - xdocs upgrade
  - GitHub issue 9
  - GitHub issue 10
  - upgrade list
  - recovery command
owner: xdocs-todo
---

# XDocs Upgrade Reliability

## Summary

Repair xdocs self-upgrade so the command visibly plans and streams its work,
installs and verifies the canonical executable before returning, restores the old
binary on failure, lists the complete release catalog, and always provides an
exact pinned reinstall command plus a separate optional process-stop command.

## Todo Index

- Task: `3. Make Self-Upgrade Reliable and Recoverable`
- Status: testing
- Index: [TODO.md](../../TODO.md)
- Implementation notes: [upgrade-reliability-implementation.md](./upgrade-reliability-implementation.md)

## Outcome

Installed native users can trust `xdocs upgrade` to finish or roll back before it
returns, observe every long-running phase, recover with a copy-paste exact-version
installer, and inspect all stable and prerelease versions through `upgrade list`.

## Scope

### In scope

- Complete paginated SemVer release catalog with channels, dates, assets, current,
  and latest-stable markers.
- Immutable upgrade plan, streamed events, and stable text/Markdown/JSON outputs.
- Immediate same-filesystem canonical swap, exact verification, rollback, locking,
  interrupted transaction recovery, post-verification cache commit, and deferred
  backup deletion only.
- Exact pinned installer and optional process-stop guidance after every outcome.
- Direct PowerShell/Bash and package installer hardening.
- Windows-native, transaction, catalog, output, installer, and recovery tests.
- Help, README, DOCS, skill, changelog, TODO, and xdocs descriptor alignment.

### Out of scope

- Project version mutation, release publishing, tag creation, issue closure, or a
  new shared cross-repository upgrade package.
- Automatic process termination.
- Uninstall redesign beyond preserving compatible shared utilities.

## Acceptance Signals

- The complete plan and `Downloading...` appear before the asset body wait.
- `xdocs upgrade` returns success only after the absolute canonical executable
  reports the exact target version; failure restores the previous executable.
- Cache state changes only after exact canonical verification.
- Every outcome includes an exact-version install command before a separate safe
  optional process-stop command, including a labeled current-version repair when
  discovery fails.
- `xdocs upgrade list` includes every valid paginated release, newest SemVer first,
  with channel, date, assets, current, and latest-stable information.
- Text, Markdown, and JSON outputs pass ordering and schema tests.
- Typecheck, tests, builds, native matrix, installer smokes, Windows behavior, and
  xdocs metadata/tree/doctor validation pass or have an isolated environment-only
  limitation recorded without concealing product failure.

## External Trackers

- GitHub issue `CGuiho/xdocs#9`: https://github.com/CGuiho/xdocs/issues/9
- GitHub issue `CGuiho/xdocs#10`: https://github.com/CGuiho/xdocs/issues/10

## Related Files

- [Upgrade reliability design](../superpowers/specs/2026-07-15-upgrade-reliability-design.md) - Approved architecture and behavior contract.
- [Implementation plan](../plans/upgrade-reliability-implementation.md) - Executable units and validation gates.
- [Plan review](../reviews/plans/upgrade-reliability-implementation-review.md) - Readiness and risk review.
- [Implementation notes](upgrade-reliability-implementation.md) - Progress and validation evidence.

## Dependencies and Context

- Preserve the existing Citty command architecture and `0.6.0-alpha.0` history.
- Use Bun for dependency, test, build, and native executable workflows.
- Keep release/version operations behind their separate Mirror gate.

## Watch-outs

- The running Windows image may keep the renamed backup open; this affects only
  cleanup, not installing the new canonical path.
- Do not update the cache or report success before absolute-path verification.
- Do not silently return partial release pages or compare prereleases numerically
  with ad hoc parsing.
- Recovery commands must pin the full prerelease version and quote paths safely.

## References

- [TODO.md](../../TODO.md)
- [Approved design](../superpowers/specs/2026-07-15-upgrade-reliability-design.md)
