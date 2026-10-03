---
name: Suffix-Only Runtime Prerequisite
purpose: Define the separately authorized XDocs runtime boundary needed for readiness
description: Tracks issue 25, filesystem preservation, source validation and the independent build-review gate.
created: 2026-10-03
flags: [in-progress]
tags: [xdocs, runtime, agent-readiness]
keywords: [suffix-only, XDOCS.md, housekeeping, stdout]
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# Suffix-Only Runtime Prerequisite

## Todo Index

- Task: `12. Preserve Non-Descriptor Files During Routine Workflows`
- Status: in progress
- Index: [TODO.md](../../TODO.md)
- GitHub project item: [Issue #25](https://github.com/CGuiho/xdocs/issues/25)
- GitHub component: `xdocs`
- Project: [GUIHO #2](https://github.com/users/CGuiho/projects/2)
- Policy prerequisite: [Issue #24](https://github.com/CGuiho/xdocs/issues/24)

## Outcome and Scope Waiver

Parent explicitly authorized bounded owning-tool source reconciliation under
`/tmp/opencode/2026-10-03-readiness-tool-prerequisite-contract.md`, XDocs only,
Mode:dnd. This waives a full new planning cycle for this specific prerequisite.
It is separate from native operating policy and the existing CLI-convention
migration task. Read actual GUIHO Convention 0011, 0002, 0007 and CLI 0001.

Routine data/help/version/descriptor workflows preserve every non-suffix project
file, including legacy `XDOCS.md`, ordinary bodies/headers, AGENTS/CLAUDE and YAML
configuration. Remove automatic legacy deletion and bare agent bootstrap. Keep
data commands free of implicit update scheduling/upgrade-journal cleanup, reports
on stdout, and explicit init/agent/upgrade actions accurately documented.
Preserve all existing allowlists, frontmatter opt-ins/denials and exclusions.

## Acceptance Signals

- Actual project and isolated home/runtime file-set, byte, mode and file-time
  snapshots prove safe data/help/version commands, including failure exits.
- Negative old-deletion and housekeeping fixtures demonstrate that the checks
  detect non-suffix mutations rather than approving a deleted legacy index.
- Named descriptor maintenance is an agent-authored, explicitly authorized
  suffix-only edit, followed by read-only checks; report generation never becomes
  an implicit descriptor writer or escapes the configured policy.
- Relevant Go tests and vet pass; source/help/docs agree with the real boundary.
- Task binary is built only after checks with source commit, hash, command and
  embedded build provenance. No global binary replacement before new independent
  review, no publication/Mirror bump and no push in this child.
- Issue remains OPEN/Testing with Project membership, Component and Status
  readback; local helpers mirror the same state. No family certification.

## Initial Readback and Context Gaps

Live GraphQL confirms issue #25 OPEN, Project #2 item
`PVTI_lAHOBUk1ds4AULOgzg-Xbs4`, Component `xdocs` (`d907addf`) and In Progress
(`47fc9ee4`). Fresh worktree was clean `main` at remote-equal `a4f6e6dd`.
No local MEMORY/rules or current configuration JSON Schema exists; strict typed
Go decoding/semantic validation is the actual schema contract. Required
`guiho-s-0035-cli-engineer-go` is unavailable in this runtime; actual CLI 0001,
own instructions and Go patterns supply the scoped engineering guidance.
