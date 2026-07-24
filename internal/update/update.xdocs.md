---
subject: xdocs-internal-update
description: Git-tag release discovery, SemVer ordering, cached notices, leases, and detached update workers.
parent: xdocs-internal
children: []
files:
  guard_unix.go: Crash-safe nonblocking Unix file lock for lease acquisition and stale takeover.
  guard_windows.go: Crash-safe nonblocking Windows file lock for lease acquisition and stale takeover.
  update.go: Strict cache reads, xdocs/vX.Y.Z catalog filtering, pagination, token-owned 30-second leases, and 15-second workers.
  detach_unix.go: Unix detached-process attributes.
  detach_windows.go: Windows detached-process flags.
  update_test.go: Tag namespace, SemVer, fresh-cache notice, stale-cache, coalescing, stale takeover, and token-safe lease release tests.
documents: {}
tags:
  - updates
  - background-worker
keywords:
  - xdocs/vX.Y.Z
  - cache
  - lease
  - SemVer
flags: []
status: stable
---

Network work is detached from foreground commands, bounded, coalesced, and
never recursive.
