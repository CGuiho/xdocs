---
name: xdocs-simple-upgrade-list-output-review
purpose: Review the concise XDocs upgrade-list implementation against Mirror issue 16.
description: Findings-first review of the text-only presentation change, structured-output preservation, pagination, tests, docs, and release readiness.
created: 2026-07-23
owner: xdocs-implementation-reviews
flags: []
tags: [implementation-review, cli, upgrade]
keywords: [Mirror issue 16, RunX table, JSON, Markdown]
---

# Simple Upgrade List Output Implementation Review

## Verdict

Accepted for XDocs 0.7.1 release preparation.

## Review Scope

- Six-column text table and date-only publication values.
- Full Markdown and JSON metadata preservation.
- Default eight-item pagination and `--page`/`--size`.
- Documentation, XDocs metadata, tests, release assets, and public acceptance.

## Findings

No blocking or correctness finding remains.

## Acceptance Criteria Check

- Human text uses exactly the six approved RunX-style fields and date-only
  publication values.
- Tags, release URLs, asset names, and combined marker strings are absent from
  text output.
- Markdown retains the full tag, timestamp, asset-name, and marker columns.
- JSON schema version 2 retains complete release objects and pagination.
- Default eight-item behavior, `--page`, `--size`, and navigation are unchanged.
- Exhaustive GitHub fetching, TypeBox decoding, deduplication, and SemVer sorting
  still occur before local pagination and presentation.
- Documentation, task state, bundled skill guidance, XDocs metadata, and release
  notes describe the text/structured split.

## Verification

- `bun run typecheck` passed.
- All 79 Bun tests passed with 392 assertions.
- Library build, native Windows binary, and twelve-target matrix passed.
- The release builder verified twelve native binaries plus two `.md` agent
  assets.
- Live compiled text contained the concise table and no tag or asset name.
- Live compiled Markdown and JSON retained full tag, release URL, and asset
  metadata.
- Strict XDocs metadata and doctor passed; Mirror config and 0.7.1 plan passed.

## Residual Risk

Public assets, installers, release notes, installed output, and issue evidence
remain to be verified after publication.
