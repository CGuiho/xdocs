---
name: xdocs-shared-agent-bootstrap-plan
purpose: Sequence implementation and verification of the plain-invocation agent bootstrap.
description: Executable plan for safe dual-tool global skill installation, repository instruction reconciliation, Cobra startup routing, tests, documentation, XDocs metadata, and local commits.
created: 2026-07-26
owner: xdocs-plans
flags:
  - approved
tags:
  - cli
  - go
  - agents
keywords:
  - startup bootstrap
  - Cobra root command
  - idempotence
  - atomic instruction update
  - dual-tool skill
---

# Shared Agent Bootstrap Implementation Plan

## Baseline

- Work from saved `main` at `xdocs/v0.8.1`; do not integrate the separate
  `xdocs/v0.9.0` tag as part of this unit.
- Reuse the embedded skill and `internal/agent` service. Keep Cobra as the only
  command router and keep foreground startup free of network work.
- Preserve the existing exact text welcome and root JSON shape.

## Units

1. Harden `internal/agent`.
   - Skip staged replacement when both canonical skill copies already match
     and no legacy path remains.
   - Parse the bounded instruction markers strictly and reject malformed or
     ambiguous state.
   - Prepare and validate all selected instruction files before committing any
     instruction write.
   - Add one bootstrap service operation that preflights instructions, ensures
     the global dual-tool skill, and atomically reconciles instructions.
2. Route only the plain root invocation through bootstrap.
   - Run bootstrap before the welcome renderer.
   - Keep flags, help/version flows, internal worker routes, all subcommands,
     data commands, explicit agent actions, upgrade, and uninstall excluded.
   - Add isolated command tests with injected working and home directories so
     validation never mutates real global agent paths.
3. Update the embedded instruction and skill guidance.
   - Mention `XDOCS.md` indexes, named descriptors, scanning, metadata-first
     discovery, and validation.
   - Update root help/user documentation and the owning command/agent XDocs
     descriptors.
4. Validate and review.
   - Run focused tests first, then formatting, module tidy/diff, all Go tests,
     vet, native build, eight-target artifact build/checksums, and XDocs
     metadata/tree/doctor checks.
   - Inspect the final diff for startup side effects and exclusion regressions.
   - Record exact evidence and make one-file local commits only.

## Acceptance gates

- A successful plain invocation leaves both global skills byte-identical to
  the embedded skill and the correct repository instruction targets canonical.
- A second invocation changes no managed file.
- Malformed marker state returns the filesystem-mutation exit class before a
  global skill target is created or changed.
- No documentation corpus command runs during bootstrap.
- No version, tag, release, publish, or push action occurs.
