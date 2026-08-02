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
  - gitignore
  - frontmatter opt-out
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

## Ignore Git Paths And Opt Out Of Frontmatter

- Status: completed
- Created: `2026-08-02T23:38:54+02:00`
- Completed: `2026-08-03T01:04:15+02:00`
- Outcome: XDocs honors Git-ignored paths by default and keeps explicitly
  opted-out Markdown files tracked without requiring or adding YAML
  frontmatter.
- Spec: [ignore-paths-and-frontmatter.md](ignore-paths-and-frontmatter.md)
- Review: [../../reviews/implementation/ignore-paths-and-frontmatter-review.md](../../reviews/implementation/ignore-paths-and-frontmatter-review.md)
- Validation: [../../validation/ignore-paths-and-frontmatter.md](../../validation/ignore-paths-and-frontmatter.md)
- Pull request: [CGuiho/xdocs#18](https://github.com/CGuiho/xdocs/pull/18)
- Release: [xdocs/v0.10.0](https://github.com/CGuiho/xdocs/releases/tag/xdocs/v0.10.0)
- Workflow: [Publish 30771328125](https://github.com/CGuiho/xdocs/actions/runs/30771328125)
