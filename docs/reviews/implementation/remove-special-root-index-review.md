---
name: remove-special-root-index-implementation-review
purpose: Review the removal of the special XDOCS.md repository index.
description: Findings-first acceptance review of cleanup routing, init and discovery changes, Cobra compatibility, documentation, and canonical managed instructions.
created: 2026-08-16
owner: xdocs-implementation-reviews
flags:
  - accepted
tags:
  - implementation-review
  - go-cli
  - documentation-model
keywords:
  - XDOCS.md
  - invocation cleanup
  - Cobra help
  - bootstrap idempotence
---

# Remove The Special XDOCS.md Root Index Implementation Review

## Verdict

Accepted for exact-head validation at
`0e763bb5febb8ddf025375db783683b91168e4e5`. No blocker, high, medium, or low
finding remains.

## Review Scope

- Cleanup routing for plain root, public commands, standard and developer help,
  root version, and effective `--cwd` behavior.
- Non-recursive regular-file and symbolic-link deletion, missing-file
  idempotency, directory refusal, and hidden internal-protocol exclusions.
- Removal of `xdocs init` creation/reporting and discovery/coverage
  special-casing.
- Cobra help/version compatibility, tests, tracked root-file deletion, current
  documentation, bundled skill, prompt, and embedded agent instructions.

## Resolved Findings

1. The first implementation replaced Cobra's hidden help command and changed
   exact help text and nested-help behavior. The correction restored the
   existing hidden command, deferred only the render path needed for cleanup,
   preserved argument help short-circuiting, and added byte-compatible help and
   version regressions.
2. The checked-in bounded XDocs block in `AGENTS.md` initially differed from
   `internal/agent.InstructionTemplate`, so plain bootstrap would have dirtied
   the repository. The final correction made the managed block canonical and
   added a reconciliation no-op regression.

## Acceptance Check

- `xdocs.yaml` remains configuration; named `*.xdocs.md` descriptors remain the
  structured documentation metadata.
- `xdocs init` no longer creates or reports `XDOCS.md`.
- Valid user-facing invocations silently remove the legacy file from the
  effective project directory before ordinary behavior.
- Cleanup honors `--cwd`, does not follow symbolic-link targets, and refuses a
  directory instead of recursively deleting it.
- Direct discovery no longer treats a surviving `XDOCS.md` as a descriptor or
  root-coverage source; it is ordinary companion Markdown.
- The tracked root file is deleted and all current product guidance describes
  the new model.

## Handoff

The accepted Luna implementation consists of commits `040eda8`, `09ef815`, and
`0e763bb` on `codex/remove-special-xdocs-root-index`. Main-agent validation must
bind to the assembled integration head without changing implementation.

## Residual Risk

The Windows symbolic-link test is privilege-dependent and may skip when the
host cannot create symlinks. The implementation uses `os.Lstat` plus
non-recursive `os.Remove`, and the target-preservation assertion runs wherever
the host permits symlink creation. No implementation correctness finding
remains.
