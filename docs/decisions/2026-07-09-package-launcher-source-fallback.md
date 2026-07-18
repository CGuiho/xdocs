---
name: Package Launcher Source Fallback
purpose: Record the immediate repair decisions for broken xdocs package execution after the package moved to the repository root.
description: Explains why the package launcher now falls back to the TypeScript CLI in source checkouts and why root package metadata/docs were corrected together.
created: 2026-07-09
owner: xdocs-decisions
flags:
  - decision
  - superseded
tags:
  - cli
  - package
  - documentation
keywords:
  - xdocs-bin
  - source checkout
  - native binary
  - vendor
  - package root
  - mirror.config.toml
---

# Package Launcher Source Fallback

> Superseded on 2026-07-18 by the approved RFC 0034 CLI migration. The package
> now ships `scripts/xdocs-bin.mjs`, a Node-compatible native bootstrap with no
> Bun/source fallback or postinstall helper.

## Summary

xdocs failed when the package launcher was executed from a source checkout with no
`vendor/xdocs` native binary. `scripts/install-package.ts` correctly skips native
binary download when `source/guiho-xdocs-bin.ts` exists, but
`scripts/xdocs-bin.ts` still expected the vendor binary to appear and exited with
an error.

The selected fix is to make the package launcher prefer the native vendor binary
when it exists, fall back to the TypeScript CLI when running from a source
checkout, and only invoke the installer for published package layouts where the
source entrypoint is absent.

## Decisions

1. Preserve native-binary-first execution for installed packages. Published npm
   installs and `bunx` executions should still delegate to `vendor/xdocs` or
   `vendor/xdocs.exe` after postinstall or first-run installation.
2. Treat `source/guiho-xdocs-bin.ts` as the source-checkout fallback. This keeps
   local development and repository-root package execution working without
   downloading a release artifact.
3. Keep package-root metadata consistent with the current layout. The package now
   lives at the repository root, so `repository.directory`, `mirror.config.toml`,
   `AGENTS.md`, `XDOCS.md`, and the root xdocs descriptor must not point at a
   nested `xdocs/` package directory.

## Rejected Alternatives

1. Always download a native binary, even in source checkouts. This would make
   development depend on an already-published release and would not test the
   local TypeScript source being edited.
2. Run `install-package.ts` first and infer its skip result from output. That
   keeps the broken control flow indirect and noisy for normal source-checkout
   commands.
3. Remove the native launcher path entirely. That would regress the intended
   CLI-only distribution where users can run the compiled binary without Node.js
   or Bun at runtime after installation.

## Validation

The repair is validated by a regression test that executes
`bun run scripts/xdocs-bin.ts --version` from the source checkout and asserts that
it exits successfully without reporting a missing native binary.
