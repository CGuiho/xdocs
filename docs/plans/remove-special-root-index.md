---
name: remove-special-root-index-plan
purpose: Provide an unattended execution plan for removing the special XDOCS.md root index.
description: Sealed Go CLI, documentation, testing, review, integration, and 0.10.1 release plan for invocation-time legacy root-index deletion.
created: 2026-08-16
owner: xdocs-plans
flags: []
tags:
  - implementation-plan
  - go-cli
  - documentation-model
  - release
keywords:
  - XDOCS.md
  - xdocs init
  - persistent pre-run
  - legacy cleanup
  - xdocs 0.10.1
---

# Remove The Special XDOCS.md Root Index Plan

## Objective

Make named `*.xdocs.md` descriptors the only structured documentation files,
remove the special `XDOCS.md` root-index concept, silently delete the legacy
file whenever a user runs xdocs in a project, and publish the compatible patch
as xdocs 0.10.1.

## Sources Of Truth

- User instruction from 2026-08-16.
- `docs/todo/remove-special-root-index.md` behavior contract.
- Current Go/Cobra runtime under `main.go`, `cmd/`, and `internal/`.
- `AGENTS.md`, `guiho-s-0035-cli-engineer-go`, `guiho-s-xdocs`, and
  `mirror.yaml`.
- Planning base `93cdafb` on synchronized `main`.

No material question remains for unattended execution.

## Execution Topology

- Unit: `XD-ROOT-01`
- Repository: `C:\GUIHO\xdocs`
- Approved base: the planning commit descended from `93cdafb` on `main`.
- Branch: `codex/remove-special-xdocs-root-index`
- Worktree: an isolated temporary worktree outside the primary checkout.
- PR target: `main`
- Merge method: repository/GitHub default after the main agent's review and
  validation accept the exact head.
- Cleanup owner: main agent after merge and release verification.
- Question ledger: `docs/questions/remove-special-root-index/XD-ROOT-01.md`,
  created only if implementation uncovers a material ambiguity or plan defect.

### Owned paths

- `cmd/root.go`, `cmd/domain.go`, and `cmd/root_test.go`.
- `internal/xdocs/discovery.go` and directly affected tests.
- `internal/agent/agent.go`.
- `skills/guiho-s-xdocs/SKILL.md` and `prompts/agents.md`.
- `README.md`, `DOCS.md`, `BRAINSTORM.md`, `AGENTS.md`, and the current xdocs
  document-model note where wording is live rather than historical evidence.
- `XDOCS.md` deletion.
- Directly affected `*.xdocs.md` descriptors.
- Task/review/validation/release evidence owned by this unit.

### Shared-file exclusions

- Preserve unrelated user changes and unrelated TODO tasks.
- Do not rewrite historical `CHANGELOG.md` sections, archived TODOs, prior
  reviews, or prior validations. Add only the new 0.10.1 section during release
  preparation.
- Do not edit the historical TypeScript runtime under `source/`.

## Unit XD-ROOT-01 — Remove And Clean The Legacy Root Index

### Dependencies

- Durable task/spec, this plan, and the ready plan review committed on `main`.
- Clean branch/worktree created from that planning commit.

### Implementation

1. Introduce one narrow, idempotent legacy-cleanup service in the Cobra layer.
   It resolves `<effective-cwd>/XDOCS.md`, uses non-recursive filesystem
   inspection/removal, treats absence as success, silently removes a regular
   file or symlink, and returns a mutation-class error for unsupported or failed
   removal.
2. Invoke cleanup once per valid user-facing invocation after Cobra has resolved
   `--cwd` and before ordinary command behavior. Include plain root, all public
   subcommands, developer-context help, standard help, and root version. Do not
   run it from hidden update-worker or Windows replacement protocols.
3. Preserve the exact existing help/version catalog and short-alias contract.
   If standard Cobra help/version short-circuits bypass the shared pre-run hook,
   wrap those Cobra-owned render paths rather than introducing a second command
   parser or pre-parsing ordinary arguments.
4. Remove `XDOCS.md` creation, text reporting, and JSON `root` reporting from
   `xdocs init`.
