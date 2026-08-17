---
name: XDocs GUIHO CLI Convention 0001 Compliance Migration Plan
purpose: Sequence the approved breaking migration to complete GUIHO CLI Convention 0001 compliance through question-sealed PR units.
description: Serial dependency plan with exact ownership, isolated worktrees, canonical lifecycle gates, native platform validation, aggregate Kimi review, and separately reviewed release preparation.
created: 2026-08-16
owner: xdocs-plans
flags:
  - approved-scope
  - breaking-change
  - revision-for-review
tags:
  - cli
  - convention
  - migration
  - release-lifecycle
keywords:
  - GUIHO CLI Convention 0001
  - guiho-p-xdocs
  - stable launcher
  - immutable payload
  - artifacts.json
  - xdocs.global.yaml
  - per-unit pull request
  - question ledger
---

# XDocs GUIHO CLI Convention 0001 Compliance Migration Plan

## Plan status

This is the complete revision requested by the plan review. It is **not yet an
execution authorization**. It must receive a `Ready for execution` verdict from
`guiho-a-0047-plan-reviewer`, then the complete accepted planning tree must be
integrated on `main` before `guiho-a-0048-plan-executor` may start Unit U01.

The prior one-branch plan is superseded by this PR-per-unit plan. The prior
[plan review](../reviews/plans/guiho-cli-convention-0001-compliance-migration-review.md)
remains the durable reason for the revision until `0047` re-reviews these exact
bytes.

## Accepted inputs and sealed decisions

- Convention: `C:\GUIHO\guiho\docs\conventions\guiho-convention-0001-cli.md`.
- Audit: [compliance review](../reviews/implementation/guiho-cli-convention-0001-compliance-review.md), findings `CLI-CONV-001` through `CLI-CONV-020`.
- Accepted architecture:
  [GUIHO CLI Convention 0001 compliance architecture](../architecture/guiho-cli-convention-0001-compliance-architecture.md),
  SHA-256 `8532586ae3b91614443835f2e510b2cefb5e264c876e263f427b9a38a045700a`.
- Architecture review:
  [Ready for planning](../reviews/architecture/guiho-cli-convention-0001-compliance-architecture-review.md).
- Task: [migration task specification](../todo/guiho-cli-convention-0001-compliance-migration.md).
- CLI name and CLI-home name: `xdocs`; CLI home:
  `$HOME/.guiho/xdocs/`.
- Main skill: `guiho-s-xdocs`.
- Main prompt: `guiho-p-xdocs`.
- Migration compatibility: intentionally breaking; no compatibility aliases or
  old installed-layout support.
- Version authority: Mirror only. The outcome is the live next minor, not a
  hard-coded `0.11.0`.
- Implementation push and the next-minor source/GitHub Release transition are
  authorized, subject to the gates below.
- The canonical `0043` architect failed twice to emit. The SWE Maestro
  materialized the scoped fallback that `0045` independently accepted. This
  provenance must remain visible and must not be rewritten as a successful
  `0043` run.
- There are no unresolved product or architecture questions. Do not reopen the
  CLI home, main skill, prompt ID, manifest model, target IDs, configuration
  merge rules, or Windows-uninstall handshake during execution.

## Scope and non-goals

The outcome is complete convention compliance across Go/Cobra behavior,
mandatory project tooling, XDocs coverage, dual configuration, agent policy
and resources, stable launcher, immutable payloads, release manifests,
installation, synchronous upgrade, uninstall, documentation, validation,
automation, and Mirror publication.

The following remain outside scope:

- making `source/` or TypeScript an active runtime, build, release, or version
  input;
- preserving `.local/bin`, one-file configuration fallback, fixed eleven-asset
  releases, public `update` agent leaves, prefixed version output, or scheduled
  upgrade behavior;
- adding nonstandard short aliases, cgo, unsupported targets, or dependencies
  outside the accepted Go/Cobra/standard-library/YAML boundary;
- inspecting or changing secret material; and
- any production deployment, promotion, traffic, DNS, production-data, or
  secret mutation.

## P00 - Planning integration and immutable execution base

Before implementation, the Maestro must place the following accepted artifacts
on `main` through a reviewed planning-only Git change:

- `docs/architecture/guiho-cli-convention-0001-compliance-architecture.md`;
- `docs/reviews/architecture/guiho-cli-convention-0001-compliance-architecture-review.md`;
- `docs/reviews/implementation/guiho-cli-convention-0001-compliance-review.md`;
- this plan;
- the `0047` plan review;
- `docs/todo/guiho-cli-convention-0001-compliance-migration.md`;
- `TODO.md`; and
- their XDocs descriptors plus the question-ledger descriptors.

After integration, the Maestro records the exact `main` SHA in the U01 handoff
as `PLANNING_BASE_SHA`. U01 must verify that the SHA is the checked-out commit,
is reachable from refreshed `main`, contains the accepted architecture hash,
and contains a `Ready for execution` plan review. A symbolic branch name or a
working-tree state is not an approved base. Failure stops before branch or
worktree creation.

Each later unit uses the exact `main` integration SHA returned by `0052` for its
immediate predecessor. The unit ledger records that SHA before substantive
edits. This deterministic handoff is the base-commit source; executors must not
guess or use a stale local `main`.

## Mandatory execution and delivery contract

Every U- or R-unit below inherits all of these gates.

1. `guiho-a-0048-plan-executor` owns orchestration. It verifies the exact base,
   creates the declared branch and isolated worktree, sets the task milestone,
   and creates the unit question ledger before implementation.
2. The actual implementation workhorse under `0048` is OpenCode
   `deepseek/deepseek-v4-pro` at maximum reasoning. The handoff must record the
   exact model, reasoning setting, and OpenCode session/job evidence. `0048`
   must not silently substitute another model or perform an unrecorded fallback.
   If this binding is unavailable, the unit stops unchanged and returns to the
   Maestro as a runtime blocker.
3. The workhorse may edit only the unit's exact product paths, the common
   serialized control paths, and generated ignored output needed for checks.
   It must preserve unrelated work and must not implement on `main`.
4. The unit is formatted and validated in its isolated worktree. Each smallest
   coherent validated change is explicitly staged, committed, and pushed.
5. `0048` opens a PR targeting `main` and records base SHA, head SHA, URL,
   changed paths, checks, deviations, ledger path, and the exact implementation
   log path defined below. The implementation log and its descriptor entry are
   part of the reviewed feature-branch head.
