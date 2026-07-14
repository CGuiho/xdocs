---
name: xdocs Citty CLI Migration Plan Review
purpose: Verify that the Citty migration plan is traceable, sequenced, testable, and safe to execute in the current worktree.
description: Reviews the executable Citty migration plan against the approved task specification, repository constraints, documentation duties, and verification matrix.
created: 2026-07-14
flags:
  - approved
  - ready-for-execution
tags:
  - review
  - plan
  - cli
keywords:
  - xdocs
  - Citty
  - plan readiness
  - migration review
owner: xdocs-plan-reviews
---

# xdocs Citty CLI Migration Plan Review

## Verdict

Ready for execution.

## Findings

No blocker or high-severity finding remains.

- Medium, resolved in plan: The public parser API could have been removed
  accidentally. The plan records the repository consumer search, explicitly chooses
  removal, requires public API tests, and requires an Unreleased changelog entry.
- Medium, resolved in plan: Existing self-upgrade edits overlap the upgrade adapter,
  types, tests, README, DOCS, and source descriptor. The baseline and every relevant
  execution unit require preservation and final diff inspection.
- Medium, resolved in plan: Citty help and error handling could trigger project
  automation or terminate library tests. Unit 3 makes safe help/version and
  testable `runCli(rawArgs)` explicit acceptance criteria.
- Low, resolved in plan: New plan/review directories require xdocs descriptors and
  parent-child links. Those files are part of this planning change.

## Sequencing Risks

Handler inputs must be narrowed before removing the parser. This prevents the Citty
tree from leaking framework-specific types into domain commands and makes the final
parser deletion mechanical. Documentation and task completion follow behavior and
precede the full matrix, so stale docs cannot be mistaken for validated delivery.

## Acceptance Criteria Review

Each unit names its goal, dependencies, expected files, behavior boundaries, tests,
acceptance criteria, and stop condition. The final unit covers typecheck, tests,
library build, bundle, single native binary, binary matrix, package launcher, public
API, outside-project help/version, errors, structured output, and xdocs health.

## TODO Alignment

The plan is linked to TODO task `2` and its task specification. The plan forbids
marking the task complete until the full verification unit passes and forbids any
release action without separate authorization.

## First Executable Unit

Install Citty through Bun, inspect the installed API/types, and add contract tests
for the command tree before replacing handler inputs.

## References

- [Citty migration plan](../../../plans/citty-cli-migration.md)
- [Citty migration task specification](../../../todo/citty-cli-migration.md)
- [TODO.md](../../../../TODO.md)
