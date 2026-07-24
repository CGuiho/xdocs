---
subject: xdocs-internal-upgrade
description: Checksum-verified self-upgrade planning, download, replacement, rollback, and recovery.
parent: xdocs-internal
children: []
files:
  guard_unix.go: Crash-safe nonblocking Unix file lock for serialized stale transaction takeover.
  guard_windows.go: Crash-safe nonblocking Windows file lock for serialized stale transaction takeover.
  upgrade.go: Release resolution, bounded download, checksum verification, candidate staging, and upgrade plan.
  journal.go: Atomic detached-upgrade completion records surfaced by the next normal invocation.
  lock.go: Token-owned exclusive upgrade transactions with bounded stale recovery.
  replace_unix.go: Unix atomic executable replacement and rollback.
  replace_unix_test.go: Native Unix success, exact-version verification, and rollback tests.
  replace_windows.go: Windows staged replacement helper, exact verification, checked rollback, and durable completion reporting.
  upgrade_test.go: Target selection, service failures, dry runs, concurrency locks, scheduled handoff, and completion-journal contract tests.
documents: {}
tags:
  - self-upgrade
keywords:
  - checksums
  - atomic replacement
  - rollback
flags: []
status: stable
---

Every mutation is planned before download and preserves an exact-version
recovery path on failure. Detached Windows replacement records verification and
rollback outcomes so the next ordinary invocation reports the final result.
