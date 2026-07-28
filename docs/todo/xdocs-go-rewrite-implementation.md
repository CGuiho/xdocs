---
name: XDocs Go Rewrite Implementation Notes
purpose: Preserve execution progress, decisions, deviations, validation, and release handoff for task 9.
description: Long-running implementation record for the native Go rewrite.
created: "2026-07-24"
owner: xdocs-todo
flags: []
tags:
  - implementation
  - go
keywords:
  - XDocs Go rewrite
  - validation
  - release handoff
---

# XDocs Go Rewrite Implementation Notes

## Summary

Implementation began on 2026-07-24 under the repository-owned
`guiho-s-0035-cli-engineer-go` skill.

## Decisions

- Go and Cobra own the shipping runtime and command tree.
- TypeScript remains only as migration reference.
- Mirror source/output is Git and tags are `xdocs/vX.Y.Z`.
- The release follows the exact 11-artifact Go contract.
- The publish workflow remains approval-free.

## Progress Log

- Read the existing XDocs instructions, TODO, configuration, CLI help catalog,
  TypeScript tests, source modules, workflows, RunX rewrite reference, and Go
  CLI Engineer contract.
- Confirmed the existing XDocs publish workflow already had no GitHub
  protected-environment approval gate.
- Implemented the native Go/Cobra runtime, strict YAML, documentation domain,
  embedded agent resources, bounded updates, transactional upgrades, portable
  release builder, installers, and Go workflows.
- Resolved implementation-review findings for dated release notes, Windows
  process waiting, paginated/deduplicated release discovery, stale leases,
  unquoted YAML dates, and slash-tag recovery URLs.
- Passed all Go tests and vet, strict metadata, warnings-as-errors doctor,
  installer syntax, all eight cross-builds, exact eleven assets, checksums,
  embedded skill ZIP, native version smoke, and the Git-only Mirror plan.
- Reopened the task on 2026-07-28 to reconcile the published
  `xdocs/v0.9.0` release line with the independently completed plain-invocation
  agent-bootstrap commits on local `main`. The integration must preserve both
  histories and may not rewrite the published tag.

## Current State

Testing. Merge commit `a21b02a` preserves the published `xdocs/v0.9.0`
history and the completed bootstrap history as separate parents. Integrated
local validation passed; normal push and remote-main CI remain before archival.

## Verification Evidence

The legacy Bun suite was captured as a migration baseline. It reported 80
passes and three timing failures in background-worker/download-progress tests;
the Go suite replaces these timing-sensitive tests with injected clocks,
launchers, and HTTP clients.

The 2026-07-28 integration reran the complete Go test and vet suites, native
Windows help and idempotent bootstrap smokes, all eight cross-builds, exact
eleven-asset and checksum checks, both installer syntax checks, strict XDocs
metadata, the full tree, and doctor with zero errors and warnings. The public
0.9.0 Windows binary was independently checksum-verified and reported
`xdocs v0.9.0`.

## Handoff

Do not archive this task until the integrated main push, CI, and Mirror patch
decision are recorded.
