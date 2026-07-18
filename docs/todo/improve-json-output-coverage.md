---
name: Improve JSON Output Coverage
purpose: Define the follow-up work for consistent JSON output across xdocs commands.
description: Captures the requested future task to expand machine-readable JSON output beyond the current command coverage.
created: 2026-07-09
owner: xdocs-todo
flags:
  - todo
tags:
  - cli
  - output
  - json
keywords:
  - json output
  - machine readable
  - format flag
---

# Improve JSON Output Coverage

## Summary

xdocs already supports JSON output on several data commands. The next task is to
make JSON support consistent where it is useful for help, self-management, and
remaining command flows.

## Outcome

Every command that produces structured data should support `--format json` with a
stable schema. Text-only operations should either provide a useful JSON result or
document why JSON is not meaningful.

## Acceptance Signals

- `xdocs --help-docs` and `xdocs --help-tree` have a documented JSON strategy or explicit non-goal.
- `xdocs upgrade`, `xdocs uninstall`, and existing data commands expose stable JSON output where useful.
- README and DOCS describe which commands support JSON.
- Tests cover the supported JSON shapes.

## References

- [../../TODO.md](../../TODO.md)
