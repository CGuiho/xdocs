---
name: Use Go Native XDocs And Git Version Tags
purpose: Record the accepted XDocs runtime and version-source decision.
description: XDocs ships as a Go Cobra CLI and uses xdocs/vX.Y.Z Git tags as its only version source and output.
created: "2026-07-24"
owner: xdocs-decisions
flags:
  - accepted
tags:
  - decision
  - go
  - versioning
keywords:
  - xdocs v0.8.0
  - git source
  - package json
---

# Use Go Native XDocs And Git Version Tags

## Status

Accepted by the developer on 2026-07-24.

## Context

XDocs 0.7.x ships a Bun-compiled TypeScript CLI and derives versions from
`package.json`. The developer requires a complete native Go rewrite and
explicitly requires that `package.json` no longer participate in versioning.

## Decision

XDocs ships through Go, Cobra, strict YAML structs, and the GUIHO Go CLI
Engineer 11-artifact contract. Mirror uses `git` as both version source and
output with project name `xdocs` and tag template `{name}/v{version}`.

## Alternatives Considered

- Continue Bun/TypeScript: rejected because it does not satisfy the native Go
  rewrite.
- Keep `package.json` as Mirror source: rejected explicitly by the developer.
- Use `vX.Y.Z` without the project prefix: rejected because the required format
  is `name/vX.Y.Z`.
- Delete all TypeScript immediately: deferred; retaining it as reference lowers
  migration risk without making it a runtime or release dependency.

## Consequences

- Go linker metadata derives from Git.
- GitHub workflows and release discovery recognize `xdocs/vX.Y.Z`.
- npm and JSR publication are outside the Go release path.
- Existing `@guiho/xdocs@X.Y.Z` tags remain historical and are not rewritten.
- The first Go release is a pre-1.0 minor transition.

## Reversal Or Revisit Conditions

Revisit only if Mirror gains a dedicated Go source file contract or the
developer changes the tag namespace. Do not reintroduce `package.json` as a
version source without a new accepted decision.

## References

- [Go rewrite architecture](../architecture/xdocs-go-rewrite.md)
- [Implementation plan](../plans/xdocs-go-rewrite.md)
