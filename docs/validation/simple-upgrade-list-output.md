---
name: xdocs-simple-upgrade-list-output-validation
purpose: Record reproducible implementation and release evidence for the XDocs half of Mirror issue 16.
description: Validation ledger for concise text output, structured formats, pagination, builds, release assets, installers, and public issue evidence.
created: 2026-07-23
owner: xdocs-validation
flags: []
tags: [validation, cli, release]
keywords: [Mirror issue 16, upgrade list, concise table]
---

# Simple Upgrade List Output Validation

## Status

Local implementation validation passed. Public 0.7.1 acceptance remains.

## Required Evidence

| Check | Required result |
| --- | --- |
| Typecheck and all Bun tests | Pass |
| Text output | Exact six concise columns; no tag, URL, or asset-name verbosity |
| Markdown output | Full metadata preserved |
| JSON output | Full schema-version-2 release and pagination data preserved |
| Pagination | Default eight plus page/size/navigation unchanged |
| Build and native matrix | Pass; exactly fourteen release payloads |
| XDocs metadata and doctor | Pass |
| Mirror config and version plan | Pass |
| Public release/installers | Patch installs and exposes the concise output |
| Mirror issue 16 evidence | XDocs acceptance posted for owner closure |

## Readiness

Ready for XDocs 0.7.1 release preparation.

## Local Evidence

- TypeScript typecheck passed.
- All 79 Bun tests passed with 392 assertions.
- Library build, current native binary, and twelve-target native matrix passed.
- The builder verified exactly twelve native binaries plus
  `guiho-s-xdocs.md` and `guiho-i-xdocs.md`.
- Live text rendered `VERSION CHANNEL PUBLISHED CURRENT LATEST ASSET`, date-only
  values, `yes`/blank markers, and no tag, URL, or asset-name verbosity.
- Live JSON retained tag, release URL, assets, schema version 2, page, size, and
  navigation metadata.
- Live Markdown retained the full Tag, Published, Asset Name, and Markers
  columns.
- Strict XDocs metadata and doctor passed with zero errors and warnings.
- Mirror 3.6.1 config validation and the exact 0.7.1 plan passed.
