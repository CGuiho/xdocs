---
name: xdocs RFC 0034 CLI Compliance Migration Implementation
purpose: Record execution decisions, completed plan units, verification, and handoff for the breaking xdocs CLI migration.
description: Tracks the implementation of XD-01 through XD-18 and the evidence required to close task 4.
created: 2026-07-18
updated: 2026-07-19
owner: xdocs-todo
flags:
  - completed
tags:
  - implementation
  - cli
  - rfc-0034
keywords:
  - xdocs.yaml
  - TypeBox
  - agent namespace
  - fourteen assets
---

# xdocs RFC 0034 CLI Compliance Migration Implementation

## Status

Implemented and validated locally. Package publication and GitHub release
creation are intentionally not part of this execution.

## Corrective audit and patch

An independent post-release audit found and corrected three RFC completion
gaps before the `0.6.1` patch:

- root help was delegated to a synthetic default `home` subcommand, so root
  usage, tree, depth, and Markdown modes omitted the public command catalog and
  `xdocs home` was accidentally callable;
- standard and Markdown help omitted examples;
- the POSIX installer's Darwin Bash profile branch compared the normalized
  `darwin` platform with the unreachable value `macos`.

The root now owns the no-argument lifecycle directly, returns after routed
subcommands, renders every root help form from the true Citty tree, excludes
hidden internal commands, and rejects `home`. Examples live in command metadata
and both help renderers consume them. The installer now selects an existing
Darwin `.bash_profile` correctly.

Regression coverage includes live subprocess root help/catalog checks, `home`
rejection, all three YAML precedence levels, and Darwin profile selection. The
complete suite passes with 50 tests.

## Completed units

- XD-01: baseline inventory and validation captured before edits.
- XD-02: added `@sinclair/typebox` and schemas for configuration, descriptors,
  cache, GitHub releases, skill/prompt metadata, and numeric values.
- XD-03: removed prohibited Node imports from core/shared source through
  Bun-first runtime modules.
- XD-04: replaced TOML with `xdocs.yaml`, exact precedence, loaded-path report,
  and configuration exit code.
- XD-05: replaced root prompt/plural agents with the final single Citty catalog.
- XD-06: standardized `~/.guiho/xdocs/cache.json`, exact banner/notice, and
  detached worker.
- XD-07: generated Unicode trees and Markdown docs from live Citty definitions
  at every scope, including positive depth.
- XD-08: implemented both-target skill install, update, uninstall, list, show,
  global default, and `--local`.
- XD-09: implemented exact idempotent instruction apply/remove/update/show.
- XD-10: preserved four prompts under `agent prompt` and added the single
  `guiho-i-xdocs.md` manifest/artifact.
- XD-11: preserved one-document JSON output and stable exit categories.
- XD-12: added stable/prerelease pagination and post-upgrade skill/instruction
  reconciliation while retaining journaled rollback/recovery.
- XD-13: completed PowerShell and Bash installers with progress, PATH, binary
  verification, both skill paths, and instruction reconciliation.
- XD-14: replaced the Bun launcher/postinstall helper with a thin Node ESM
  native bootstrap.
- XD-15: implemented exact twelve binaries plus validated
  `guiho-s-xdocs.md` and `guiho-i-xdocs.md` Markdown artifacts and exact GitHub
  workflow comparison.
- XD-16: aligned public docs, architecture, skill, AGENTS, TODO, and xdocs
  descriptors.
- XD-17: recorded all live GUIHO TOML consumer paths without editing them.
- XD-18: completed implementation review and durable validation reporting.

## Breaking removals

- `xdocs.config.toml`
- root `xdocs prompt --name`
- plural `xdocs agents`
- `--tool`, positional skill scope, and `--global`
- automatic agent mutations
- legacy cache paths/fields
- `macos` release names
- Bun-dependent npm launcher and postinstall helper
- public Node-runtime compatibility for the Bun-first library

## Verification

See:

- [Implementation review](../reviews/implementation/rfc-0034-cli-compliance-migration-review.md)
- [Validation report](../validation/rfc-0034-cli-compliance-migration.md)
- [Downstream handoff](../migrations/xdocs-yaml-downstream-handoff.md)