6. `guiho-a-0049-implementation-reviewer` reviews the immutable PR head and
   persists non-head-mutating PR evidence outside the reviewed branch. Any
   finding returns to `0048`; a new head invalidates prior review evidence.
7. `guiho-a-0050-validation-reporter` validates the same head only after `0049`
   accepts it and persists non-head-mutating PR evidence outside the reviewed
   branch. A new head invalidates validation.
8. `guiho-a-0052-pull-request-integrator` reobserves the accepted head, checks,
   branch protection, mergeability, and the merge strategy allowed by the live
   repository. It merges without bypassing protection, then materializes the
   accepted `0049` and `0050` evidence at the exact review and validation paths
   below in a governance-only commit on `main`. That commit may touch only those
   two records and their child descriptors; it cannot alter the reviewed product
   head and therefore does not invalidate its evidence. It verifies both the PR
   head and governance commit are reachable from `main`, then deletes only the
   merged branch and its associated worktree.
9. The next unit cannot start until `0052` returns the exact integrated `main`
   SHA. All units are deliberately serial; no two implementation PRs from this
   plan may be open concurrently.

### Common serialized control paths

The active unit exclusively owns these shared paths for its milestone and
question record; because the DAG is serial, ownership never overlaps:

- `TODO.md`;
- `docs/todo/guiho-cli-convention-0001-compliance-migration.md`;
- `docs/questions/guiho-cli-convention-0001-compliance-migration/guiho-cli-convention-0001-compliance-migration-questions.xdocs.md`; and
- the unit's unique ledger named in the delivery matrix;
- `docs/todo/guiho-cli-convention-0001-compliance-migration/guiho-cli-convention-0001-compliance-migration-implementation.xdocs.md`;
- `docs/reviews/implementation/guiho-cli-convention-0001-compliance-migration/guiho-cli-convention-0001-compliance-migration-reviews.xdocs.md`;
- `docs/validation/guiho-cli-convention-0001-compliance-migration/guiho-cli-convention-0001-compliance-migration-validation.xdocs.md`; and
- the unit's exact implementation log, implementation review, and validation
  report derived by the governance-evidence contract below.

Only units that explicitly list `runx.yaml` or a shared XDocs descriptor may
edit that file. A later sequential unit may extend a shared file after the
earlier owner is integrated; concurrent ownership is forbidden.

### Governance-evidence path and ownership contract

The delivery matrix's question-ledger basename without `.md` is the unit's
exact `<evidence-stem>`. Thus U01 is `u01-runx`, U02 is
`u02-xdocs-coverage`, through U25 `u25-publish`, and R01 is
`r01-release-prep`. No agent chooses another filename. Every normal unit owns:

- implementation log:
  `docs/todo/guiho-cli-convention-0001-compliance-migration/<evidence-stem>-implementation.md`;
- immutable implementation review:
  `docs/reviews/implementation/guiho-cli-convention-0001-compliance-migration/<evidence-stem>-review.md`; and
- immutable validation report:
  `docs/validation/guiho-cli-convention-0001-compliance-migration/<evidence-stem>-validation.md`.

U01 creates the three evidence directories and these exact descriptors before
its first product commit:

- `docs/todo/guiho-cli-convention-0001-compliance-migration/guiho-cli-convention-0001-compliance-migration-implementation.xdocs.md`, subject
  `xdocs-cli-convention-0001-implementation-logs`, parent `xdocs-todo`;
- `docs/reviews/implementation/guiho-cli-convention-0001-compliance-migration/guiho-cli-convention-0001-compliance-migration-reviews.xdocs.md`, subject
  `xdocs-cli-convention-0001-implementation-reviews`, parent
  `xdocs-implementation-reviews`; and
- `docs/validation/guiho-cli-convention-0001-compliance-migration/guiho-cli-convention-0001-compliance-migration-validation.xdocs.md`, subject
  `xdocs-cli-convention-0001-validation-reports`, parent `xdocs-validation`.

In the same U01 branch, `0048` registers those children in the exact parent
descriptors `docs/todo/todo.xdocs.md`,
`docs/reviews/implementation/implementation.xdocs.md`, and
`docs/validation/validation.xdocs.md`. Every unit's `0048` writes its
implementation log and registers it in the implementation-log descriptor on
the feature branch before the final reviewed head. Every unit's `0052`, only
after merging that accepted head, converts the non-head-mutating `0049` and
`0050` evidence into the exact review and validation files and registers them
in their child descriptors in the governance-only `main` commit described
above. Each record names unit, attempt, PR URL, base SHA, immutable reviewed
head SHA, evidence source, authoring agent, verdict, and resulting integrated
main SHA; the implementation log also records exact OpenCode model/session
evidence and changed paths.

Corrective units use one deterministic new `<evidence-stem>`:
`c-<owning-evidence-stem>-aNN`, where `NN` is the two-digit, one-based next
attempt absent from refreshed `main` (`a01`, then `a02`). Their question ledger
is `<questions-directory>/<evidence-stem>.md`; the three evidence paths use the
same formulas above. A corrective record also lists every triggering Kimi or
gate finding ID. This makes attempts unique and traceable without inventing a
new topology.

### Question-ledger contract

Each ledger is created before code edits and contains evidence, candidate
answers, chosen answer, rationale, confidence, reversibility, action, and human
review status. It records `none - sealed by accepted architecture` when no
question arose. Safe reversible implementation details may use existing Go
style, injected test paths, and the smallest local helper. The executor must
not choose a new package boundary, manifest field, public command, target,
policy value, provider, dependency, release effect, or production behavior.

If repository truth contradicts architecture, an exact owned path has moved, a
new external dependency appears necessary, a secret-bearing path would need to
be opened, or a production effect appears, the unit records the evidence and
stops/requeues. It does not ask the human overnight and does not silently
redesign the system.

### Common safety and validation rules

- Never open, list, diff, search, decrypt, execute, or modify `.env`,
  `encrypted.env`, key, credential, certificate-private-key, or secret-value
  files or directories that contain them.
- Text review is limited to the explicit in-scope tracked paths.
- Every runtime/lifecycle probe uses a test-owned home, project, PATH, CLI home,
  cache, agent targets, and staging root. Record before/after evidence proving
  the developer's real home and shared GUIHO paths were unchanged.
- Disable advisory background update work in deterministic probes.
- Run Go checks sequentially on Windows. Use isolated task-specific Go caches
  if the shared cache is inaccessible; do not misclassify cache access as a
  source failure.
- Use RunX discovery after U01. Before a cataloged mutating or high-impact
  operation run `runx describe`, `runx reveal`, and
  `runx run --dry-run <uid>`.
