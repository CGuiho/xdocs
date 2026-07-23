---
name: xdocs-welcome-update-pagination-todo
purpose: Track delivery of XDocs issues 15 and 16 through public acceptance.
description: Task specification for the welcome window, reliable cached update notice, paginated release catalog, YAML migration, and release gates.
created: 2026-07-22
owner: xdocs-todo
flags: []
tags: [cli, update-check, pagination]
keywords: [welcome window, background worker, page, size, GitHub issues 15 and 16]
---

# Welcome, Update Notice, And Release Pagination

## Status

Completed in XDocs 0.7.0. Source, CI, publication, both public installers,
welcome/cache lifecycle, live pagination, and GitHub issue closure passed.

## Outcome

Deliver GitHub issues [#15](https://github.com/CGuiho/xdocs/issues/15) and
[#16](https://github.com/CGuiho/xdocs/issues/16) in XDocs 0.7.0: a deterministic
welcome window, a reliable bounded update-check handoff, stable-only cached
notices, and an eight-item paginated release catalog.

## Acceptance Criteria

- Bare `xdocs` renders the approved GUIHO welcome without loading project config.
- Foreground startup awaits only the local lease-and-worker spawn handoff.
- Remote work remains detached, bounded to 15 seconds, coalesced, and non-recursive.
- Cached notices require a stable remote version newer than the running SemVer.
- `xdocs upgrade list` defaults to `--page 1 --size 8`.
- `--page` and `--size` reject invalid values with usage exit code 2.
- GitHub pagination is exhausted before local slicing.
- Text, Markdown, and JSON expose deterministic navigation.
- Root Mirror configuration is YAML-only.
- Publishing has no protected-environment approval gate and retains all validation.

## References

- [Implementation plan](../plans/xdocs-0.7.0-welcome-update-pagination.md)
- [Plan review](../reviews/plans/xdocs-0.7.0-welcome-update-pagination-review.md)
- [Validation](../validation/xdocs-0.7.0-welcome-update-pagination.md)
- [Release](https://github.com/CGuiho/xdocs/releases/tag/%40guiho%2Fxdocs%400.7.0)
- [Issue 15 evidence](https://github.com/CGuiho/xdocs/issues/15#issuecomment-5061538257)
- [Issue 16 evidence](https://github.com/CGuiho/xdocs/issues/16#issuecomment-5061538669)
