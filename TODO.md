Copyright (c) 2026 GUIHO Technologies as represented by Cristóvão GUIHO
All Rights Reserved.

# GUIHO XDocs TODO List

## Parent TODO

- Parent: [../guiho/TODO.md](../guiho/TODO.md)
- Parent AGENTS: [../guiho/AGENTS.md](../guiho/AGENTS.md)
- Local AGENTS: [./AGENTS.md](./AGENTS.md)
- Local context: Structured documentation package and CLI for @guiho/xdocs.

## Status Summary

| Status | Count |
| --- | ---: |
| todo | 2 |
| in progress | 0 |
| testing | 1 |
| stopped | 0 |
| completed | 1 |

## Tasks

### 1. Improve JSON Output Coverage

- Status: todo
- Created: `2026-07-09T19:25:00Z`
- Updated: `2026-07-09T19:25:00Z`
- Outcome: Add consistent JSON output support for remaining xdocs commands and help/self-management flows where useful.
- Spec: [docs/todo/improve-json-output-coverage.md](docs/todo/improve-json-output-coverage.md)

### 2. Migrate CLI Parsing and Routing to Citty

- Status: completed
- Created: `2026-07-14`
- Updated: `2026-07-14T22:43:55+02:00`
- Outcome: Replace xdocs handwritten argument parsing and manual command routing with Citty while preserving command behavior, structured output, agent automation, native distribution, and library compatibility.
- Spec: [docs/todo/citty-cli-migration.md](docs/todo/citty-cli-migration.md)
- Related files:
  - [docs/plans/citty-cli-migration.md](docs/plans/citty-cli-migration.md) - Approved executable migration plan.
  - [docs/reviews/plans/citty-cli-migration-review.md](docs/reviews/plans/citty-cli-migration-review.md) - Plan readiness review.
- Implementation: [docs/todo/citty-cli-migration-implementation.md](docs/todo/citty-cli-migration-implementation.md)

### 3. Make Self-Upgrade Reliable and Recoverable

- Status: testing
- Created: `2026-07-15`
- Updated: `2026-07-18`
- Outcome: Make native self-upgrade observable, immediately verified and rollback-safe, with complete release listing and exact recovery commands.
- Spec: [docs/todo/upgrade-reliability.md](docs/todo/upgrade-reliability.md)
- Related files:
  - [docs/superpowers/specs/2026-07-15-upgrade-reliability-design.md](docs/superpowers/specs/2026-07-15-upgrade-reliability-design.md) - Approved behavior and architecture contract.
  - [docs/plans/upgrade-reliability-implementation.md](docs/plans/upgrade-reliability-implementation.md) - Approved executable implementation plan.
  - [docs/reviews/plans/upgrade-reliability-implementation-review.md](docs/reviews/plans/upgrade-reliability-implementation-review.md) - Plan readiness review.
- External: GitHub issues [CGuiho/xdocs#9](https://github.com/CGuiho/xdocs/issues/9) and [CGuiho/xdocs#10](https://github.com/CGuiho/xdocs/issues/10)
- Implementation: [docs/todo/upgrade-reliability-implementation.md](docs/todo/upgrade-reliability-implementation.md)

### 4. Migrate xdocs To Full RFC 0034 Compliance

- Status: todo
- Created: `2026-07-18T18:48:11+02:00`
- Updated: `2026-07-18T18:48:11+02:00`
- Outcome: xdocs fully implements the approved breaking GUIHO RFC 0034 CLI contract across Bun-only source, TypeBox validation, YAML configuration, startup, help, agents, prompts, upgrades, installers, npm distribution, release assets, tests, and documentation.
- Spec: [docs/todo/rfc-0034-cli-compliance-migration.md](docs/todo/rfc-0034-cli-compliance-migration.md)
- Related files:
  - [docs/plans/rfc-0034-cli-compliance-migration.md](docs/plans/rfc-0034-cli-compliance-migration.md) - Approved step-by-step migration plan.
  - [docs/reviews/plans/rfc-0034-cli-compliance-migration-review.md](docs/reviews/plans/rfc-0034-cli-compliance-migration-review.md) - Ready-for-execution plan review.
