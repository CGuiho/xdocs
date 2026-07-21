---
name: xdocs-background-update-worker-cpu-safety
purpose: Define the bounded non-recursive XDocs background update worker required by GitHub issue 14.
description: Acceptance contract for cache-scoped coalescing, timeouts, ownership-safe stale recovery, process-count validation, and release closure.
created: 2026-07-21
owner: xdocs-todo
flags: []
tags:
  - cli
  - reliability
  - performance
keywords:
  - background update worker
  - CPU saturation
  - cache lease
  - GitHub issue 14
---

# Bound The Background Update Worker

## Todo Index

- Task: `6. Bound Background Update Worker CPU Usage`
- Status: completed
- External: [CGuiho/xdocs#14](https://github.com/CGuiho/xdocs/issues/14)

## Outcome

Running `xdocs` may start one short-lived background check that refreshes
`~/.guiho/xdocs/cache.json`. It must never create a persistent or recursive
process chain, saturate CPU, block foreground commands, or leave an active
lease after success, failure, or timeout.

## Required behavior

- Route the exact internal worker invocation before Citty so the worker cannot
  enter the normal root lifecycle and spawn another worker.
- Coalesce simultaneous foreground invocations to at most one worker for the
  same cache directory.
- Bound the complete remote check to 15 seconds and abort its fetch when the
  deadline expires.
- Release the cache lease after success, remote failure, invalid data, or
  timeout.
- Reclaim primary and mutation leases after 30 seconds, including orphaned or
  corrupt lease directories.
- Use ownership tokens so an old suspended worker cannot remove a newer lease.
- Preserve the four-hour cache TTL and canonical
  `~/.guiho/xdocs/cache.json` location.
- Keep scheduler failures isolated from the foreground command.

## Acceptance signals

- The internal flag is absent from the Citty command tree and produces no root
  banner or normal startup scheduling.
- A 64-way scheduling test produces exactly one spawn.
- Concurrent stale reclaimers still produce exactly one spawn.
- Valid, corrupt, missing, and stale lease cases terminate deterministically.
- A never-resolving fetch is bounded and leaves no primary lease.
- A compiled native smoke test reaches zero matching worker processes after
  its bounded check.
- Typecheck, full tests, build, native build, xdocs validation, CI, the public
  patch release, and exact fourteen-asset validation pass before issue closure.

## Completion

XDocs 0.6.7 passed the local, native-process, CI, publish, exact fourteen-asset,
public installer, and public-binary concurrency gates. The public 16-way smoke
test observed at most one update worker, then zero, with a written cache and no
remaining lease directories.

## Operational recovery

Machines affected by an older release may stop the inherited recursive chain
once before upgrading:

```bash
pkill -f '[x]docs --check-updates-worker'
xdocs upgrade
```

Do not claim remote processes were stopped unless that host was actually
inspected and the command was verified there.
