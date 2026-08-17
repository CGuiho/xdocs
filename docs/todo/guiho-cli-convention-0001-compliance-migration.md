---
name: Migrate xdocs to GUIHO CLI Convention 0001
purpose: Track the approved breaking scope and gated delivery of complete GUIHO CLI Convention 0001 compliance.
description: Question-sealed task specification for an accepted architecture, focused PR units, exact-head review and validation, a separate release-preparation PR, and clean-main Mirror application.
created: 2026-08-16
owner: xdocs-todo
flags:
  - approved
  - breaking-change
  - in-progress
  - planning-review-pending
tags:
  - todo
  - cli
  - compliance
keywords:
  - GUIHO CLI Convention 0001
  - guiho-p-xdocs
  - xdocs.global.yaml
  - stable launcher
  - artifacts.json
  - question ledger
  - exact-head review
---

# Migrate xdocs to GUIHO CLI Convention 0001

## Status

- Status: in progress; implementation remains blocked pending independent
  `guiho-a-0047-plan-reviewer` acceptance and integration of the approved
  planning tree onto `main`.
- Created: 2026-08-16
- Updated: 2026-08-17
- Human-sealed public IDs: CLI home `xdocs`, skill `guiho-s-xdocs`, main prompt
  `guiho-p-xdocs`.
- Breaking changes: approved.
- Implementation workhorse: OpenCode DeepSeek v4 Pro at maximum reasoning,
  orchestrated by `guiho-a-0048-plan-executor`; exact model evidence is
  required and no silent fallback is allowed.
- Additional aggregate reviewers: OpenCode Kimi K3 at maximum reasoning on the
  exact integrated implementation head and the exact release-preparation head.
- Version outcome: live next-minor Mirror planning after accepted
  implementation, followed by a separate release-preparation PR and clean-main
  Mirror application only after all exact-head gates pass.
- Production publication, deployment, migration, secret handling, and other
  production mutation are not authorized by this task.

## Provenance

- Convention: `docs/architecture/guiho-cli-convention-0001.xdocs.md`
- Current-state audit:
  `docs/reviews/implementation/guiho-cli-convention-0001-compliance-review.md`
- Accepted architecture:
  `docs/architecture/guiho-cli-convention-0001-compliance-architecture.md`
- Architecture review:
  `docs/reviews/architecture/guiho-cli-convention-0001-compliance-architecture-review.md`
- Revised implementation plan:
  `docs/plans/guiho-cli-convention-0001-compliance-migration.md`
- Plan review:
  `docs/reviews/plans/guiho-cli-convention-0001-compliance-migration-review.md`

The required `guiho-a-0043-software-architect` role was invoked twice but did
not return a usable artifact. The coordinating SWE therefore materialized the
fallback architecture, disclosed that provenance in the artifact, and obtained
an independent `guiho-a-0045-architecture-reviewer` verdict of Ready for
planning. The accepted architecture SHA-256 is
`8532586ae3b91614443835f2e510b2cefb5e264c876e263f427b9a38a045700a`.

## Required lifecycle

The implementation is a strict serial DAG. First integrate this planning tree
onto `main` and record the immutable base. Then execute every focused unit as:

`0048 -> OpenCode DeepSeek v4 Pro max -> PR -> 0049 -> 0050 -> 0052`

Each unit owns an exact path set, branch, isolated worktree, question ledger,
deterministically named implementation log, implementation review, validation
report, verification commands, failure stops, and exact-head evidence. U01
creates and parent-registers the three evidence-directory descriptors; `0048`
writes the implementation record in the reviewed branch, while `0052`
materializes accepted `0049`/`0050` evidence in a governance-only main commit
after merge. The next unit
starts only after the prior PR is merged to `main`, main reachability is
verified, and the prior branch/worktree is cleaned. Shared control artifacts
are serialized by design; implementation units may not overlap ownership.

After all focused units merge, Kimi K3 max independently reviews the aggregate
exact `main` head. Corrective work must be routed through a new focused unit and
the full per-unit chain. A live clean-main Mirror next-minor plan follows only
after aggregate acceptance. Release-facing version-bearing edits then occur in
a separate release-preparation PR, receive the same per-unit chain, and receive
a second Kimi exact-head review. Only then may Mirror be applied from clean,
accepted `main` after inspecting the repository automation contract.

M00 is strictly read-only. It returns a structured Mirror-plan handoff bound to
the K00-accepted main SHA; it creates no file or branch. `0048` must durably
commit that unchanged handoff to the exact R01 question ledger before making
any target-bearing R01 edit.

## Required outcome

xdocs fully satisfies the convention at the shipping Go/Cobra, tooling,
configuration, help, agent, installed-layout, artifact, installer, upgrade,
uninstall, documentation, CI, review, and release boundaries. No current
user-facing or automation surface may retain the superseded direct-binary,
single-configuration, eleven-asset, `update`-named, or scheduled-upgrade
contract.

## Scope

- Close every finding in the current-state audit and every finding in the prior
  plan review.
- Execute every unit in the revised implementation plan without collapsing
  units or bypassing their PR/review/validation/integration gates.
