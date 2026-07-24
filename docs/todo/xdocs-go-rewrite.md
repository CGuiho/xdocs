---
name: Rewrite XDocs CLI In Go
purpose: Define the outcome and completion signals for task 9 in TODO.md.
description: XDocs ships through a complete Go and Cobra runtime, Git-only versioning, and the standard 11-artifact release.
created: "2026-07-24"
owner: xdocs-todo
flags: []
tags:
  - todo
  - go
keywords:
  - XDocs Go rewrite
  - Git version
  - eleven assets
---

# Rewrite XDocs CLI In Go

## Todo Index

- Task: `9. Rewrite XDocs CLI In Go`
- Status: testing
- Index: [TODO.md](../../TODO.md)
- Implementation notes: [xdocs-go-rewrite-implementation.md](./xdocs-go-rewrite-implementation.md)

## Outcome

Users install and run XDocs as a small native Go executable with full domain,
agent, update, upgrade, help, configuration, and release behavior.

## Scope

### In scope

- Go/Cobra implementation of the complete XDocs catalog.
- Strict YAML and structured-data validation.
- Embedded agent resources.
- Bounded background update checks and safe self-upgrades.
- Native installers and exactly 11 release artifacts.
- Go CI, Git-only Mirror versioning, `xdocs/vX.Y.Z`, docs, tests, and release.

### Out of scope

- Rewriting the separate RunX repository.
- Deleting historical TypeScript source before Go parity is verified.
- npm or JSR publication from the Go release.
- New XDocs domain features unrelated to parity or Go reliability.

## Acceptance Signals

- The Go binary passes all domain, command, agent, update, and upgrade tests.
- All eight cross-builds succeed with `CGO_ENABLED=0`.
- The release contains exactly 11 checksum-verified assets.
- The installer succeeds without Bun or Node.
- Mirror reads and writes only Git with `xdocs/vX.Y.Z`.
- GitHub publishing has no manual approval environment.

## Dependencies And Context

- [Architecture](../architecture/xdocs-go-rewrite.md)
- [Version decision](../decisions/go-native-cli-and-git-version-tags.md)
- [Implementation plan](../plans/xdocs-go-rewrite.md)
- [Plan review](../reviews/plans/xdocs-go-rewrite-review.md)
- GUIHO Go CLI Engineer `guiho-s-0035-cli-engineer-go`.

## Watch-outs

- Foreground commands must never wait for update network calls.
- JSON stdout must not contain notices or progress.
- Windows replacement must happen after the running process exits.
- Do not use `package.json` as a version source or release input.

## After Finishing

Record implementation review and validation evidence, archive the completed
task through the TODO workflow, release the Git tag, verify public installers,
and close a matching issue only after acceptance is proven.
