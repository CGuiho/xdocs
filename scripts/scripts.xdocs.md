---
subject: xdocs-scripts
description: Thin Node-compatible npm bootstrap for selecting, caching, and delegating to the native xdocs binary.
parent: xdocs-package
children: []
files:
  xdocs-bin.mjs: Node ESM package launcher that selects the RFC asset, downloads and caches it by package version, applies Unix permissions, forwards process state, and preserves the native exit result.
documents: {}
tags:
  - install
  - native-binary
  - npm
keywords:
  - Node bootstrap
  - native binary
  - npm launcher
flags: []
status: stable
---

The npm launcher is the only Node-runtime exception in xdocs. It contains no
structured-documentation implementation and does not require Bun to be present.
