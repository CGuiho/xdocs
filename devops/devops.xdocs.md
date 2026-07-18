---
subject: xdocs-devops
description: Release and binary build automation for @guiho/xdocs.
parent: xdocs-package
children: []
files:
  build-binaries.ts: Bun-native release binary matrix builder and verifier for all 12 Linux, macOS, and Windows native binary assets.
  install.ps1: Windows PowerShell direct installer with baseline-first fallback, candidate/final exact-version verification, same-directory canonical swap, rollback, PATH setup, and shadowing warnings.
  install.sh: Linux/macOS direct installer with baseline-first fallback, candidate/final exact-version verification, same-directory canonical swap, rollback, PATH setup, and shadowing warnings.
  installers.spec.ts: Executable installer regressions that compile an exact prerelease fixture and run generated recovery commands through PowerShell, Git Bash, or Bash, proving exact installation in paths containing spaces.
documents: {}
tags:
  - devops
  - release
  - binary
keywords:
  - release
  - binary build
  - native assets
  - installer
  - path setup
flags: []
status: stable
---

The `devops/` directory contains automation used by package scripts, direct
installers, and release workflows. The binary builder compiles the native CLI
entrypoint with Bun for the supported 12-asset release matrix and writes ignored
files under `bin/`. The direct installers download those GitHub Release assets
and make `xdocs` available on PATH when possible.
