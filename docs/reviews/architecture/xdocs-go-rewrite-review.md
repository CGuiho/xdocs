---
name: XDocs Go Rewrite Architecture Review
purpose: Review the XDocs Go rewrite architecture before execution.
description: Readiness review covering command parity, strict data boundaries, background work, upgrades, artifacts, CI, and Git-only versioning.
created: "2026-07-24"
owner: xdocs-architecture-reviews
flags: []
tags:
  - review
  - architecture
keywords:
  - ready for planning
  - xdocs go
---

# XDocs Go Rewrite Architecture Review

## Verdict

Ready for planning.

## Findings

No blockers remain. The architecture names one command router, deterministic
configuration precedence, every domain boundary, agent embedding, local-only
startup, staged upgrade behavior, the exact release matrix, and the required
Git tag contract.

## Risks

- Domain parity is broad; tests must cover outputs, invalid metadata, filters,
  context ranking, and tree integrity.
- Windows replacement cannot overwrite the running process and must be tested
  independently from Unix replacement.
- Cross-compilation is build evidence only; CI must identify which artifacts
  receive native smoke tests.
- The historical TypeScript code must not accidentally remain in the runtime,
  CI, installer, or release path.

## Planning Readiness

The plan must sequence domain parity before upgrades and release automation,
and it must make the 11-asset and `xdocs/vX.Y.Z` contracts executable tests.

## References

- [Architecture](../../architecture/xdocs-go-rewrite.md)
- [Version decision](../../decisions/go-native-cli-and-git-version-tags.md)
