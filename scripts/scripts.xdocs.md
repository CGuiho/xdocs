---
subject: xdocs-scripts
description: Package-manager launcher and installation scripts for executing the native xdocs binary.
parent: xdocs-package
children: []
files:
  xdocs-bin.ts: Shipped Bun launcher used as the package bin; delegates to an installed native binary, falls back to the TypeScript CLI in source checkouts, and installs the native binary on first run for published packages.
  install-package.ts: Package-manager installer that validates and executes the candidate, swaps the vendor canonical path, verifies the exact version, rolls back failures, and terminates immediately while preserving the backup when rollback cannot complete.
documents: {}
tags:
  - install
  - native-binary
  - package-manager
keywords:
  - package launcher
  - native binary
  - vendor install
flags: []
status: stable
---

The `scripts/` directory contains the package-manager launcher and install
helper. Package-manager and `bunx` execution start in `xdocs-bin.ts`; if the
native binary is missing in a published package, it runs `install-package.ts` and
then delegates to the downloaded binary in `vendor/`. Source checkouts run the
TypeScript CLI directly when no vendor binary exists. Direct installers remain
the no-Bun runtime path.
