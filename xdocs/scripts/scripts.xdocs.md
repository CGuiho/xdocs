---
subject: xdocs-scripts
description: Package-manager launcher and installation scripts for executing the native xdocs binary.
parent: xdocs-package
children: []
files:
  xdocs-bin.ts: Shipped Bun launcher used as the package bin; installs the native binary on first run when needed and delegates to it.
  install-package.ts: Package-manager install helper that downloads or copies the matching GitHub Release native binary into vendor/xdocs or vendor/xdocs.exe.
tags:
  - install
  - native-binary
  - package-manager
flags: []
status: stable
---

The `scripts/` directory contains the package-manager launcher and install
helper. Package-manager and `bunx` execution start in `xdocs-bin.ts`; if the
native binary is missing, it runs `install-package.ts` and then delegates to the
downloaded binary in `vendor/`. Direct installers remain the no-Bun runtime path.
