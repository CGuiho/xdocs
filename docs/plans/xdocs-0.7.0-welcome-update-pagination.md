---
name: xdocs-0.7.0-welcome-update-pagination-plan
purpose: Sequence the approved XDocs 0.7.0 implementation and release work.
description: Executable plan for the welcome, worker handoff, release pagination, Mirror YAML migration, validation, and issue closure.
created: 2026-07-22
owner: xdocs-plans
flags: []
tags: [implementation-plan, cli, release]
keywords: [XDocs 0.7.0, welcome, update cache, pagination]
---

# XDocs 0.7.0 Welcome, Update, And Pagination Plan

## Objective

Implement issues #15 and #16 without weakening the CPU-safety guarantees shipped
in 0.6.7.

## Execution Units

1. Replace the literal one-line greeting with a pure deterministic welcome renderer.
2. Decode the cache before rendering and display an update only when SemVer proves
   the cached stable release is newer.
3. Await the local scheduler through lease acquisition and detached spawn; never
   await its remote fetch.
4. Restrict automatic update selection to stable compatible releases.
5. Add TypeBox-compatible public pagination types and a pure post-sort slicer.
6. Add Citty `--page` and `--size` options with defaults 1 and 8 and maximum 100.
7. Render page navigation consistently in text, Markdown, and JSON schema version 2.
8. Rename the legacy Mirror TOML configuration to `mirror.yaml`, remove obsolete automation fields,
   and use a portable schema association.
9. Remove the protected publishing environment while retaining typecheck, tests,
   build, exact-version notes, and exact-fourteen-asset verification.
10. Update user docs, skill, XDocs metadata, changelog, and release evidence.
11. Run typecheck, all tests, build, binary/matrix builds, native smoke, XDocs doctor,
    Mirror config/plan checks, and implementation review.
12. Apply version 0.7.0 with Mirror, publish, verify public installation, comment
    evidence on issues #15/#16, and close only after acceptance succeeds.

## Non-Goals

- No Go rewrite.
- No persistent update daemon.
- No foreground network request.
- No compatibility alias for `--per-page`.
- No truncation of the internally fetched GitHub catalog.

## Rollback

If release validation fails, do not close either issue. Correct source on `main`,
prepare a new Mirror patch, and leave failed release evidence visible.
