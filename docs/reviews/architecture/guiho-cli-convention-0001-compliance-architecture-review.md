---
name: XDocs GUIHO CLI Convention 0001 Compliance Architecture Review
purpose: Independently determine whether the fallback convention-compliance architecture is sealed and ready for plan revision.
description: Independent acceptance review of corrected fallback provenance, manifest ownership, target identity, lifecycle feasibility, validation, release, safety, and production boundaries.
created: 2026-08-17
owner: xdocs-architecture-reviews
flags:
  - ready-for-planning
  - fallback-review
  - re-review
tags:
  - review
  - architecture
  - cli
  - convention
keywords:
  - GUIHO CLI Convention 0001
  - fallback architecture
  - artifacts.json
  - stable target ID
  - Windows uninstall
---

# XDocs GUIHO CLI Convention 0001 Compliance Architecture Review

## Verdict

**Ready for planning.**

The exact corrected fallback architecture is sealed enough for a
`guiho-a-0046-plan-writer` handoff. All four prior high-severity findings are
resolved in the durable architecture. No unresolved product or architecture
decision remains for the plan executor to invent.

## Review scope and provenance

This is an independent re-review of the exact current working-tree artifact at
`docs/architecture/guiho-cli-convention-0001-compliance-architecture.md`, bound
to SHA-256
`8532586ae3b91614443835f2e510b2cefb5e264c876e263f427b9a38a045700a`.

The canonical `guiho-a-0043-software-architect` route failed twice to emit an
artifact. The SWE Maestro then materialized and bounded the fallback. The
architecture now discloses that provenance explicitly and does not claim that
`0043` produced or approved it. This `0045` review accepts the corrected
fallback's exact architecture content; it does not rewrite lifecycle history.

The review traced the fallback against GUIHO CLI Convention 0001, the live
Go/Cobra repository, the compliance audit, the rejected migration plan and plan
review, repository instructions, task/TODO state, Mirror configuration, XDocs
configuration, lifecycle scripts, release builders, workflows, and tests.

## Findings

No unresolved blocker, high, medium, or low architecture finding remains.

## Resolution of prior findings

### AR-001 - Resolved: fallback provenance is explicit

The status and authority section records both failed `0043` emissions, the SWE
Maestro's scoped fallback materialization, the sources used, and the rule that
the fallback must not be described as produced or approved by `0043`. It
remains proposed until this independent review accepts its exact bytes.

### AR-002 - Resolved: manifest and installed ownership have one bounded schema

Schema version 1 now separates responsibilities without a self-digest or
mutable installed-state loop:

- `controlFiles` owns `artifacts.json` and `checksums.txt`; the checksum file
  authenticates the manifest and does not checksum itself;
- ordinary `artifacts` are checksum-bearing, `replaceable` release records with
  only `version` or exact `shared-launcher` path bases;
- `ownedPaths` declares non-release configuration, persistent, cache,
  transaction, and projection ownership under fixed `cli-home`, `project`, or
  `agent-global` bases;
- projection behavior exists on the canonical artifact record rather than a
  second top-level projection catalog; and
- `installed-artifacts.json` stores the selected manifest and realized paths by
  stable ID without redefining ownership classes, rules, or destinations.

This gives install, repair, upgrade, rollback, and uninstall one strict source
for asset ownership and one realized-state record. The plan must implement
semantic validation between artifact projection rules and the allowed
`ownedPaths` boundary, but it does not need to choose a new architecture.

### AR-003 - Resolved: target identity is collision-free

The architecture defines eight canonical target IDs and their exact build
controls. `linux-armv7` uses `GOARCH=arm GOARM=7`; `linux-armv6` uses
`GOARCH=arm GOARM=6`. The canonical target ID, not literal `GOARCH`, owns
artifact IDs, asset names, selectors, linker `buildTarget`, installer
selection, installed state, and candidate self-test. Every build sets
`CGO_ENABLED=0`; no FreeBSD target or unsupported performance variant is added.

### AR-004 - Resolved: Windows direct uninstall has an honest bounded handshake

PowerShell uninstall remains external and fully synchronous. Direct Windows
Cobra uninstall synchronously plans, confirms, validates, and removes unlocked
manifest-owned paths, then hands a strict checksummed record to the verified
launcher and fixed system-owned finalizer for only the two locked executable
images. PID/start identity, ownership token, exact paths, no-follow checks,
completion journal, and recovery command are explicit.