- Generated `bin/`, `dist/`, release staging, downloaded assets, and task caches
  are validation output and are never hand-edited or committed.
- Foreign target cross-builds are build-only unless the matching target is
  actually executed. Native lifecycle acceptance is mandatory separately on
  Windows, Linux, and macOS.

## Dependency DAG

```text
P00
 -> U01 -> U02 -> U03 -> U04 -> U05 -> U06 -> U07 -> U08 -> U09
 -> U10 -> U11 -> U12 -> U13 -> U14 -> U15 -> U16 -> U17 -> U18
 -> U19 -> U20 -> U21 -> U22 -> U23 -> U24 -> U25
 -> K00 aggregate Kimi exact-head gate
 -> M00 live clean-main Mirror target plan
 -> R01 release preparation PR
 -> K01 final release-preparation Kimi gate
 -> M01 clean-main Mirror re-plan/apply and remote verification
```

The serial DAG is intentional. Shared task, ledger-index, RunX, descriptor, and
runtime adapter paths never have concurrent owners. Numeric order is not merely
advisory: every arrow is an integration dependency.

## Delivery matrix

All PRs target `main`; cleanup owner is `0052`. Worktree paths are exact and
must be absent before creation.

| Unit | Base | Branch | Isolated worktree | Question ledger |
| --- | --- | --- | --- | --- |
| U01 | `PLANNING_BASE_SHA` | `codex/cli-conv-0001-u01-runx` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u01-runx` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u01-runx.md` |
| U02 | U01 integrated SHA | `codex/cli-conv-0001-u02-xdocs-coverage` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u02-xdocs-coverage` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u02-xdocs-coverage.md` |
| U03 | U02 integrated SHA | `codex/cli-conv-0001-u03-config` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u03-config` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u03-config.md` |
| U04 | U03 integrated SHA | `codex/cli-conv-0001-u04-artifacts` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u04-artifacts` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u04-artifacts.md` |
| U05 | U04 integrated SHA | `codex/cli-conv-0001-u05-install-state` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u05-install-state` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u05-install-state.md` |
| U06 | U05 integrated SHA | `codex/cli-conv-0001-u06-journal-lock` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u06-journal-lock` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u06-journal-lock.md` |
| U07 | U06 integrated SHA | `codex/cli-conv-0001-u07-process-identity` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u07-process-identity` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u07-process-identity.md` |
| U08 | U07 integrated SHA | `codex/cli-conv-0001-u08-agent-resources` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u08-agent-resources` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u08-agent-resources.md` |
| U09 | U08 integrated SHA | `codex/cli-conv-0001-u09-projections` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u09-projections` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u09-projections.md` |
| U10 | U09 integrated SHA | `codex/cli-conv-0001-u10-launcher` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u10-launcher` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u10-launcher.md` |
| U11 | U10 integrated SHA | `codex/cli-conv-0001-u11-cobra-contract` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u11-cobra-contract` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u11-cobra-contract.md` |
| U12 | U11 integrated SHA | `codex/cli-conv-0001-u12-release-catalog` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u12-release-catalog` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u12-release-catalog.md` |
| U13 | U12 integrated SHA | `codex/cli-conv-0001-u13-release-build` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u13-release-build` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u13-release-build.md` |
| U14 | U13 integrated SHA | `codex/cli-conv-0001-u14-init` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u14-init` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u14-init.md` |
| U15 | U14 integrated SHA | `codex/cli-conv-0001-u15-transaction` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u15-transaction` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u15-transaction.md` |
| U16 | U15 integrated SHA | `codex/cli-conv-0001-u16-install-posix` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u16-install-posix` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u16-install-posix.md` |
| U17 | U16 integrated SHA | `codex/cli-conv-0001-u17-install-windows` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u17-install-windows` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u17-install-windows.md` |
| U18 | U17 integrated SHA | `codex/cli-conv-0001-u18-upgrade` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u18-upgrade` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u18-upgrade.md` |
| U19 | U18 integrated SHA | `codex/cli-conv-0001-u19-uninstall-core` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u19-uninstall-core` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u19-uninstall-core.md` |
| U20 | U19 integrated SHA | `codex/cli-conv-0001-u20-uninstall-posix` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u20-uninstall-posix` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u20-uninstall-posix.md` |
| U21 | U20 integrated SHA | `codex/cli-conv-0001-u21-uninstall-windows` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u21-uninstall-windows` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u21-uninstall-windows.md` |
| U22 | U21 integrated SHA | `codex/cli-conv-0001-u22-current-docs` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u22-current-docs` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u22-current-docs.md` |
| U23 | U22 integrated SHA | `codex/cli-conv-0001-u23-native-harness` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u23-native-harness` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u23-native-harness.md` |
| U24 | U23 integrated SHA | `codex/cli-conv-0001-u24-ci` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u24-ci` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u24-ci.md` |
| U25 | U24 integrated SHA | `codex/cli-conv-0001-u25-publish` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-u25-publish` | `docs/questions/guiho-cli-convention-0001-compliance-migration/u25-publish.md` |
| R01 | M00 recorded main SHA | `codex/cli-conv-0001-r01-release-prep` | `C:\GUIHO\worktrees\xdocs-cli-conv-0001-r01-release-prep` | `docs/questions/guiho-cli-convention-0001-compliance-migration/r01-release-prep.md` |

## Unit cards

### U01 - Bootstrap the current RunX catalog

**Outcome:** satisfy the mandatory RunX baseline before unfamiliar operations.

**Exact product paths:** `runx.yaml`, `xdocs.xdocs.md`.

**Question seal:** catalog only commands executable at the U01 base. Stable UIDs
must not be reused; later units add their newly executable commands.

**Acceptance and verification:** RunX v2 has one namespace and exact secret-free
commands for current format, tidy check, test, vet, native build, Mirror check,
and XDocs checks. `runx check --format json`, `runx list --format json`,
`runx describe`, `runx reveal`, and dry runs of every entry pass.

**Failure/stop:** reject a legacy schema, undocumented command, mutable command
that cannot be dry-run safely, or any command containing a secret or `--yes`.

### U02 - Make hidden project-owned XDocs coverage real

**Outcome:** close the discovery gap and validate `.github` and `.vscode` as
owned directories.

**Exact product paths:** `internal/xdocs/discovery.go`,
`internal/xdocs/xdocs_test.go`, `internal/xdocs/ignore_test.go`,
`internal/xdocs/xdocs.xdocs.md`, `.vscode/vscode.xdocs.md`,
`.github/github.xdocs.md`, `.github/workflows/workflows.xdocs.md`,
`xdocs.yaml`, `xdocs.xdocs.md`, `XDOCS.md`.

**Question seal:** `.git` and ignored/generated tool state remain excluded by
explicit configuration or Git ignore policy; a leading dot alone never excludes
owned content.

**Acceptance and verification:** scan, strict metadata, tree, and doctor include
the tracked hidden directories, root/child links agree, and all owned root files
are registered. Focused xdocs tests and the full XDocs checks pass.

**Failure/stop:** stop if removing the heuristic would enter a secret-bearing or
unowned directory that cannot be excluded from existing policy without an
architecture change.

### U03 - Implement dual typed configuration and policy

**Outcome:** implement distinct global/project configuration, deterministic
inheritance, schemas, examples, pinned references, and exact agent-evolution
policy.

**Exact product paths:** `internal/config/config.go`,
`internal/config/config_test.go`, `internal/config/resources.go`,
`internal/config/config.xdocs.md`, `schemas/xdocs.schema.json`,
`schemas/xdocs.global.schema.json`, `schemas/schemas.xdocs.md`,
`examples/xdocs.example.yaml`, `examples/xdocs.global.example.yaml`,
`examples/examples.xdocs.md`, `internal/internal.xdocs.md`, `main.go`,
`cmd/root.go`, `xdocs.xdocs.md`.

**Question seal:** lists replace in full, explicit empty lists clear, known maps
merge recursively, scalars replace, and omitted leaves inherit. Policy leaves
and values are exactly those in the accepted architecture.

**Acceptance and verification:** strict decode rejects unknown fields, duplicate
keys, multiple documents, invalid policies, and contradictory settings; both
examples validate offline; effective values and source paths are deterministic
on native Windows and Unix paths. Run focused config tests and the common Go and
XDocs checks.

**Failure/stop:** no generic YAML merge, network-dependent runtime validation,
Boolean policy, or invented policy leaf is allowed.

### U04 - Seal the manifest and target model

**Outcome:** implement strict schema-version-1 release/installed manifests,
control files, owned paths, target IDs, path bases, checksums, and semantic
validation.

**Exact product paths:** `internal/artifact/model.go`,
`internal/artifact/validate.go`, `internal/artifact/checksum.go`,
`internal/artifact/model_test.go`, `internal/artifact/validate_test.go`,
`internal/artifact/checksum_test.go`, `internal/artifact/artifact.xdocs.md`,
`internal/internal.xdocs.md`.

**Question seal:** projection rules exist only on ordinary artifact records;
installed state records realization, not new ownership truth. Canonical target
IDs and class/base combinations are fixed by architecture.

**Acceptance and verification:** tests reject duplicate IDs/paths/checksums,
self-digests, extra or missing checksum entries, ARM identity collisions,
absolute/traversing/alternate-volume paths, invalid class/base pairs, and
duplicated projection authority.

**Failure/stop:** any need to change schema fields, target IDs, or ownership
classes returns to architecture; the executor does not improvise.

### U05 - Implement native paths and installed state

**Outcome:** provide injected `RuntimePaths`, strict active/previous state,
installed realization, atomic files, and containment checks.

**Exact product paths:** `internal/installation/paths.go`,
`internal/installation/state.go`, `internal/installation/atomic.go`,
`internal/installation/paths_test.go`, `internal/installation/state_test.go`,
`internal/installation/atomic_test.go`,
`internal/installation/installation.xdocs.md`, `internal/internal.xdocs.md`.

**Question seal:** production derives native paths from `os.UserHomeDir`;
tests inject every root. No symlink/reparse or alternate-volume escape is
accepted.

**Acceptance and verification:** Windows and Unix path tests cover spaces,
case/volume behavior, strict descendants, exact launcher path, active/previous
pointers, corrupt state, atomic replacement, and real-home nonmutation.

**Failure/stop:** fail closed on path canonicalization or ownership ambiguity.

### U06 - Implement journal, lock, and recovery primitives

**Outcome:** implement the accepted transaction phases, ownership-token lock,
process-verified stale recovery, garbage record, and deterministic recovery.

**Exact product paths:** `internal/installation/journal.go`,
`internal/installation/lock.go`, `internal/installation/recovery.go`,
`internal/installation/garbage.go`, `internal/installation/journal_test.go`,
`internal/installation/lock_test.go`, `internal/installation/recovery_test.go`,
`internal/installation/garbage_test.go`,
`internal/installation/installation.xdocs.md`.

**Question seal:** age never proves staleness; corrupted or permission-ambiguous
state is evidence to preserve and a fail-closed outcome.

**Acceptance and verification:** concurrent ownership, every forward/rollback
phase, interruption before/after activation, stale/non-stale identities, and
deferred inactive-payload cleanup are deterministic and atomic.

**Failure/stop:** no recovery may delete outside journal-owned validated paths.

### U07 - Implement process and instance identity

**Outcome:** register payload instances and verify current-user PID/start/path
identity separately on Windows, Linux, and macOS.

**Exact product paths:** `internal/installation/instance.go`,
`internal/installation/process.go`, `internal/installation/process_windows.go`,
`internal/installation/process_linux.go`,
`internal/installation/process_darwin.go`,
`internal/installation/instance_test.go`,
`internal/installation/process_test.go`,
`internal/installation/installation.xdocs.md`.

**Question seal:** filename-only matching is forbidden. Unknown permission,
owner, executable path, or start identity stops before termination/activation.

**Acceptance and verification:** native and injected tests cover PID reuse,
stale records, wrong user/path, unrelated child processes, permission failure,
and exact old-payload identification without killing the test runner.

**Failure/stop:** do not add a broad process-kill fallback or rely only on PID.

### U08 - Replace the canonical agent-resource contract

**Outcome:** install exact instruction, skill, and prompt resources with the
confirmed namespace and evolution guidance.

**Exact product paths:** `internal/agent/agent.go`,
`internal/agent/agent_test.go`, `internal/agent/agent.xdocs.md`,
`instructions/guiho-i-xdocs.md`, `instructions/instructions.xdocs.md`,
`prompts/guiho-p-xdocs.md`, `prompts/guiho-p-xdocs-write.md`,
`prompts/guiho-p-xdocs-refresh.md`, `prompts/guiho-p-xdocs-agents.md`,
`prompts/guiho-p-xdocs-generate.md`, `prompts/prompts.xdocs.md`,
`prompts/write.md`, `prompts/update.md`, `prompts/agents.md`,
`prompts/generate.md`, `prompts/guiho-i-xdocs.md`,
`skills/guiho-s-xdocs/SKILL.md`,
`skills/guiho-s-xdocs/guiho-s-xdocs.xdocs.md`, `skills/skills.xdocs.md`,
`main.go`, `xdocs.xdocs.md`.

**Question seal:** `guiho-p-xdocs` is the main prompt; all additional IDs use
that full prefix. The instruction canonical source moves to `instructions/`.
The main skill must contain the exact `## CLI Evolution and Feedback` heading.

