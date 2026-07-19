---
subject: xdocs-todo
description: Durable task specifications linked from the xdocs TODO index.
parent: xdocs-docs
children: []
files: {}
documents:
  citty-cli-migration-implementation.md: Tracks migration progress, decisions, verification evidence, and handoff state for the Citty CLI migration.
  citty-cli-migration.md: Defines the required full migration from xdocs handwritten CLI parsing and routing to Citty.
  improve-json-output-coverage.md: Follow-up task spec for consistent JSON output coverage across xdocs commands.
  rfc-0034-cli-compliance-migration.md: Defines the required breaking outcome, global-by-default initialization setup, root-catalog help signals, scope, constraints, and completion criteria for full xdocs RFC 0034 compliance.
  rfc-0034-cli-compliance-migration-implementation.md: Records completed units, issue 7 initialization setup, issue 8 fresh-shell PATH repair, corrective root-help and Darwin installer audit, breaking removals, validation, review, and downstream handoff.
  upgrade-reliability-implementation.md: Tracks upgrade reliability progress, decisions, verification evidence, and integration handoff.
  upgrade-reliability.md: Defines reliable verified self-upgrade, complete release catalog, exact recovery guidance, and installer acceptance signals.
tags:
  - todo
  - planning
keywords:
  - citty
  - cli migration
  - implementation evidence
  - json output
  - RFC 0034
  - xdocs.yaml
  - agent prompt catalog
  - todo spec
  - format flag
  - upgrade reliability
  - rollback
flags: []
status: stable
---

The `docs/todo/` directory stores task specifications linked from `TODO.md`.
These files keep the TODO index concise while preserving acceptance signals,
scope, and context for future implementation sessions.
