---
name: xdocs-shared-agent-bootstrap-todo
purpose: Define the shared agent-resource bootstrap performed by a plain xdocs invocation.
description: Captures the global dual-tool skill, repository instruction, safety, idempotence, testing, documentation, and release boundaries for startup bootstrap.
created: 2026-07-26
owner: xdocs-todo
flags:
  - implementation
tags:
  - cli
  - agents
  - bootstrap
keywords:
  - plain xdocs invocation
  - global skill installation
  - managed instructions
  - atomic writes
  - malformed markers
---

# Shared Agent Bootstrap

## Outcome

A successful, argument-free `xdocs` invocation establishes the shared XDocs
agent resources needed in any repository before printing the normal welcome.

## Required behavior

- Install or refresh the embedded `guiho-s-xdocs` skill globally in both
  `~/.agents/skills/guiho-s-xdocs` and
  `~/.claude/skills/guiho-s-xdocs`.
- Reconcile the bounded XDocs instruction block in both `AGENTS.md` and
  `CLAUDE.md` when both exist, the existing file when only one exists, or a new
  `AGENTS.md` when neither exists.
- Tell agents to use XDocs for structured documentation, `XDOCS.md` indexes,
  named `*.xdocs.md` descriptors, scanning, discovery, and validation.
- Preserve bytes outside the managed block and preserve each file's existing
  LF or CRLF convention.
- Use staged or atomic writes, validate all instruction targets before startup
  mutation, refuse missing, duplicated, out-of-order, or noncanonical managed
  markers, and make repeated invocations a no-op on disk.
- Keep the existing welcome and structured output contracts deterministic.

## Boundaries

- Bootstrap runs only for the plain root invocation. Help, version, developer
  help, explicit agent management, uninstall, upgrade, init, and data commands
  retain their own behavior.
- Bootstrap does not load project configuration, scan the repository, or
  mutate `XDOCS.md`, descriptors, or companion documents.
- Versioning, tagging, release creation, publication, and pushing are excluded
  from this implementation unit.

## Acceptance

- Unit tests cover both global skill destinations, both instruction-file
  routing, creation fallback, LF/CRLF preservation, external-content
  preservation, malformed-marker refusal before skill writes, command
  exclusions, and repeated-invocation no-op behavior.
- `gofmt`, `go mod tidy`, `go test ./...`, `go vet ./...`, the native build,
  the eight-target release build, checksum verification, and scoped/full XDocs
  checks pass or are reported with exact limitations.
- [Implementation plan](../plans/shared-agent-bootstrap.md)
- [Validation](../validation/shared-agent-bootstrap.md)
