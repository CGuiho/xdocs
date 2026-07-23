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

Complete. Local and public XDocs 0.7.1 acceptance passed.

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

Publicly accepted.

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

## Public Evidence

- Main implementation CI passed:
  [30031761558](https://github.com/CGuiho/xdocs/actions/runs/30031761558).
- Release-preparation CI passed:
  [30031921014](https://github.com/CGuiho/xdocs/actions/runs/30031921014).
- Versioned CI passed:
  [30032031534](https://github.com/CGuiho/xdocs/actions/runs/30032031534).
- Publish passed:
  [30032030887](https://github.com/CGuiho/xdocs/actions/runs/30032030887).
- [@guiho/xdocs@0.7.1](https://github.com/CGuiho/xdocs/releases/tag/%40guiho%2Fxdocs%400.7.1)
  contains exactly twelve native binaries plus `guiho-s-xdocs.md` and
  `guiho-i-xdocs.md`; its body contains only the 0.7.1 changelog section.
- The canonical PowerShell installer installed and verified XDocs 0.7.1, and
  the installed Windows binary passed text, Markdown, JSON, and pagination
  acceptance.
- The canonical Bash installer installed and verified XDocs 0.7.1 under WSL,
  and the installed Linux binary rendered the same concise text contract.
- [XDocs acceptance evidence](https://github.com/CGuiho/mirror/issues/16#issuecomment-5061756753)
  was posted for coordinated Mirror issue 16 closure.
