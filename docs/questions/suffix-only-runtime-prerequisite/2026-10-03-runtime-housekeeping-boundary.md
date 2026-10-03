---
name: Runtime Housekeeping Boundary
purpose: Record the reversible runtime decision for the authorized readiness prerequisite
description: Limits update scheduling and journal cleanup to the genuinely bare welcome while keeping routine data/help/version filesystem-preserving.
created: 2026-10-03
flags: [human-review-pending]
tags: [xdocs, runtime, decisions]
keywords: [issue-25, suffix-only, cache, upgrade-journal]
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# Runtime Housekeeping Boundary

## Question and Evidence

Which default boundary preserves project and global files during routine
readiness checks without removing the intended startup update check?
CLI Convention 0001 requires cached background checks on the argument- and
flag-free welcome only. Convention 0011 forbids implicit bootstrap/deletion
during routine suffix-only work. Previously `cmd/root.go` entered journal
cleanup and update scheduling for almost every explicit command.

## Decision

Remove automatic legacy-index cleanup entirely and remove bare agent bootstrap.
Gate existing cache notice, detached-worker handoff and upgrade-journal cleanup
on the actual root command with no changed flags. Data, help, version, explicit
actions and flagged root invocations skip it without a special disabling flag.
Keep explicit setup/resource mutations and existing documentation grants,
frontmatter denials and exclusions. Reports stay on stdout in readiness work.

An opt-out flag would leave the destructive default intact. Removing all startup
housekeeping would unnecessarily remove the bare-name update contract. The
selected gate is the smallest source change matching both conventions.

## Verification, Confidence and Reversibility

Commit `32b1476` and real filesystem tests cover regular legacy files, symlinks,
legacy-named directories, ordinary documents, configuration, skills and journals.
The bare welcome is explicitly not all-filesystem read-only; its existing runtime
state mutations remain documented. Confidence: high for tested Linux behavior;
foreign runtime behavior needs matching-platform execution.

The source change is reversible through a new reviewed commit; no history rewrite,
secret/config changes or global installation is needed. Reintroducing routine
deletion/bootstrap would violate the present acceptance contract.

- Human review: pending.
- Task: [Issue #25](https://github.com/CGuiho/xdocs/issues/25).
- Scope and authority: [runtime prerequisite](../../todo/suffix-only-runtime-prerequisite.md).
