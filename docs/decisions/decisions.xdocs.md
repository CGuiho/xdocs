---
subject: xdocs-decisions
description: Decision records for xdocs implementation and operational repairs.
parent: xdocs-docs
children: []
files: {}
documents:
  2026-07-09-package-launcher-source-fallback.md: Records the decision to make the package launcher fall back to the TypeScript CLI in source checkouts while published installs keep using native binaries.
  go-native-cli-and-git-version-tags.md: Selects the native Go runtime, one Cobra tree, Git-only xdocs/vX.Y.Z versions, and the exact eleven-asset release contract.
  global-skill-default-and-discovery-trigger.md: Reaffirms global-by-default dual-tool skill installation for xdocs init, the explicit local override, idempotence, isolation, and broad agent triggers for codebase discovery.
  markdown-release-assets-and-version-scoped-notes.md: Records the required .md agent release filenames, payload validation and installer-test isolation, and exact-version changelog release notes.
tags:
  - documentation
  - decisions
keywords:
  - decisions
  - launcher
  - source checkout
  - agent skill installation
  - codebase discovery
  - release assets
  - release notes
  - Git version
  - Go CLI
flags: []
status: stable
---

The `docs/decisions/` directory stores point-in-time technical decisions for
xdocs. Each decision document captures context, selected behavior, rejected
alternatives, and validation evidence for future agents and maintainers.
