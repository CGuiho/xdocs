---
name: XDocs Completed Tasks
purpose: Preserve the permanent registry for completed XDocs work.
description: Completion archive linking validated task contracts, implementation evidence, reviews, validation, and releases.
created: "2026-07-28"
owner: xdocs-todo-done
flags: []
tags:
  - completed-tasks
keywords:
  - XDocs Go rewrite
  - shared agent bootstrap
---

# XDocs Completed Tasks

## Rewrite XDocs CLI In Go

- Status: completed
- Created: `2026-07-24`
- Completed: `2026-07-28`
- Outcome: XDocs ships as a validated native Go/Cobra CLI with Git-only
  versioning, safe installers and upgrades, and the exact eleven-artifact
  release contract.
- Spec: [xdocs-go-rewrite.md](xdocs-go-rewrite.md)
- Implementation: [xdocs-go-rewrite-implementation.md](xdocs-go-rewrite-implementation.md)
- Review: [../../reviews/implementation/xdocs-go-rewrite-review.md](../../reviews/implementation/xdocs-go-rewrite-review.md)
- Validation: [../../validation/xdocs-go-rewrite.md](../../validation/xdocs-go-rewrite.md)
- Release: `xdocs/v0.9.0`

## Bootstrap Shared Agent Resources On Plain Invocation

- Status: completed
- Created: `2026-07-26`
- Completed: `2026-07-28`
- Outcome: A plain XDocs invocation safely and idempotently maintains both
  global skill targets and the repository instruction block.
- Spec: [shared-agent-bootstrap.md](shared-agent-bootstrap.md)
- Plan: [../../plans/shared-agent-bootstrap.md](../../plans/shared-agent-bootstrap.md)
- Validation: [../../validation/shared-agent-bootstrap.md](../../validation/shared-agent-bootstrap.md)
