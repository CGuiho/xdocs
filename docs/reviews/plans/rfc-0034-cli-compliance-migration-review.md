---
name: xdocs RFC 0034 CLI Compliance Migration Plan Review
purpose: Verify that the xdocs RFC 0034 migration plan is executable, complete, and safely sequenced.
description: Reviews the Bun-only, TypeBox, YAML, agent, prompt, distribution, and self-documentation migration against current xdocs constraints.
created: 2026-07-18
flags:
  - approved
  - ready-for-execution
tags:
  - review
  - plan
  - cli
keywords:
  - xdocs
  - RFC 0034
  - xdocs.yaml
  - plan readiness
owner: xdocs-plan-reviews
---

# xdocs RFC 0034 CLI Compliance Migration Plan Review

## Verdict

Ready for execution.

## Findings

No blocker or high-severity finding remains.

- Medium, resolved: Removing Node built-ins can break shared library exports,
  not only the CLI. XD-01 inventories public exports and XD-03 requires each
  breaking removal to be explicit and tested.
- Medium, resolved: The current agent system mutates global skills during bare
  and data commands. XD-06 removes startup automation; XD-08 and XD-09 replace
  it with the complete explicit skill/instruction namespace.
- Medium, resolved: The current four prompts could have been collapsed or lost.
  XD-10 retains all four raw bodies, adds a canonical manifest, exposes them
  through `agent prompt`, embeds them, and creates one exact release archive.
- Medium, resolved: The config plan initially left auto-agent settings
  undecided. XD-04 now deletes the three mutation/tool fields explicitly while
  retaining `[ai].mode`.
- Medium, resolved: Current release assets use `macos` and omit agent bundles.
  XD-13 through XD-15 define installers, a Node bootstrap at
  `scripts/xdocs-bin.mjs`, exact names, packaging, and expected-set validation.
- Low, resolved: xdocs must document its own planning changes; companion
  descriptors and plan-review metadata are part of this unit.

## Sequencing Risks

TypeBox and Bun-only platform work correctly precede YAML, command, startup,
agent, and prompt behavior. Agent/prompt resources precede upgrade/installers
and release packaging. Documentation and downstream handoff follow stable
behavior and precede final self-validation.

## Acceptance Criteria Review

The plan covers all RFC completion-gate areas plus xdocs-specific document
model, public API, prompt preservation, and self-documentation risks. The final
unit verifies source, library, CLI, builds, npm bootstrap, installers, assets,
and xdocs health without authorizing a release.

## TODO Alignment

xdocs TODO task `4` links the specification and plan and remains `todo`. Existing
JSON-output and upgrade-reliability tasks remain independent and are not
prematurely completed.

## First Executable Unit

XD-01: capture baseline, prohibited imports, public exports, config consumers,
agent side effects, prompts, caches, and release assets.

## Recommended Next Skill

Use `guiho-s-0023-plan-executor` with `guiho-s-0034-cli-engineer`.

## References

- [Migration plan](../../plans/rfc-0034-cli-compliance-migration.md)
- [Task specification](../../todo/rfc-0034-cli-compliance-migration.md)
- [TODO.md](../../../TODO.md)
