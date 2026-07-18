---
name: Migrate xdocs To Full RFC 0034 Compliance
purpose: Define the required scope, breaking-change boundary, and acceptance signals for the xdocs RFC 0034 migration.
description: Captures what must be true after xdocs adopts a Bun-only TypeBox architecture, YAML configuration, the full agent namespace, and standardized release distribution.
created: 2026-07-18
flags:
  - approved
  - breaking-change
tags:
  - todo
  - cli
  - migration
keywords:
  - xdocs
  - RFC 0034
  - xdocs.yaml
  - agent prompt catalog
  - fourteen release assets
owner: xdocs-todo
---

# Migrate xdocs To Full RFC 0034 Compliance

## Summary

Make xdocs fully comply with GUIHO RFC 0034 through an approved breaking
migration. Compatibility with TOML, Node-based shared internals, root prompt
commands, plural agent commands, automatic agent writes, old cache paths,
`macos` assets, and the Bun-dependent npm launcher is not required.

## Todo Index

- Task: `4. Migrate xdocs To Full RFC 0034 Compliance`
- Status: todo
- Index: [TODO.md](../../TODO.md)

## Outcome

xdocs uses Bun, strict TypeScript ESM, raw Citty, and TypeBox; reads only
`xdocs.yaml`; implements exact startup, storage, Developer Context help, agent
skill/instruction/prompt, upgrade, installer, output, and npm bootstrap
contracts; keeps its four prompt workflows available through the agent
namespace; and publishes exactly twelve RFC binaries plus `guiho-s-xdocs` and
`guiho-i-xdocs`.

## Scope

### In scope

- TypeBox schemas for config, metadata, cache, releases, prompts, skills, flags,
  and stable JSON outputs.
- removing prohibited Node imports from core/shared source.
- breaking migration to `xdocs.yaml`.
- final Citty catalog and removal of root prompt/plural agents/scoped `-v`.
- standardized startup and `~/.guiho/xdocs/cache.json`.
- all help modes at every scope.
- complete explicit agent operations and removal of normal-command agent writes.
- consolidation of current prompts into the RFC prompt catalog/release asset.
- upgrade pagination and post-upgrade agent reconciliation.
- installers, Node npm bootstrap, exact fourteen assets, tests, CI, docs,
  architecture, skill, TODO, and descriptors.

### Out of scope

- Migrating every consumer repository in the same task.
- TOML compatibility or dual configuration.
- Publishing, versioning, tagging, pushing, or real global installation without
  separate authorization.
- Changing the xdocs document model unless required to decode it strictly with
  TypeBox.

## Acceptance Signals

- Core/shared source has no prohibited Node imports.
- `@sinclair/typebox` is a runtime dependency and decodes every structured
  boundary.
- `xdocs.yaml` follows exact explicit/cwd/global precedence and loaded-path
  reporting.
- No arguments prints exactly `Hello Windows - xdocs v<version>`.
- Foreground startup never awaits network and uses the standardized cache.
- Only `-h` and root `-v` exist.
- Every scope has standard help, Unicode tree help, positive depth, and clean
  Markdown docs generated from the Citty tree.
- The complete singular agent namespace is explicit and idempotent; ordinary
  scan/generate/meta/context/doctor commands do not mutate skills or
  instructions.
- `write`, `update`, `agents`, and `generate` prompts are available through
  `xdocs agent prompt`.
- Upgrade, installers, npm bootstrap, and agent reconciliation pass in isolated
  environments.
- Release verification observes exactly fourteen RFC-named assets and no
  `macos` names.
- Typecheck, tests, builds, xdocs self-validation, implementation review, and
  validation reporting pass.

## Dependencies And Context

- [Executable migration plan](../plans/rfc-0034-cli-compliance-migration.md)
- `guiho-a-0001-swe` is the coordinating Software Engineer/SWE agent.
- `guiho-s-0034-cli-engineer` is the mandatory specialist skill.
- Existing Citty, prompt embedding, agent skill installation, metadata
  validation, and upgrade transactions are implementation inputs, not public
  compatibility constraints.

## Watch-outs

- xdocs documents itself; source, docs, companion metadata, and tree links must
  remain consistent in every unit.
- Removing Node compatibility can affect public library exports; make each
  removal explicit in docs and tests.
- Normal documentation reads must not gain agent/global filesystem side
  effects.
- Help-docs and JSON output must remain clean and redirectable.
- Tests must isolate home, config, prompt/skill resources, instruction files,
  caches, network, and executable replacement.

## Before Starting

- Read AGENTS, TODO, this spec, and the complete plan.
- Load every agent/skill named in the plan.
- Re-run prohibited-import, public-export, configuration-consumer, agent-side-
  effect, and asset inventories.
- Confirm baseline checks and an understood worktree.

## While Working

- Execute one numbered plan unit at a time.
- Treat compatibility breaks as approved; do not add dual paths.
- Update docs, the bundled skill, tests, TODO/implementation notes, and xdocs
  descriptors in the same unit.
- Stop before remote release, Mirror, push, or real global installation actions.

## After Finishing

- Run implementation review and validation reporting.
- Keep task status `testing` until the full completion gate passes.
- Produce downstream `xdocs.yaml` migration handoff.
- Request separate authorization for versioning and publication.

## Related Files

- [Implementation plan](../plans/rfc-0034-cli-compliance-migration.md) -
  Ordered implementation units and validation gates.
- [Previous Citty plan](../plans/citty-cli-migration.md) - Current command
  migration baseline to supersede where incompatible.
- [Upgrade reliability plan](../plans/upgrade-reliability-implementation.md) -
  Existing transactional behavior to preserve and extend.
- [Plan review](../reviews/plans/rfc-0034-cli-compliance-migration-review.md) -
  Ready-for-execution review of Bun-only, prompt, distribution, and
  self-documentation sequencing.

## References

- [TODO.md](../../TODO.md)
- [AGENTS.md](../../AGENTS.md)
