---
subject: xdocs-todo
description: Durable task specifications linked from the xdocs TODO index.
parent: xdocs-docs
children: []
files: {}
documents:
  background-update-worker-cpu-safety.md: Defines the non-recursive bounded worker, cache-scoped lease, stale recovery, process-count tests, and issue 14 release gate.
  citty-cli-migration-implementation.md: Tracks migration progress, decisions, verification evidence, and handoff state for the Citty CLI migration.
  citty-cli-migration.md: Defines the required full migration from xdocs handwritten CLI parsing and routing to Citty.
  improve-json-output-coverage.md: Follow-up task spec for consistent JSON output coverage across xdocs commands.
  simple-public-installers.md: Defines the tested one-line PowerShell and Bash native installation experience.
  simple-upgrade-list-output.md: Defines the concise RunX-style XDocs text table while preserving pagination and complete Markdown/JSON metadata for Mirror issue 16.
  rfc-0034-cli-compliance-migration.md: Defines the required breaking outcome, global-by-default initialization setup, root-catalog help signals, scope, constraints, and completion criteria for full xdocs RFC 0034 compliance.
  rfc-0034-cli-compliance-migration-implementation.md: Records completed units, issue 7 initialization, issue 8 PATH repair, issue 11 help-tree, issue 12 streamed progress, corrective audits, breaking removals, validation, review, and downstream handoff.
  upgrade-reliability-implementation.md: Records completed issue 9 upgrade/list acceptance work, transaction decisions, live-catalog evidence, and final release smoke handoff.
  upgrade-reliability.md: Defines reliable verified self-upgrade, complete release catalog, exact recovery guidance, and installer acceptance signals.
  welcome-update-pagination.md: Defines the XDocs 0.7.0 welcome, reliable stable-only update notice, eight-item pagination, YAML migration, publishing, and issue closure gates.
  xdocs-go-rewrite.md: Defines the required breaking outcome and completion signals for the native Go XDocs rewrite.
  xdocs-go-rewrite-implementation.md: Tracks Go rewrite execution, decisions, test evidence, release readiness, and final handoff.
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
  - background worker
  - CPU safety
  - Go rewrite
  - Git version
flags: []
status: stable
---

The `docs/todo/` directory stores task specifications linked from `TODO.md`.
These files keep the TODO index concise while preserving acceptance signals,
scope, and context for future implementation sessions.