**Acceptance and verification:** embedded catalog tests prove complete skill
show, namespaced prompt list/show, canonical repository/issue URLs, exact policy
guidance, no manual marker editing, and no public resource loss during archive
construction.

**Failure/stop:** do not reopen IDs or retain unprefixed compatibility prompts.

### U09 - Implement projection reconciliation and rollback snapshots

**Outcome:** project manifest-declared instruction/skill resources safely and
remove retired projections without creating a second authority.

**Exact product paths:** `internal/installation/projection.go`,
`internal/installation/snapshot.go`,
`internal/installation/projection_test.go`,
`internal/installation/snapshot_test.go`,
`internal/installation/installation.xdocs.md`.

**Question seal:** projection destinations come only from verified artifacts
and allowed `ownedPaths`; unmanaged bytes and line endings remain untouched.

**Acceptance and verification:** tests cover both global skill tools, bounded
instruction creation/update/removal, retired resources, malformed markers,
partial failure rollback, CRLF, and unrelated-file survival.

**Failure/stop:** malformed or duplicate markers stop all projections before
mutation.

### U10 - Build and validate the stable launcher

**Outcome:** deliver one launcher protocol across all eight target identities.

**Exact product paths:** `launcher/main.go`, `launcher/launcher.go`,
`launcher/launcher_unix.go`, `launcher/launcher_windows.go`,
`launcher/launcher_test.go`, `launcher/launcher.xdocs.md`,
`internal/installation/state.go`, `internal/installation/state_test.go`,
`xdocs.xdocs.md`.

