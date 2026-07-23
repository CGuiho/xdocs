---
name: xdocs-simple-upgrade-list-output-todo
purpose: Track the XDocs half of Mirror issue 16 through public acceptance.
description: Task specification for simplifying human upgrade-list output without changing pagination or structured metadata.
created: 2026-07-23
owner: xdocs-todo
flags: []
tags: [cli, upgrade, text-output]
keywords: [Mirror issue 16, RunX, upgrade list, concise table]
---

# Simple Upgrade List Output

## Status

Testing. Source, tests, structured formats, builds, native matrix, XDocs
metadata, and the Mirror patch plan pass; public 0.7.1 acceptance remains.

## Outcome

Make human `xdocs upgrade list` output match the concise RunX presentation while
preserving the 0.7.0 pagination and structured-output contracts.

## Acceptance Criteria

- Text uses only `VERSION`, `CHANNEL`, `PUBLISHED`, `CURRENT`, `LATEST`, and
  `ASSET`.
- Published values use `YYYY-MM-DD`.
- Current/latest markers use `yes` or an empty cell.
- Asset compatibility uses `yes` or `no`.
- Text omits tags, release URLs, asset names, and combined marker text.
- Markdown retains its full tag, publication timestamp, asset name, and markers.
- JSON retains its complete release objects and schema-version-2 pagination.
- Page defaults to 1, size defaults to 8, and navigation remains unchanged.
- XDocs patch release contains exactly fourteen assets and exact-version notes.

## External

- [CGuiho/mirror#16](https://github.com/CGuiho/mirror/issues/16)

## References

- [Implementation review](../reviews/implementation/simple-upgrade-list-output-review.md)
- [Validation](../validation/simple-upgrade-list-output.md)