- Add a complete RunX catalog and make mandatory Mirror, RunX, XDocs, Go, and
  platform-native checks pass.
- Support distinct inheriting global/project configurations, schemas, examples,
  and exact agent-evolution policy.
- Implement complete idempotent init and the human-sealed prompt namespace.
- Correct raw version, help tree, agent `upgrade`, skill, instruction, and prompt
  behavior.
- Implement stable launchers, immutable payloads, strict active pointers,
  complete manifests, instance tracking, self-tests, transactional lifecycle
  operations, repair, rollback, and recovery.
- Publish the complete manifest-declared release with full checksums only after
  all non-production delivery gates and explicit human production approval.
- Replace both installers, add both uninstallers, and implement synchronous
  whole-release upgrade and manifest-authoritative uninstall, including the
  accepted Windows post-exit executable-finalization mechanism.
- Update all current documentation, metadata, workflows, and tests.

## Safety boundaries

- Do not inspect `.env`, `encrypted.env`, key files, environment dumps, or
  directories containing secret material. Do not print secret values.
- Use isolated temporary global/project homes and fixture releases for tests;
  never mutate a real user home or global installation during validation.
- Native Windows behavior must be validated on Windows; native Linux and macOS
  behavior must be validated on their respective runners. Cross-compilation is
  not native validation.
- RunX commands must be inspected with `describe`, `reveal`, or `--dry-run`
  before execution. Production-affecting entries remain blocked.
- No implementation unit authorizes publication, deployment, migration, secret
  rotation, or any other production mutation.

## Acceptance checklist

- [ ] The independent 0047 review says Ready for execution with no unresolved
      actionable finding, and the planning tree is merged to `main` before U01.
- [ ] Every planned unit completes its exact `0048 -> DeepSeek max -> PR ->
      0049 -> 0050 -> 0052` chain with same-head evidence.
- [ ] `mirror.yaml`, `runx.yaml`, and `xdocs.yaml` exist and all required tool
      checks pass.
- [ ] Every project-owned directory/file/document has accurate XDocs metadata.
- [ ] `-v` and `--version` print raw SemVer only.
- [ ] Help depth accepts `max` or integers greater than one and global flags are
      repeated only on request.
- [ ] `xdocs.yaml` and `xdocs.global.yaml` are distinct, strictly validated,
      inherited, schema-backed, and version-pinned.
- [ ] All `agent.evolution` leaves accept exactly the three convention values
      and default to `always-ask`.
- [ ] `init` performs the complete interactive and noninteractive
      reconciliation.
- [ ] Agent resource leaves use `upgrade`, skill show returns content, and no
      forbidden public `update` leaf remains.
- [ ] `guiho-p-xdocs` is the complete main setup prompt and all additional
      prompt IDs are namespaced beneath it.
- [ ] The main skill contains the exact CLI evolution section and policy-aware
      install, upgrade, and issue workflow.
- [ ] Stable launchers and immutable versioned payloads implement safe pointer
      activation and fallback.
- [ ] `artifacts.json` and the installed manifest strictly own every release and
      installed artifact or projection without target-ID collisions.
- [ ] Release output contains every required launcher, payload, agent artifact,
      instruction, schema, example, manifest, and checksum.
- [ ] Both installers support exact version/channel/default stable selection,
      complete pagination, full verification, repair, rollback, and persistence.
- [ ] `xdocs upgrade` is synchronous, complete, recoverable, policy-aware, and
      prints the mandatory first/final reinstall block.
- [ ] Cobra and both scripts implement the same full uninstall plan,
      preservation, dry-run, confirmation, ownership boundary, and Windows
      post-exit executable cleanup.
- [ ] README ends with the complete Uninstall operational section; DOCS and all
      current instructions/metadata match shipping behavior.
- [ ] CI and publication enforce the complete convention rather than an asset
      count or legacy output.
- [ ] Full isolated native validation passes on the exact pushed and
      independently reviewed head.
- [ ] The aggregate Kimi K3 max review has no unresolved actionable finding.
- [ ] Live Mirror next-minor planning is captured from clean accepted `main`.
- [ ] The separate release-preparation PR and final Kimi exact-head review pass.
- [ ] Mirror apply is run only from clean accepted `main` after automation
      inspection and explicit human production approval where required.
- [ ] Remote commit, tag, workflow, release assets, checksums, and native smoke
      are verified before the task is closed.

## Evidence artifacts

- Per-unit question ledgers:
  `docs/questions/guiho-cli-convention-0001-compliance-migration/`
- Per-unit implementation logs:
  `docs/todo/guiho-cli-convention-0001-compliance-migration/`
- Per-unit implementation reviews:
  `docs/reviews/implementation/guiho-cli-convention-0001-compliance-migration/`
- Per-unit validation reports:
  `docs/validation/guiho-cli-convention-0001-compliance-migration/`
- Aggregate plan review:
  `docs/reviews/plans/guiho-cli-convention-0001-compliance-migration-review.md`

Do not mark this task complete until every planned evidence artifact exists,
all exact-head gates pass, and the authorized remote next-minor outcome is
verified.
