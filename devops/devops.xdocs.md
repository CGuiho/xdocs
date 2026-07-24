---
subject: xdocs-devops
description: Native Go release builder, checksum-verifying installers, and workflow contract tests.
parent: xdocs-package
children:
  - xdocs-release-notes
files:
  build-binaries.go: Reproducible CGO-free builder for eight binaries, a skill ZIP, an instruction Markdown asset, and checksums.
  build_binaries_test.go: Enforces that both embedded skill version fields match the Git release version before packaging.
  install.ps1: Windows AMD64 and ARM64 installer with tag resolution, SHA-256 verification, dual skill installation, PATH setup, and final verification.
  install.sh: Linux and Darwin installer for AMD64, ARM64, ARMv7, and ARMv6 with SHA-256 verification, dual skill installation, PATH setup, and final verification.
  installers_test.go: Locks installer architecture mappings, support-asset checksum coverage, rollback state, instruction reconciliation, and PowerShell environment restoration.
  workflows_test.go: Go tests locking Git-only tags, removal of approval gates, Go CI, exact version notes, and the eleven-asset contract.
  build-binaries.ts: Historical Bun release builder retained as migration reference only.
  extract-release-notes.ts: Historical TypeScript release-note extractor retained as migration reference only.
  extract-release-notes.spec.ts: Historical extractor tests retained as migration reference only.
  installers.spec.ts: Historical installer regression tests retained as migration reference only.
  publish-workflow.spec.ts: Historical workflow regression tests retained as migration reference only.
documents: {}
tags:
  - devops
  - release
  - installer
keywords:
  - eleven assets
  - checksums
  - portable binaries
  - native installers
flags: []
status: stable
---

Generated release outputs are ignored under `dist/` and `bin/` and must never be
hand-edited.
