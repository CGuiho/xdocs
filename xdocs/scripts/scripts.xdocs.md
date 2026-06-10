---
subject: xdocs-scripts
description: Package-manager installation scripts for installing the native xdocs binary.
parent: xdocs-package
children: []
files:
  install-native.cjs: npm postinstall helper that downloads the matching GitHub Release native binary into bin/xdocs.exe.
tags:
  - install
  - native-binary
  - package-manager
flags: []
status: stable
---

The `scripts/` directory contains package-manager lifecycle helpers. These
scripts are used during install only; the resulting `xdocs` command executes the
downloaded native binary directly and does not require Node.js at runtime.