**Question seal:** fallback occurs only when active is missing or cannot start;
payload command failure is returned unchanged and does not trigger fallback.

**Acceptance and verification:** native launcher tests prove strict pointers,
no escapes, original args/environment/cwd/stdio, exact exit codes, active and
previous behavior, and raw version dispatch. Cross-build all launcher targets
with exact target IDs and `CGO_ENABLED=0`.

**Failure/stop:** launcher protocol or backward-compatibility changes require
architecture review.

### U11 - Correct the live Cobra and help contract

**Outcome:** raw SemVer, exact help-tree behavior, `upgrade` agent leaves, full
skill show, and clean output on one fresh Cobra tree.

**Exact product paths:** `cmd/root.go`, `cmd/help.go`, `cmd/agent.go`,
`cmd/root_test.go`, `cmd/resources_test.go`, `cmd/cmd.xdocs.md`, `main.go`.

**Question seal:** depth accepts `max` or integers greater than one; global
flags print once unless `--help-tree-global-flags` is present; only `-h` and
root `-v` are short aliases.

**Acceptance and verification:** root/nested help, docs, tree, global-flag,
raw-version, output isolation, forbidden alias, forbidden public `update`, and
complete agent-resource command-tree tests pass with background work disabled.

**Failure/stop:** no compatibility alias or extra output may be added.

### U12 - Centralize complete release discovery and selection

**Outcome:** one typed paginated catalog selects exact version, exact channel,
or latest stable compatible complete release.

**Exact product paths:** `internal/release/catalog.go`,
`internal/release/semver.go`, `internal/release/catalog_test.go`,
`internal/release/semver_test.go`, `internal/update/update.go`,
`internal/update/update_test.go`, `internal/update/update.xdocs.md`,
`internal/release/release.xdocs.md`.

**Question seal:** draft, malformed, incomplete, checksum-invalid, target-missing
releases are ineligible; all pages are exhausted before ordering.

**Acceptance and verification:** tests cover all channels, full prerelease,
pagination/deduplication, invalid releases, target preservation including ARMv6
and ARMv7, default stable, and advisory update consumption without mutation.

**Failure/stop:** do not use GitHub latest-release or first-page shortcuts.

### U13 - Construct and verify the complete release

**Outcome:** generate eight payloads, eight launchers, all canonical resources,
schemas/examples, strict manifest, and full checksums from typed declarations.

**Exact product paths:** `internal/release/matrix.go`,
`internal/release/matrix_test.go`, `internal/release/manifest.go`,
`internal/release/manifest_test.go`, `devops/build-binaries.go`,
`devops/build_binaries_test.go`, `devops/verify-release-assets.go`,
`devops/verify_release_assets_test.go`, `devops/devops.xdocs.md`, `runx.yaml`.

**Question seal:** there is no hard-coded asset-count assertion. The declaration
and manifest determine completeness. Builder inputs are exact version, commit,
and RFC3339 build date.

**Acceptance and verification:** deterministic repeat builds, archive members,
embedded versions/targets, control files, manifest semantics, complete sorted
checksums, no extra/missing assets, eight payload/launcher cross-builds, and
RunX build/verify entries pass.

**Failure/stop:** any cgo dependency, target drift, dirty contradictory input,
or unversioned canonical resource stops construction.

### U14 - Rebuild `xdocs init` as reconciliation

**Outcome:** idempotently reconcile installed resources, both configs, policy,
instruction, skills, and xdocs project setup.

**Exact product paths:** `cmd/init.go`, `cmd/init_test.go`, `cmd/domain.go`,
`cmd/root_test.go`, `internal/config/reconcile.go`,
`internal/config/reconcile_test.go`,
`internal/installation/resource_store.go`,
`internal/installation/resource_store_test.go`, `cmd/cmd.xdocs.md`,
`internal/config/config.xdocs.md`,
`internal/installation/installation.xdocs.md`.

**Question seal:** preserve valid values; recommend `always-proceed`; skipped
policy answers remain `always-ask`; noninteractive missing answers fail.

**Acceptance and verification:** isolated first/repeat/repair init, both skill
targets, AGENTS creation and byte preservation, malformed markers, partial
configs, interactive/granular policy, noninteractive failure, pinned schema
references, absolute summaries, and byte-stable no-op pass.

**Failure/stop:** init cannot succeed from mutable repository resources when the
canonical installed resource store is missing or invalid.

### U15 - Implement the shared installation transaction engine

**Outcome:** synchronously install/repair immutable versions, snapshot/replace
projections, activate, verify, roll back, and clean up.

