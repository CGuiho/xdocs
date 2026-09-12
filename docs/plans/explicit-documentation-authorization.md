---
name: Explicit documentation authorization and complete trees
purpose: Plan issue 21 implementation without unsolicited Markdown changes.
description: Scoped requirements, architecture, execution units, and acceptance checks for opt-in documentation and complete descriptor discovery.
created: 2026-09-12
owner: xdocs-plans
flags: [execution-complete, reviewed, human-review-pending]
tags: [planning, authorization, tree]
keywords: [issue 21, named descriptors, frontmatter, Luna, Sol]
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# Explicit documentation authorization and complete trees

## Authority and scope

Source: [GitHub issue 21](https://github.com/CGuiho/xdocs/issues/21), created
2026-09-11, and the user's 2026-09-12 clarification in this session.
The user explicitly directed the coordinator to write the plan, hand the full
plan to Luna, have Sol review Luna's work, review the integrated result, and
push to GitHub. This authorizes this scoped planning-to-execution cycle without
another approval round. It supersedes the old migration plan's worker choices
and the issue's ambiguous use of bare `.xdocs.md`.

The primary agent authors this plan and owns user communication and delivery.
Implementation uses `gpt-5.6-luna` at `max`; every Luna contribution receives
`gpt-5.6-sol` review at `xhigh`. Optional Terra uses `xhigh`.
Native collaboration tools are the user-selected worker mechanism. With four
concurrent slots, Luna schedules bounded child work and releases slots before
Sol reviews. Subagents commit only their own scoped changes and never push.

Keep this work separate from the unfinished broad CLI Convention 0001 rewrite.
No version bump, release publication, installer migration, or issue comment is
authorized here. Preserve historical plans and existing user documentation.
The referenced Go CLI skill is unavailable locally; use existing Go patterns,
repository requirements, and the applicable GUIHO CLI convention. The local
general SWE convention file is empty, so it supplies no additional rules.

## Required behavior and architecture

1. A directory has at most one named descriptor, normally its basename plus
   `.xdocs.md`: `technologies/technologies.xdocs.md`. Bare `.xdocs.md` and
   `.docs.md` are not valid descriptor names. Reuse existing valid named
   descriptors; do not rename, delete, consolidate, or overwrite existing
   documents automatically. Report duplicate descriptors as errors.
2. Each descriptor contains meaningful directory context, file/document
   descriptions, and parent/child metadata. Put overview and details in that
   descriptor, not separate generated overview/detail Markdown files.
3. Add a strict `documentation` configuration section. `directories` is a
   list of repository-relative directory paths, default `[]`. Each entry
   authorizes descriptor maintenance in that directory and descendants;
   `.` deliberately authorizes the entire non-excluded project. Reject empty,
   absolute, escaping, or malformed entries. Missing permission never implies
   repository-wide permission. Do not auto-populate this list during init.
4. `documentation.frontmatter` is a list of explicit rules with `pattern`
   and `kind` (`file` or `directory`), default `[]`. These authorize companion
   Markdown metadata only within `documentation.directories`. Use existing
   validated glob semantics; legacy `ignore.rules` with `frontmatter: false`
   always deny and take precedence. Existing configuration remains loadable,
   but omitted opt-ins now mean ordinary Markdown metadata is not required.
   `ai.mode: auto` controls timing only, never broadens authorization.
5. Ordinary Markdown remains discoverable and describable in a descriptor's
   `documents` map without opening, rewriting, or requiring its frontmatter.
   Keep metadata-policy output explicit (`frontmatterRequired: false`). Do not
   create extra companion documents or advise header insertion unless the
   user expressly permits the exact scope. Preserve existing frontmatter,
   bodies, and files; do not strip historical metadata.
6. Discovery is read-only and independent of write permission. `tree` walks all
   non-excluded directories to arbitrary depth, displays every named
   descriptor exactly once with its relative path and available context, and
   cannot silently lose orphans, multiple roots, duplicate subjects, or invalid
   descriptors. Build the displayed hierarchy from directory containment and
   nearest ancestor descriptors, using a synthetic project root when needed.
   Keep metadata relationship validation in doctor; tree emits clear
   diagnostics by default without hiding nodes or producing cyclic JSON.
   Include the existing special root `XDOCS.md` index as a distinguishable path
   entry. Respect root/nested gitignore and scan exclusions, including file patterns.
7. `scan`, `meta`, `context`, `doctor`, and `tree` without `--output` never
   mutate files. `generate` and `merge` remain report-producing commands,
   printing to stdout unless an explicit output destination is supplied.
   An explicit ordinary report destination authorizes that report, not
   companion metadata edits or additional output files. Do not pretend a
   rendered report without descriptor metadata is a valid descriptor.
8. Centralize safe output checks used by generate/merge/tree. Descriptor
   destinations require directory permission, valid complete descriptor
   metadata, and no second descriptor in the directory. Reject bare/legacy
   descriptor destinations and malformed frontmatter before any write;
   ordinary Markdown frontmatter destinations require explicit policy.
   Reject symlink escapes/targets and excluded writes. Preflight before
   truncation; use safe atomic replacement. No silent frontmatter repair.
   Doctor reports existing invalid descriptor/authorized metadata. Add an
   explicit read-only `doctor --existing-frontmatter` audit for malformed
   historical headers on otherwise unauthorized ordinary Markdown: missing
   headers remain valid, existing headers get YAML syntax/structure validation,
   and no xdocs owner schema or write authorization is imposed. Actual repair
   remains explicit.
9. Keep existing explicit init/root-index and agent-resource setup boundaries
   intact; they do not authorize arbitrary Markdown metadata maintenance.
   Existing `XDOCS.md` is the special root index, not a second per-directory
   descriptor. Do not create additional indexes as part of discovery or
   descriptor maintenance.

Example user-authored policy:

```yaml
documentation:
  directories:
    - technologies
  frontmatter:
    - pattern: technologies/approved-notes.md
      kind: file
```

This allows named descriptors beneath `technologies`, and companion metadata
only for the listed file unless a legacy denial matches. It does not authorize
README header edits. For this implementation task, the user's requested source,
plan, documentation, tests, and descriptor maintenance are authorized; do not
add blanket permissions to the repository configuration to conceal failures.

## Execution units

### U1 — Configuration and read policy

Files: `internal/config/config.go`, its tests and descriptor;
`internal/xdocs/ignore.go`, discovery/meta/doctor policy adapters and tests.
Implement typed strict defaults, decoding and semantic validation. Share policy
matching across readers/writers; keep ignores stronger than opt-ins. Update
tests that intentionally require companion metadata to opt in explicitly.
Validate default/no-config behavior, malformed rules, nested allow/deny,
directory boundaries, root grants, scoped metadata and explicit file exclusions.
Signal: focused config/domain tests, then Sol review. No external state impact.

### U2 — Complete tree

Independent of U1's policy implementation. Files: `internal/xdocs/tree.go`,
tree model only as necessary, dedicated tree tests, `cmd/domain.go` tree adapter
and command tests. Coordinate shared command/model files with Luna before edits.
Retain every discovered descriptor even when invalid; avoid duplicate-subject
map loss and metadata cycles; show paths and meaningful available descriptions.
Validate arbitrary depth, forests, orphans, duplicate subjects, malformed YAML,
cycles, missing ancestor descriptors, stable order and text/Markdown/JSON parity.
Signal: focused domain/command tests and Sol review.

### U3 — Output authorization and validation

Depends on U1; serialize edits to shared command/domain files after U2.
Files: shared output helper in `internal/xdocs` or `cmd`, `cmd/domain.go`,
generation/merge rendering only as needed, focused output tests and descriptors.
Validate exact single-file output, denied descriptor write, duplicate prevention,
malformed/invalid frontmatter, existing-target byte preservation on rejection,
symlink escape, excludes, stdout no writes, and explicitly requested plain report.
Reject invalid descriptor reports instead of inventing their metadata.
Signal: mutation regression tests, focused command tests and Sol review.

### U4 — Embedded instructions and user documentation

Depends on settled U1–U3 behavior. Files: `skills/guiho-s-xdocs/SKILL.md`,
`prompts/write.md`, `prompts/update.md`, `prompts/generate.md`,
`prompts/agents.md`, `prompts/guiho-i-xdocs.md` where applicable,
`internal/agent/agent.go` instruction template, `README.md`, `DOCS.md`,
`AGENTS.md` relevant policy prose, and owning descriptors.
Explicitly replace broad header and extra-file advice with named single-file
context and opt-in policy. Preserve unmanaged instruction content and skill
version. Do not insert YAML frontmatter into README/AGENTS or any opted-out
document. Test actual embedded resources and the managed instruction template
for policy consistency. Signal: resource tests, documentation review by Sol.

### U5 — Integration and delivery

Primary owns integration review and final push; Luna owns implementation fixes.
Run `gofmt` on changed Go files, `go test ./...`, `go vet ./...`, and
`CGO_ENABLED=0 go build -trimpath` into an isolated temporary output directory.
Use the newly built CLI with temporary project/home fixtures for smoke tests;
never bootstrap or update the user's global installation. Validate real repository
metadata/tree/doctor and compare any unrelated baseline failures honestly.
Run Linux-native checks; cross-platform compilation is not native validation.
Sol reviews the complete Luna diff and every corrective change. Primary verifies
acceptance against source and test evidence, then pushes the reviewed commits.
If a protected-branch gate rejects delivery, use a reviewable feature branch/PR;
never force or bypass a rejection. Do not publish a release.

## Tracking, findings, and acceptance

- [x] U1 typed opt-in policy and read behavior implemented and reviewed.
- [x] U2 complete deep tree implemented and reviewed.
- [x] U3 guarded output implemented and reviewed.
- [x] U4 embedded guidance and documentation consistent and reviewed.
- [x] U5 full checks, integrated review, and GitHub push verified.

Use this plan's checklist for executor progress and add one concise task to the
existing TODO index. Reuse existing documentation directories instead of
creating an unnecessary hierarchy of planning files. Record substantive
unforeseen decisions under `docs/questions/explicit-documentation-authorization/`
only when needed. Keep the final review and validation evidence in one focused
record under `docs/reviews/implementation/` with acceptance mapping and commands.
Never claim human acceptance before the user tests the result.

Hard stops: potential unrecoverable data loss, secret access, or required
production mutation. Resolve routine implementation choices conservatively,
record them, and continue. No schema or output policy may silently expand
the user's authorization.

Implementation and GitHub branch delivery are complete. Human acceptance remains
pending. See the [implementation review](../reviews/implementation/explicit-documentation-authorization-review.md)
for requirement mapping, review findings, and validation evidence.
