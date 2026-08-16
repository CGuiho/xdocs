---
name: remove-special-root-index-plan-review
purpose: Verify the special root-index removal plan is safe and executable without human interruption.
description: Reviews cleanup scope, Cobra lifecycle coverage, compatibility tests, documentation alignment, Git delivery, and the 0.10.1 release gate.
created: 2026-08-16
owner: xdocs-plan-reviews
flags: []
tags:
  - plan-review
  - go-cli
  - documentation-model
  - release
keywords:
  - XDOCS.md
  - invocation cleanup
  - xdocs init
  - plan readiness
  - xdocs 0.10.1
---

# Remove The Special XDOCS.md Root Index Plan Review

## Verdict

Ready for execution.

## Findings

No blocker, high, medium, or low finding remains. The plan traces directly to
the user's complete behavior instruction and the live Go/Cobra runtime. It
separates configuration (`xdocs.yaml`) from named descriptor metadata, removes
both init creation and discovery special-casing, and centralizes deletion so
individual domain handlers cannot drift.

The cleanup boundary is sealed: valid user-facing commands, standard help,
developer help, and root version use the effective `--cwd`; internal workers do
not widen deletion to an inherited directory; missing files are silent;
directories are never recursively removed; invalid syntax that prevents cwd
resolution is explicitly outside the guarantee.

## Sequencing And Safety

- Planning/TODO state is committed on `main` before delegation.
- Execution uses one dedicated branch and isolated worktree.
- Luna owns implementation and a PR but cannot merge or version its own work.
- Main-agent review precedes main-agent validation on the exact accepted head.
- Release preparation and Mirror patch application happen only after merge.
- The tag-triggered workflow publishes source artifacts and installer
  acceptance only; no production deployment, traffic, DNS, database, or secret
  mutation is planned.

## Acceptance And Validation Coverage

The plan covers init text/JSON output, all central invocation paths,
`--cwd`, idempotency, symlink and directory safety, discovery/coverage removal,
embedded resources, current documentation, Go format/test/vet/build, strict
xdocs health, native smoke, the exact eleven-artifact matrix, Mirror plan/apply,
and public release verification.

## TODO Alignment

`TODO.md` task 9 and `docs/todo/remove-special-root-index.md` are in progress
and link this plan and review. The executor must preserve that canonical state;
the main agent moves it to testing before final validation and archives it only
after release verification.

## First Executable Unit

`XD-ROOT-01`: create `codex/remove-special-xdocs-root-index` from the approved
planning commit in an isolated worktree, then implement the cleanup hook, remove
init/discovery special cases, delete the tracked root file, update live docs and
embedded resources, add tests, validate, push, and open the PR.

## Handoff

The next controller is `guiho-a-0048-plan-executor`, running GPT-5.6 Luna with
maximum reasoning effort, followed by main-agent review and validation.