5. Remove scan/discovery root-index constants, injection, coverage credit,
   labels, and plain-Markdown exclusion. A directly scanned surviving file is
   ordinary companion Markdown; normal CLI execution deletes it first.
6. Delete the tracked repository `XDOCS.md`.
7. Remove the special-root contract from current public docs, repository
   instructions, embedded instruction text, the bundled skill, and the agent
   prompt. State that `xdocs.yaml` configures behavior while named descriptors
   own documentation metadata. State that commands remove the legacy file.
8. Update owning descriptors only where document/file maps or descriptions
   changed. Preserve historical evidence verbatim.

### Tests

Add focused tests proving:

- `init` does not create the file and omits root-index text/JSON fields;
- plain root, representative domain and agent commands, standard help,
  developer help, and root version remove a pre-existing file;
- cleanup targets `--cwd` without touching a different process cwd;
- repeated invocations succeed when the file is absent;
- a symlink is removed without following its target where supported;
- a directory named `XDOCS.md` is not recursively deleted and yields the
  mutation exit category;
- scan no longer injects, labels, or grants coverage to a special root index;
- current embedded instruction/skill output contains no legacy root-index
  guidance;
- existing JSON, help, agent, update, upgrade, and discovery behavior remains
  stable outside this requested change.

### Documentation And XDocs

- Update `README.md`, canonical `DOCS.md`, `BRAINSTORM.md`, relevant current
  design documentation, `AGENTS.md`, `internal/agent/agent.go`, bundled skill,
  and `prompts/agents.md`.
- Do not rewrite old changelog entries or archived release evidence.
- Validate task, plan, review, code, and documentation descriptor scopes before
  repository-wide validation.

### Validation

Run sequentially on Windows:

1. `gofmt -w main.go cmd internal devops` and require `gofmt -l` to be empty.
2. `git diff --check`.
3. `go mod tidy` and require no `go.mod`/`go.sum` diff.
4. `go test -count=1 -p 1 ./...`.
5. `go vet ./...`.
6. `go build -trimpath -o bin/xdocs.exe .`.
7. Native disposable-directory smoke for init, scan, help, version, `--cwd`,
   silent deletion, and absence idempotency.
8. Strict metadata for touched scopes, `xdocs tree`, and repository-wide
   `xdocs doctor . --warnings-as-errors`, using the newly built binary.
9. Main-agent diff review against this plan and task acceptance criteria.

### Delivery

1. The Luna executor commits the smallest coherent validated changes on the
   feature branch, pushes it, and opens a PR to `main`; it must not merge or
   version the feature branch.
2. The main agent reviews the exact head. Findings return to the same Luna
   executor for correction and require fresh review.
3. The main agent moves canonical task state to `testing`, validates the exact
   accepted head, merges only after review and validation pass, and verifies
   reachability from `origin/main`.

### Release Preparation And Patch

After implementation is merged:

1. Update the bundled skill's `version` and `metadata.version`, the matching
   guard in `main_test.go`, current-version documentation, and a new exact
   `CHANGELOG.md` section for `0.10.1`.
2. Re-run Go, XDocs, native smoke, installer syntax, and exact release-matrix
   validation. Build exactly eight binaries plus `guiho-s-xdocs.zip`,
   `guiho-i-xdocs.md`, and `checksums.txt`; verify all ten listed checksums.
3. Commit and push release-preparation paths in smallest coherent units.
4. Run plain `mirror`, `mirror config check`, `mirror version current`, and
   `mirror version plan patch`. Require a clean worktree, current `0.10.0`, next
   `0.10.1`, canonical tag `xdocs/v0.10.1`, and no production deployment
   automation.
5. Apply `mirror version apply patch --yes`. Mirror owns the version commit,
   tag, and push.
6. Verify the tag target, successful publish and Windows-installer jobs, exact
   version-scoped release notes, exactly eleven assets, checksum manifest, and
   native Windows AMD64 version/help smoke.
7. Record review, validation, release, and no-production-mutation evidence;
   complete and archive the task only after every gate passes.

## Acceptance Gate

Execution is accepted only when every behavior and evidence requirement in
`docs/todo/remove-special-root-index.md` is satisfied. Authentication,
connectivity, branch protection, or external workflow failure may block remote
delivery; source/test drift does not justify a partial success claim.
