---
name: Simplify Public Native Installation
purpose: Define the public installation outcome for task 5 in TODO.md.
description: Records the required simple PowerShell and Bash commands and their verification signals.
created: 2026-07-20
owner: xdocs-todo
flags: []
tags:
  - installer
  - cli
keywords:
  - curl
  - Invoke-RestMethod
  - RunX
---

# Simplify Public Native Installation

## Summary

XDocs must expose the same simple copy-paste installation experience that works
for RunX, without requiring users to save and invoke an intermediate script.

## Todo Index

- Task: `5. Simplify Public Native Installation`
- Status: completed
- Index: [TODO.md](../../TODO.md)

## Outcome

The README and canonical documentation publish one-line PowerShell and Bash
commands that directly execute the repository installers.

## Scope

### In scope

- `irm ... | iex` for Windows PowerShell.
- `curl -fsSL ... | bash` for Linux and Darwin.
- Regression coverage that prevents the public commands from drifting.
- Live Windows verification in an isolated install directory.

### Out of scope

- Replacing the proven installer transaction, release-asset, or skill-install
  behavior.
- Changing self-upgrade command behavior.

## Acceptance Signals

- The public Windows command installs the current stable XDocs release and the
  installed executable reports the expected version.
- The public Bash command is a single `curl -fsSL ... | bash` pipeline.
- Installer regression tests pass.
- The XDocs metadata tree and doctor checks remain healthy.

## References

- [TODO.md](../../TODO.md)
- [README.md](../../README.md)
- [DOCS.md](../../DOCS.md)
- [installers.spec.ts](../../devops/installers.spec.ts)
