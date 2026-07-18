---
subject: xdocs-devops
description: Exact fourteen-asset release builder and complete cross-platform native installers.
parent: xdocs-package
children: []
files:
  build-binaries.ts: Bun-only builder for twelve Linux, Darwin, and Windows binaries plus guiho-s-xdocs and guiho-i-xdocs, with exact-set verification.
  install.ps1: Progress-visible Windows installer for binary, PATH, both skill destinations, instruction reconciliation, rollback, and final verification.
  install.sh: Progress-visible Linux/Darwin installer with Darwin-aware shell-profile PATH setup, both skill destinations, instruction reconciliation, rollback, and final verification.
  installers.spec.ts: Isolated recovery-installer regression coverage including paths with spaces and Darwin Bash profile selection.
documents: {}
tags:
  - devops
  - release
  - installer
keywords:
  - fourteen assets
  - native binaries
  - darwin
  - agent assets
flags: []
status: stable
---

Generated release outputs are ignored under `bin/` and must never be
hand-edited.
