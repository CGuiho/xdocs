---
subject: xdocs-decisions
description: Decision records for xdocs implementation and operational repairs.
parent: xdocs-docs
children: []
files: {}
documents:
  2026-07-09-package-launcher-source-fallback.md: Records the decision to make the package launcher fall back to the TypeScript CLI in source checkouts while published installs keep using native binaries.
  global-skill-default-and-discovery-trigger.md: Defines global-by-default skill installation for xdocs init, the explicit local override, and broad agent triggers for codebase discovery.
tags:
  - documentation
  - decisions
keywords:
  - decisions
  - launcher
  - source checkout
  - agent skill installation
  - codebase discovery
flags: []
status: stable
---

The `docs/decisions/` directory stores point-in-time technical decisions for
xdocs. Each decision document captures context, selected behavior, rejected
alternatives, and validation evidence for future agents and maintainers.
