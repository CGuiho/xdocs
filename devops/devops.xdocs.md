---
subject: xdocs-devops
description: Release and binary build automation for @guiho/xdocs.
parent: xdocs-package
children: []
files:
  build-binaries.ts: Bun-native release binary matrix builder for Linux x64/arm64, macOS x64/arm64, and Windows x64 assets.
documents: {}
tags:
  - devops
  - release
  - binary
keywords:
  - release
  - binary build
  - native assets
flags: []
status: stable
---

The `devops/` directory contains automation used by package scripts and release
workflows. The binary builder compiles the native CLI entrypoint with Bun for the
supported release asset matrix and writes ignored files under `xdocs/bin/`.
