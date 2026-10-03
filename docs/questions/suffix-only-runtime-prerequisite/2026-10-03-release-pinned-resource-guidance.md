---
name: Release-Pinned Resource Guidance
purpose: Preserve the bounded release exception and stale packaged guidance for review
description: Records why this runtime prerequisite updates the instruction template and source docs without modifying independently versioned skill/prompt artifacts.
created: 2026-10-03
flags: [human-review-pending]
tags: [xdocs, agent-resources, decisions]
keywords: [issue-25, metadata.version, Mirror, 0.12.0]
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# Release-Pinned Resource Guidance

## Question and Evidence

May this no-version-bump prerequisite also rewrite the packaged skill and
prompt guidance? `skills/guiho-s-xdocs/SKILL.md` pins both version fields to
0.12.0 and describes automatic legacy deletion, bare bootstrap and broad
startup housekeeping. `prompts/agents.md` likewise teaches legacy deletion.
Convention 0002 requires an artifact SemVer change for changed artifacts;
local instructions/tests require skill/release version parity. The assigned
prerequisite expressly prohibits Mirror, artifact/package and release bumps.

## Decision and Rationale

Preserve those release-pinned artifacts and record their stale guidance openly.
Correct the executable's Go instruction template, repository guidance, README,
DOCS and runtime help within the authorized source unit. Use current source
documentation and Convention 0011 for routine validation. Do not invoke skill
installation/update implicitly or treat old resource text as the runtime truth.

Changing resource bodies under unchanged versions would misidentify the
artifacts. A release bump would exceed this unit. Removing resource embedding
would unnecessarily change the release/setup feature. Separate resource
reconciliation under explicitly authorized versioning is the bounded choice.

## Review and Reversibility

The task binary still embeds historical 0.12.0 skill/prompt bytes; it is suitable
for independently verified data validation, not evidence that setup resources
are current or that an old globally installed executable has this boundary.
No global binary or skill replacement is authorized before independent review.
Confidence: high that this preserves the explicit version and delivery boundary.

A later owned resource/release unit can update the canonical artifacts through
Mirror and verify resulting projections. No deletion or history rewrite is
needed. Human review: pending.

- Task: [Issue #25](https://github.com/CGuiho/xdocs/issues/25).
- Related decision: [runtime housekeeping](2026-10-03-runtime-housekeeping-boundary.md).