The direct command reports `post-exit finalization accepted`, never
`uninstall complete` or `scheduled`. It returns nonzero when handoff fails and
retains evidence for repair. The exception is uninstall-only; install, repair,
activation, rollback, and upgrade remain synchronous and verified in their
originating invocation.

## Architecture trace

| Review area | Accepted architecture boundary |
| --- | --- |
| Runtime and components | Native Go 1.26.5, one Cobra tree, strict typed boundaries, `internal/installation` selected, launcher and scripts kept outside domain behavior. |
| Configuration | Distinct project/global YAML, separate schemas/examples, typed inheritance, strict decode, offline validation, pinned schema URLs. |
| Agent authorization | Exact `upgrade` and `issues.bugs|improvements|reviews` leaves; only `disabled`, `always-ask`, and `always-proceed`; unresolved defaults are `always-ask`. |
| Ownership and projections | Strict release manifest, fixed path bases, stable IDs, manifest-authoritative replacement/removal, realized installed state without ownership redefinition. |
| Launcher and recovery | Immutable payloads, strict relative pointer, active/previous fallback, exact exit propagation, atomic activation, journals, process-identity locks, fail-closed ambiguity. |
| Install and repair | Complete paginated release selection, checksums and self-test before mutation, shared transaction model, persistent-data preservation, idempotent PATH/projection repair. |
| Upgrade | Whole-release foreground transaction, mandatory first/final recovery block, no scheduled result or detached success authority. |
| Uninstall | One typed plan across Cobra and scripts, destructive default plus preservation controls, exact ownership, confirmation, shared-path protection, bounded Windows finalization exception. |
| Release | Eight payloads and eight launchers plus complete agent/config/manifest/checksum assets; no hard-coded asset count; Mirror-only target resolution and release-preparation PR. |
| Validation and safety | Test-owned homes, native Windows/Linux/macOS lifecycle checks, honest build-only foreign ARM evidence, secret-file refusal, complete Mirror/RunX/XDocs/Go/workflow gates. |
| Lifecycle and production | Per-unit branches/worktrees/PRs, `0048` through `0052` gates, additional exact-head Kimi review, fresh automation inspection, separate exact human approval for any production effect. |

## Missing decisions and questions

None. The sealed CLI home `xdocs`, main skill `guiho-s-xdocs`, and main prompt
`guiho-p-xdocs` remain authoritative and must not be reopened by planning.

## Residual risks and planning obligations

- The live source is intentionally still noncompliant; this verdict approves
  architecture for plan revision, not implementation, release, or production.
- The rejected plan must be replaced with an explicit dependency DAG, exact
  non-overlapping path ownership, focused units, stop conditions, question
  ledgers, and per-unit branch/worktree/PR/review/validation/integration gates.
- Native Windows tests must prove the direct-uninstall accepted/pending journal
  semantics and the synchronous PowerShell outcome. Linux and macOS must each
  run native POSIX lifecycle checks. Foreign ARM remains build-only unless a
  matching runner or device actually executes it.
- Release preparation must resolve the live minor target on clean integrated
  `main`, review target-bearing resources in a dedicated PR, reproduce the same
  Mirror plan after merge, and re-inspect tag automation immediately before
  apply.
- GitHub Release publication is not production deployment. Deployment,
  promotion, traffic, DNS, production data, or secret mutation still requires
  separate exact human approval.

## Planning readiness

Proceed to `guiho-a-0046-plan-writer` using `guiho-s-0022-plan-writer`. The
existing migration plan remains rejected and must be revised against this
accepted architecture and every actionable finding in the existing plan
review. The revised plan must return to `guiho-a-0047-plan-reviewer`; this
verdict does not authorize direct specialist execution or implementation.

## References

- [Fallback architecture](../../architecture/guiho-cli-convention-0001-compliance-architecture.md)
- [Compliance audit](../implementation/guiho-cli-convention-0001-compliance-review.md)
- [Migration plan review](../plans/guiho-cli-convention-0001-compliance-migration-review.md)
- [Migration plan](../../plans/guiho-cli-convention-0001-compliance-migration.md)
- [Task specification](../../todo/guiho-cli-convention-0001-compliance-migration.md)
- [Repository instructions](../../../AGENTS.md)
- [Local TODO](../../../TODO.md)
- `C:\GUIHO\guiho\docs\conventions\guiho-convention-0001-cli.md`
