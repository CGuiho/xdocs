---
name: xdocs-background-update-worker-cpu-safety-validation
purpose: Preserve reproducible evidence that XDocs no longer creates recursive or persistent update workers.
description: Local, native, CI, release, and public verification for GitHub issue 14 and the XDocs 0.6.7 patch.
created: 2026-07-21
owner: xdocs-validation
flags: []
tags:
  - cli
  - validation
  - performance
keywords:
  - background update worker
  - process count
  - CPU saturation
  - lease recovery
---

# Background Update Worker CPU Safety Validation

## Summary

Local implementation and native process validation pass. Public release and CI
evidence will be added before
[CGuiho/xdocs#14](https://github.com/CGuiho/xdocs/issues/14) is closed.

## Reproduction

The 0.6.6 Windows native binary was started once with
`--check-updates-worker` using an isolated cache. Sampling showed a continuing
chain rather than termination: one matching worker at 100 ms, zero at 350 ms,
one again at 950 ms, and one at 2.4 seconds. The final matching process was
terminated. This proves replacement workers continued after earlier workers
exited.

The root cause was command routing. Citty interpreted the option-shaped hidden
worker name as an option, allowing the invocation to enter the ordinary root
lifecycle and schedule another detached worker.

## Local checks

| Check | Result |
| --- | --- |
| `bun run typecheck` | passed |
| `bun test source/self-management.spec.ts source/cli.spec.ts` | 23 passed, 0 failed, 129 expectations |
| `bun test` | 73 passed, 0 failed, 348 expectations |
| `bun run build` | passed |
| `bun run binary` | passed; compiled `bin/xdocs.exe` |
| `bun run binaries` | passed; exactly 12 native binaries plus `guiho-s-xdocs.md` and `guiho-i-xdocs.md` |
| Exact pre-Citty worker route | passed; no root output and no worker command in the Citty tree |
| 64 simultaneous schedulers | passed; exactly one spawn |
| Two simultaneous stale reclaimers | passed; exactly one spawn |
| Primary stale/corrupt/orphan lease recovery | passed |
| Mutation-guard stale/orphan recovery | passed |
| Hung fetch deadline | passed; the injected fetch received its abort signal within the bounded deadline and cleanup removed the lease |
| Ownership regression | passed; an old token did not remove a newer lease |
| Scheduler failure isolation | passed for filesystem and spawn failures |
| Cache path containing spaces | passed |
| 16-way native executable smoke | passed; every foreground process exited 0, maximum matching workers was 1, final workers was 0, cache existed, no primary/guard lock remained, and no process required forced cleanup |
| Old 0.6.6 reproduction cleanup | two remaining exact-path recursive test workers were terminated; five consecutive samples and the final query reported zero |
| Installed 0.6.6 chain cleanup | 32 exact `xdocs.exe --check-updates-worker` instances were terminated while the chain replaced them; maximum observed concurrently was 6, then 10 consecutive samples and the final query reported zero |
| `xdocs doctor source --format json` | valid; 0 errors, 0 warnings |
| `xdocs doctor docs/todo --format json` | valid after required companion metadata correction |
| `xdocs doctor docs/validation --format json` | valid after required companion metadata correction |
| `xdocs tree` | passed; source, TODO, and validation modules remained linked |

## Implementation evidence

- The exact internal flag is routed before Citty and runs only the worker.
- The foreground acquires an exclusive cache-scoped lease before spawning.
- Primary lease mutation is serialized by a short ownership-checked guard.
- Lease metadata is TypeBox-decoded and contains a unique token, PID, and ISO
  creation timestamp.
- The entire release-catalog check has a 15-second deadline and abort signal.
- Worker cleanup runs in `finally`; stale leases are recoverable after 30
  seconds.
- Scheduler errors resolve to `false` and never reject into a `void` caller.

## Pending release evidence

- Mirror plan/apply for patch 0.6.7.
- Main CI and protected publish workflows.
- Public release with exactly fourteen assets and version-only notes.
- Public install/upgrade smoke and final zero-process verification.

## Readiness

Testing. Local source, full-suite, build, documentation, and native process
gates are correct; remote release gates remain intentionally open.
