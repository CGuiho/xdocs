---
name: xdocs-ignore-paths-and-frontmatter-review
purpose: Review Git-aware path exclusion and explicit frontmatter opt-out behavior.
description: Findings-first acceptance review of configuration, matching, command boundaries, raw output safety, documentation, and regression coverage.
created: 2026-08-03
owner: xdocs-implementation-reviews
flags:
  - accepted
tags:
  - implementation-review
  - configuration
  - frontmatter
keywords:
  - gitignore
  - ignore rules
  - frontmatter opt-out
  - raw metadata
---

# Ignore Paths And Frontmatter Implementation Review

## Verdict

Accepted for release integration. Two independent final reviews reported no
remaining findings after the corrections below.

## Review Scope

- Strict `xdocs.yaml` defaults and configured file/directory rules.
- Root and nested `.gitignore` traversal, negation, glob, and directory behavior.
- Scan, metadata, context, doctor, tree, list, merge, and generate boundaries.
- Frontmatter opt-out discovery, tracking, JSON projection, and agent guidance.
- Tests, canonical documentation, descriptors, and portable packaging.

## Resolved Findings

1. Scoped commands could initially bypass an ignored ancestor. The path policy
   now loads ancestor rules and stops before ignored or `scan.exclude`
   directories; descendant targets are covered by regression tests.
2. Invalid descriptors could expose ignored references through raw JSON
   frontmatter. Raw `files` and `documents` maps are now filtered independently
   of typed metadata validity.
3. An ignored `XDOCS.md` could still mark the root covered. Coverage now uses
   the same Git-aware policy as discovery.
4. Descriptorless `generate` fallback initially enumerated raw directory
   entries. It now filters Git-ignored, hidden, and `scan.exclude` entries and
   refuses to enumerate an ignored target.
5. Windows case behavior, Git boundary forms of `**`, malformed configured
   globs, directory trailing slashes, and current-directory path segments were
   tightened and tested.

## Acceptance Check

- `.gitignore` handling defaults on and can be explicitly disabled.
- Default rules opt AGENTS.md, README.md, and CLAUDE.md out of frontmatter at
  any depth while keeping them discoverable and referenceable.
- An explicit rules list replaces presets; an empty list clears them.
- Only `kind: file|directory` with explicit `frontmatter: false` is accepted.
- Ignored paths do not leak through typed metadata, raw metadata, scoped
  commands, root coverage, or fallback generation.
- Prompts and the bundled skill instruct agents never to add frontmatter to an
  opted-out document.

## Verification

The complete command evidence and release-matrix inventory are recorded in
`docs/validation/ignore-paths-and-frontmatter.md`.

## Residual Risk

The exact reviewed head was integrated through pull request 18. Release
publication evidence is tracked separately in the validation report. No
implementation correctness finding remains.