**Exact product paths:** `internal/installation/transaction.go`,
`internal/installation/activation.go`,
`internal/installation/rollback.go`,
`internal/installation/transaction_test.go`,
`internal/installation/activation_test.go`,
`internal/installation/rollback_test.go`,
`internal/installation/installation.xdocs.md`.

**Question seal:** previous verified payload remains until post-verification;
only inactive locked-payload garbage collection may be deferred.

**Acceptance and verification:** every journal phase, candidate version and
`__self-test`, manifest realization, projection replacement, atomic pointer,
launcher verification, failure injection, complete rollback, persistent
preservation, and exact staging cleanup pass.

**Failure/stop:** install/repair/activation/rollback may never return pending or
delegate success to a detached process.

### U16 - Replace the POSIX installer

**Outcome:** implement fresh install, repair, reinstall, upgrade, and downgrade
on Linux/macOS through one verified transaction.

**Exact product paths:** `devops/install.sh`,
`devops/install_sh_test.go`, `devops/installers_test.go`,
`devops/devops.xdocs.md`, `runx.yaml`.

**Question seal:** support only full `--version` and `--channel`, mutually
exclusive; default latest stable; install only under `.guiho` owned paths.

**Acceptance and verification:** mocked catalog and native Linux/macOS tests
cover pagination, paths with spaces, all checksum/manifest failures, staging,
self-test, PATH idempotence, repair, exact downgrade, persistent preservation,
retired projections, rollback, and real-home nonmutation. Run shell syntax on
both Linux and macOS and RunX dry-run the installer tests.

**Failure/stop:** unsupported target or incomplete release fails before any
installed-state change.

### U17 - Replace the PowerShell installer

**Outcome:** deliver behavior-equivalent Windows installation and repair.

**Exact product paths:** `devops/install.ps1`,
`devops/install_ps1_test.go`, `devops/installers_test.go`,
`devops/devops.xdocs.md`, `runx.yaml`.

**Question seal:** `-Version` and `-Channel` mirror POSIX semantics; user PATH
mutation is idempotent and never system-wide.

**Acceptance and verification:** native Windows tests cover the U16 matrix,
PowerShell parsing, Windows ARM/AMD64 mapping, registry/PATH isolation, locked
files, rollback, and real-home nonmutation. Cross-interface plan fixtures must
be byte-equivalent after native path normalization.

**Failure/stop:** no administrator requirement, `.local/bin`, unverified
download, or interpolated unsafe command is allowed.

### U18 - Replace `xdocs upgrade` with foreground whole-release upgrade

**Outcome:** complete the architecture transaction and remove in-place and
scheduled replacement.

**Exact product paths:** `cmd/upgrade.go`, `cmd/root.go`,
`cmd/root_test.go`, `internal/upgrade/upgrade.go`,
`internal/upgrade/upgrade_test.go`, `internal/upgrade/journal.go`,
`internal/upgrade/lock.go`, `internal/upgrade/guard_unix.go`,
`internal/upgrade/guard_windows.go`, `internal/upgrade/replace_unix.go`,
`internal/upgrade/replace_unix_test.go`,
`internal/upgrade/replace_windows.go`,
`internal/upgrade/upgrade.xdocs.md`, `runx.yaml`.

**Question seal:** old journal/lock/replacement authority is deleted or reduced
to the new orchestration; requested exact version/channel/default is preserved.

**Acceptance and verification:** mandatory recovery block is first and last for
success, up-to-date, dry-run, rollback, and failure; full release verification,
old-instance handling, activation, post-check, rollback, exact output, and
native Windows synchronous behavior pass. Search proves no `scheduled` result
or detached replacement authority remains.

**Failure/stop:** any inability to verify/terminate an old payload stops before
activation and leaves the prior release working.

### U19 - Implement the typed uninstall planner and Cobra surface

**Outcome:** produce the exact remove/preserve plan, confirmation behavior, and
manifest-authoritative common service.

**Exact product paths:** `internal/installation/uninstall.go`,
`internal/installation/uninstall_test.go`, `cmd/uninstall.go`,
`cmd/uninstall_test.go`, `cmd/upgrade.go`, `cmd/uninstall_unix.go`,
`cmd/uninstall_windows.go`, `cmd/cmd.xdocs.md`,
`internal/installation/installation.xdocs.md`.

**Question seal:** default is destructive; preservation flags, dry-run, and
confirmation have convention-exact semantics; shared GUIHO paths and PATH are
never removed.

**Acceptance and verification:** plan grouping, every preservation combination,
interactive/noninteractive confirmation, malformed/missing manifest fail-closed,
bounded instruction removal, unrelated-file survival, and exact owned-path
containment pass without deleting real files.

**Failure/stop:** an unverified or noncanonical executable cannot authorize
deletion.

### U20 - Add the POSIX uninstaller

**Outcome:** provide fully synchronous Linux/macOS uninstall equivalent to the
typed planner.

**Exact product paths:** `devops/uninstall.sh`,
`devops/uninstall_sh_test.go`, `devops/devops.xdocs.md`, `runx.yaml`.

**Question seal:** the script consumes the typed plan and does not invent
ownership or recursively erase shared parents.

**Acceptance and verification:** native Linux and macOS destructive-default,
preservation, dry-run, confirmation, paths-with-spaces, malformed state,
bounded markers, exact cleanup, shared-path survival, and real-home nonmutation
pass; shell syntax passes on both systems.

**Failure/stop:** no noninteractive mutation without `--yes` and no fallback to
filename-prefix discovery.

### U21 - Add synchronous PowerShell uninstall and bounded Windows finalization

**Outcome:** implement the accepted two Windows outcomes honestly: external
PowerShell completion and direct-Cobra post-exit finalization accepted.

**Exact product paths:** `devops/uninstall.ps1`,
`devops/uninstall_ps1_test.go`,
`internal/installation/finalizer_windows.go`,
`internal/installation/finalizer_windows_test.go`,
`cmd/uninstall_windows.go`, `cmd/uninstall_test.go`,
`launcher/launcher_windows.go`, `launcher/launcher_test.go`,
`devops/devops.xdocs.md`, `runx.yaml`.

**Question seal:** the fixed system-owned finalizer receives a strict argument
record; it never receives interpolated shell text. Direct Cobra never reports
complete or scheduled; PowerShell may report complete only after verification.

**Acceptance and verification:** native Windows tests cover token/digest,
PID/start identity, exact locked paths, handoff failure, completion/failed
journals, recovery command, preservation, finalizer acceptance, PowerShell
synchronous completion, unrelated-file survival, and real-home nonmutation.

