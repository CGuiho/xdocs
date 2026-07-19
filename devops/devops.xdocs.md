---
subject: xdocs-devops
description: Exact fourteen-asset release builder and complete cross-platform native installers.
parent: xdocs-package
children: []
files:
  build-binaries.ts: Bun-only builder for twelve Linux, Darwin, and Windows binaries plus validated guiho-s-xdocs.md and guiho-i-xdocs.md Markdown assets, with exact-set verification.
  extract-release-notes.spec.ts: Exact-version changelog-section extraction regression coverage.
  extract-release-notes.ts: Strict release-note extractor that writes only the changelog section matching the release version.
  install.ps1: Progress-visible Windows installer for binary, literal-safe PATH mutation, validated Markdown agent assets, both skill destinations, instruction reconciliation, rollback, and final verification.
  install.sh: Progress-visible Linux/Darwin installer with Darwin-aware shell-profile PATH setup, literal-safe PATH persistence, validated Markdown agent assets, both skill destinations, instruction reconciliation, rollback, and final verification.
  installers.spec.ts: Isolated recovery-installer regression coverage including Markdown agent fixtures, paths with spaces, fresh-shell PATH command resolution, and Darwin Bash profile selection.
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
