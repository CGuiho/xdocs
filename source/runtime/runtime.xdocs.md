---
subject: xdocs-runtime
description: Bun-only filesystem, path, and home helpers used by core xdocs source.
parent: xdocs-source
children: []
files:
  fs.ts: Bun file reads/writes, directory scanning, and cross-platform Bun-spawned mutation operations.
  home.ts: User-home resolution from Bun environment variables.
  path.ts: Narrow platform-aware normalization, resolution, joining, basename, dirname, and relative-path helpers.
documents: {}
tags:
  - runtime
  - bun
keywords:
  - Bun filesystem
  - path handling
  - home directory
flags: []
status: stable
---

This module replaces prohibited Node built-ins in the core CLI.