**Failure/stop:** inability to create or validate the finalization record
returns nonzero and preserves evidence; no upgrade behavior may use this
exception.

### U22 - Align current documentation and structured metadata

**Outcome:** make every current user/agent/architecture surface describe the
new behavior while leaving dated historical evidence historical.

**Exact product paths:** `README.md`, `DOCS.md`, `ARCHITECTURE.md`,
`TECHNICAL.md`, `AGENTS.md`, `XDOCS.md`, `xdocs.xdocs.md`,
`cmd/cmd.xdocs.md`, `internal/internal.xdocs.md`,
`internal/config/config.xdocs.md`, `internal/agent/agent.xdocs.md`,
`internal/artifact/artifact.xdocs.md`,
`internal/installation/installation.xdocs.md`,
`internal/release/release.xdocs.md`, `internal/update/update.xdocs.md`,
`internal/upgrade/upgrade.xdocs.md`, `launcher/launcher.xdocs.md`,
`devops/devops.xdocs.md`, `skills/skills.xdocs.md`,
`skills/guiho-s-xdocs/guiho-s-xdocs.xdocs.md`,
`prompts/prompts.xdocs.md`, `instructions/instructions.xdocs.md`,
`schemas/schemas.xdocs.md`, `examples/examples.xdocs.md`.

**Question seal:** README's last operational section is `## Uninstall`; DOCS is
the complete release gate; historical review/decision files are not rewritten.

**Acceptance and verification:** stale-contract searches find no current claims
for eleven assets, `.local/bin`, single config, `xdocs v`, depth one, public
resource `update`, or scheduled upgrade. Remote install/uninstall commands,
destructive default, dry run, preservation, recovery, paths, schemas, policy,
and Windows pending semantics are exact. Full strict XDocs passes.

**Failure/stop:** do not add frontmatter to opted-out AGENTS/README or edit
generated release output.

### U23 - Build the isolated native lifecycle harness

**Outcome:** provide deterministic fixtures and end-to-end lifecycle acceptance
without touching a developer home.

**Exact product paths:** `internal/testutil/runtime_paths.go`,
`internal/testutil/fixtures.go`, `internal/testutil/testutil.xdocs.md`,
`internal/internal.xdocs.md`, `devops/lifecycle_acceptance_test.go`,
`devops/testdata/testdata.xdocs.md`,
`devops/testdata/releases/complete.json`,
`devops/testdata/releases/incomplete.json`, `devops/devops.xdocs.md`.

**Question seal:** fixtures contain only dummy, public, non-secret data.
Background updates are disabled. Test homes and PATH managers are explicit.

**Acceptance and verification:** harness covers fresh install, same-version
repair, newer upgrade, exact downgrade, rollback, interrupted recovery,
uninstall preservation/destruction, agent resources, schemas, launcher fallback,
and before/after real-home snapshots. It can be invoked independently on
Windows, Linux, and macOS.

**Failure/stop:** if a native platform job cannot prove isolation, it fails; it
is not replaced by cross-compilation.

### U24 - Make CI enforce the convention on all native platforms

**Outcome:** run the complete safe gate on Windows, Linux, and macOS.

**Exact product paths:** `.github/workflows/ci.yml`,
`.github/workflows/workflows.xdocs.md`, `devops/workflows_test.go`, `runx.yaml`.

**Question seal:** Windows runs PowerShell surfaces; Linux and macOS each run
POSIX surfaces natively. Foreign ARM payloads/launchers are labelled build-only
unless a matching runner executes them.

**Acceptance and verification:** workflow structural tests prove format/tidy/
test/vet/build, Mirror, RunX, strict XDocs, schemas/examples, release manifest,
all four lifecycle scripts, isolated lifecycle harness, raw version/help, and
artifact verification are required. Local workflow tests and YAML parsing pass.

**Failure/stop:** no platform may be represented by another platform's syntax
check or cross-build.

### U25 - Make publication enforce the complete release

**Outcome:** publish only a complete, verified, version-consistent release and
use the exact changelog version section.

**Exact product paths:** `.github/workflows/publish.yml`,
`.github/workflows/workflows.xdocs.md`, `devops/workflows_test.go`,
`devops/extract-release-notes/main.go`,
`devops/extract-release-notes/main_test.go`, `runx.yaml`.

**Question seal:** the workflow validates manifest-declared completeness rather
than a hard-coded total and performs source/GitHub Release publication only.

**Acceptance and verification:** workflow tests prove tag/version consistency,
clean target-bearing resources, complete native payload/launcher/resource set,
checksums, exact release notes, public exact-version installer smoke, and no npm
or historical TypeScript release path. Run all common and workflow checks.

**Failure/stop:** any deployment, promotion, traffic, DNS, database, or secret
effect blocks release pending exact human approval.

## K00 - Aggregate exact-main Kimi review

After U25 is integrated, refresh `main`, require a clean tree, and record its
exact SHA. OpenCode Kimi K3 at maximum reasoning performs an additional
read-only aggregate review of that exact SHA against the convention, audit,
accepted architecture, plan, all PR gate evidence, source, tests, workflows,
and docs. Persist the evidence without changing the reviewed head.

If Kimi finds a non-architectural defect, route it to a corrective instance of
the owning unit using branch
`codex/cli-conv-0001-c-<owning-unit>-<attempt>` and worktree
`C:\GUIHO\worktrees\xdocs-cli-conv-0001-c-<owning-unit>-<attempt>`. It may own
only that unit's exact product paths plus common control paths and must repeat
`0048 -> 0049 -> 0050 -> 0052`. Re-run K00 on the new clean exact `main` SHA.
An architecture or cross-unit ownership finding returns to architecture or plan
revision; it is never improvised as a mega-correction.

K00 is accepted only with no unresolved actionable finding and evidence naming
the exact integrated SHA.

## M00 - Resolve the live minor target without applying it

From a fresh isolated clean worktree at the K00-accepted `main` SHA:

1. refresh remote tags and `main`;
2. run the complete validation set;
3. use RunX describe/reveal/dry-run for the cataloged Mirror plan command;
4. run `mirror config check`;
5. run `mirror version plan minor` without apply; and
6. return a structured, read-only handoff to the Maestro containing the exact
   K00-bound `main` SHA, command/version evidence, target, and every
   commit/tag/push/changelog effect.

