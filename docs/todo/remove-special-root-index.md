---
name: remove-special-root-index
purpose: Remove the special XDOCS.md repository index from the xdocs product contract.
description: Defines invocation-time deletion, init and discovery cleanup, documentation alignment, validation, and the 0.10.1 patch release.
created: 2026-08-16
owner: xdocs-todo
flags: []
tags:
  - cli
  - documentation-model
  - compatibility
keywords:
  - XDOCS.md
  - legacy root index
  - xdocs init
  - invocation cleanup
  - patch release
---

# Remove The Special XDOCS.md Root Index

## Status

- State: testing
- Started: `2026-08-16T14:58:10Z`
- Testing: `2026-08-16T16:25:47Z`
- Executing plan: `XD-ROOT-01` in
  `docs/plans/remove-special-root-index.md`
- Approved planning base: `93cdafb`
- Reviewed implementation head: `0e763bb5febb8ddf025375db783683b91168e4e5`

## Requested Outcome

`XDOCS.md` is no longer part of the xdocs document model. `xdocs init` must not
create it. Every user-facing xdocs invocation must idempotently delete an
existing `XDOCS.md` from the effective project directory before performing the
requested command behavior.

## Behavior Contract

1. `xdocs.yaml` remains configuration and named `*.xdocs.md` descriptors remain
   the structured documentation source.
2. `xdocs init` creates only missing configuration and performs its existing
   agent-skill setup. Text and JSON output no longer report a root-index action.
3. Plain root, domain, agent-management, upgrade, uninstall, help, developer
   help, and root-version invocations remove `<effective-cwd>/XDOCS.md` before
   their user-facing behavior.
4. `--cwd` selects the cleanup directory. An invocation using `--cwd` must not
   delete `XDOCS.md` from the process's original directory.
5. A missing legacy file is a silent success. Deletion emits no ordinary text
   or JSON output.
6. A regular file or symbolic link may be removed. A directory named
   `XDOCS.md` must not be recursively removed; cleanup fails with the existing
   mutation/filesystem exit category.
7. Hidden update-worker and Windows-replacement commands are internal process
   protocols, not user-facing project commands, and must not widen cleanup to
   an inherited or unrelated working directory.
8. Invalid syntax that prevents Cobra from resolving a user-facing command or
   effective `--cwd` is outside the cleanup guarantee. Standard help and root
   version remain inside it.
9. Discovery, metadata, tree, scan, list, generate, merge, context, and doctor
   no longer recognize a special root-index file or grant root coverage merely
   because it exists. Direct package callers may see a surviving `XDOCS.md` as
   an ordinary plain Markdown companion document.
10. Historical changelog, review, and validation records retain accurate
    descriptions of old releases. Current documentation, embedded resources,
    prompts, tests, and repository instructions must describe only the new
    model.

## Scope

- Cobra startup and cleanup behavior in `cmd/`.
- Removal of init and scan/discovery special cases.
- Unit and command-level regression tests.
- Current public documentation, bundled skill, prompt, instruction template,
  and owning xdocs descriptors.
- Deletion of the tracked repository `XDOCS.md`.
- Review, validation, Git delivery, and Mirror patch release `0.10.1`.

## Non-Goals

- Moving descriptor metadata into `xdocs.yaml`.
- Renaming or removing named `*.xdocs.md` descriptors.
- Rewriting historical release notes or archived evidence.
- Changing agent bootstrap, update-worker networking, upgrade replacement, or
  the eleven-asset release matrix beyond required wording/tests.

## Lifecycle Waivers

Feature brainstorming, requirements writing, new architecture, architecture
review, database, authentication, frontend, backend, cache, and cloud phases
are intentionally waived. The user supplied the complete behavior decision;
the change is confined to the existing Go CLI and documented xdocs model.

## Acceptance Criteria

- No user-facing xdocs invocation creates `XDOCS.md`.
- Every valid user-facing command, standard help, developer help, and root
  version deletes the file from the effective cwd when present.
- Cleanup is silent and idempotent, honors `--cwd`, and refuses recursive
  directory deletion.
- Scan and tree coverage depend on named descriptors, not `XDOCS.md`.
- Live code, tests, README, `DOCS.md`, skill, prompts, managed instruction text,
  repository instructions, and current design documentation contain no claim
  that `XDOCS.md` is required or created.
- The tracked root `XDOCS.md` is removed.
- Formatting, tests, vet, native build, strict xdocs validation, the exact
  eleven-artifact release build, implementation review, and final validation
  pass.
- Mirror plans and applies `0.10.0 -> 0.10.1`; the tag-triggered GitHub Release
  completes with exactly eleven checksum-valid assets and installer acceptance.
- No production deployment, traffic, DNS, database, or secret mutation occurs.

## Evidence To Record

- Luna executor branch, worktree, base/head commits, PR, changed paths, checks,
  and deviations.
- Main-agent implementation review tied to the exact implementation head.
- Final validation commands and results.
- Mirror plan/apply output, tag target, workflow result, release assets,
  checksums, and Windows AMD64 version/help smoke.