Stop if `main` is dirty, K00 is not bound to it, the plan is not a next minor,
or effects differ from `mirror.yaml`. M00 creates no version commit, tag, push,
release, branch, ledger, file, or worktree mutation. The Maestro passes the
structured result unchanged in the R01 `0048` invocation. `0048` verifies the
R01 base equals the handoff's K00-bound SHA, creates the declared R01 branch and
worktree, then writes the full handoff into the exact
`docs/questions/guiho-cli-convention-0001-compliance-migration/r01-release-prep.md`
ledger and commits that ledger before any target-bearing edit. Missing,
mismatched, or uncommitted handoff evidence stops R01; the executor may not
reconstruct or guess it.

## R01 - Prepare the exact live release target

**Outcome:** review every target-bearing source before Mirror apply.

**Exact product paths:** `CHANGELOG.md`, `skills/guiho-s-xdocs/SKILL.md`,
`schemas/xdocs.schema.json`, `schemas/xdocs.global.schema.json`,
`examples/xdocs.example.yaml`, `examples/xdocs.global.example.yaml`,
`docs/todo/guiho-cli-convention-0001-compliance-migration.md`, `TODO.md`, and
the R01 question ledger/index paths.

Prompts and instruction are intentionally not version-bearing source files;
their selected release version is supplied by the verified manifest/build
input. `artifacts.json` and checksums are deterministic build outputs and are
not checked in. R01 must not edit a target-bearing path outside the exact list;
such a discovery returns to plan revision.

**Acceptance and verification:** update the skill version, exact changelog
section, both schema IDs, and both example schema URLs to the M00 target. Run
the complete validation/release build with exact version, commit, and RFC3339
build date. `0049`, `0050`, and `0052` gate the immutable PR head and integrate
it to `main`.

**Failure/stop:** if live target changes before merge or another source proves
target-bearing, stop and re-plan rather than guessing.

## K01 - Final exact-head Kimi review

Kimi K3 at maximum reasoning reviews the immutable R01 PR head after `0049`
acceptance and before `0050` validation. Its non-head-mutating evidence must
name the same head. A finding returns to `0048`, invalidates all later evidence,
and requires another K01 review. `0052` merges only after `0049`, K01, and
`0050` accept the same head.

## M01 - Clean-main Mirror apply and remote verification

After R01 integration, `0052` or the release owner performs these gates from a
fresh clean `main` worktree:

1. verify R01 reachability and exact accepted evidence;
2. re-run the complete validation set and deterministic release construction;
3. inspect `.github/workflows/publish.yml` and every tag-triggered workflow
   immediately before apply, recording all effects;
4. stop for separate exact human approval if any tag can deploy, promote,
   route traffic, change DNS, mutate production data, rotate secrets, or cause
   another production effect;
5. RunX describe/reveal/dry-run the cataloged Mirror apply command;
6. run `mirror config check` and `mirror version plan minor` again;
7. require the target and effects to match M00 exactly;
8. apply the already authorized transition through Mirror only;
9. verify the release commit and canonical `xdocs/v<version>` tag are reachable
   from remote `main`;
10. monitor publication to completion and verify every manifest-declared asset,
    checksum, schema/example URL, exact release-note section, raw version, and
    native Windows AMD64 installation smoke; and
11. have `0050` reobserve integrated/released `main` and produce the final
    evidence-backed report before task completion/archive.

GitHub Release publication is not production deployment. M01 authorizes no
production mutation. Any changed target, dirty tree, failed gate, unexpected
Mirror mutation, unapproved automation effect, or missing remote evidence stops
without manual tags or workarounds.

## Full validation set

Every affected unit runs focused tests plus the applicable subset below. U22
through M01 run the full set:

```text
gofmt -l main.go cmd internal launcher devops
go mod tidy -diff
go test ./...
go vet ./...
go build -trimpath -o bin/xdocs.exe .
mirror config check
runx check --format json
runx list --format json
xdocs scan
xdocs meta . --documents --strict
xdocs tree
xdocs doctor . --warnings-as-errors
git diff --check
```

Also required:

- strict validation of both schemas and complete examples;
- raw `-v` and `--version` probes with notices/workers disabled;
- full help tree at `max` and numeric depth, with and without repeated global
  flags;
- deterministic complete release build and manifest/checksum verifier;
- eight payload and eight launcher cross-builds with exact build controls;
- native Windows AMD64 launcher/install/repair/upgrade/rollback/direct-uninstall/
  PowerShell-uninstall lifecycle acceptance;
- native Linux and native macOS launcher/install/repair/upgrade/rollback/
  uninstall lifecycle acceptance and POSIX syntax;
- PowerShell parser and native execution on Windows;
- real-home/shared-path before-and-after snapshots;
- workflow structural tests; and
- clean Git status at every integration/release boundary.

## Audit traceability

| Finding | Closing units |
| --- | --- |
| `CLI-CONV-001` | U01, U13, U16-U18, U20-U21, U24-U25 |
| `CLI-CONV-002` | U02 |
| `CLI-CONV-003` | U11 |
| `CLI-CONV-004` | U11 |
| `CLI-CONV-005` | U20-U22 |
| `CLI-CONV-006` | U04-U06, U09-U10, U13, U15-U17 |
| `CLI-CONV-007` | U12, U16-U18 |
| `CLI-CONV-008` | U04, U08, U10, U13 |
| `CLI-CONV-009` | U05-U07, U09-U10, U12, U15, U18 |
| `CLI-CONV-010` | U18 |
| `CLI-CONV-011` | U04-U05, U09, U19-U21 |
| `CLI-CONV-012` | U03 |
| `CLI-CONV-013` | U03, R01 |
| `CLI-CONV-014` | U03, U08, U14 |
| `CLI-CONV-015` | U14 |
| `CLI-CONV-016` | U08, U11 |
| `CLI-CONV-017` | U08, U22 |
| `CLI-CONV-018` | U08, U13, U22 |
| `CLI-CONV-019` | U02, U22 |
| `CLI-CONV-020` | U01, U13, U23-U25, R01, M01 |

## First executable unit

U01 is the first executable unit, but only after P00 is complete and the
Maestro supplies the exact `PLANNING_BASE_SHA`. It creates
`codex/cli-conv-0001-u01-runx` in
`C:\GUIHO\worktrees\xdocs-cli-conv-0001-u01-runx`, creates its declared ledger,
and implements only the current RunX baseline.

## Completion definition

The migration is complete only when all twenty audit findings close, every U
and required corrective unit is integrated and cleaned, K00 and K01 have no
unresolved finding, M00 and M01 agree on the live target/effects, Mirror and the
remote release are verified, the exact released state has a final `0050`
report, and no production action occurred without separate exact approval.
