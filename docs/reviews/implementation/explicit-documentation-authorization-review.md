---
name: Explicit documentation authorization implementation review
purpose: Record implementation review and validation for issue 21.
description: Acceptance mapping, resolved findings, test evidence, and delivery status for opt-in metadata and complete trees.
created: 2026-09-12
owner: xdocs-implementation-reviews
flags: [reviewed, human-review-pending]
tags: [review, authorization, tree]
keywords: [issue 21, Luna, Sol, frontmatter, report output]
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# Explicit documentation authorization implementation review

## Verdict and delivery

Sol (`gpt-5.6-sol`, xhigh) approved implementation commit `55453ab` with no
unresolved findings after reviewing the integrated changes and corrective
patches. Luna (`gpt-5.6-luna`, max) performed implementation and delegated
tree tests and documentation work. The primary coordinator authored the
[plan](../../plans/explicit-documentation-authorization.md), checked independent
CLI fixtures, and pushed the reviewed implementation to
`fix/issue-21-documentation-authorization` on `CGuiho/xdocs`.

This addresses [issue 21](https://github.com/CGuiho/xdocs/issues/21), created
2026-09-11, and the user's subsequent scope clarification. Human acceptance
remains pending; TODO task 10 is in testing. No version bump or release was
performed. The separate CLI Convention 0001 migration remains unfinished.

## Acceptance mapping

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Explicit directory and companion metadata grants | Strict typed `documentation.directories` and `documentation.frontmatter`, empty by default; legacy denials take precedence | Config and domain tests cover boundaries, malformed grants, scalar coercion, aliases, merges, and default policy |
| Preserve ordinary Markdown and avoid unnecessary files | Metadata requirements apply only to explicit grants; embedded guidance keeps context in one named descriptor; report commands default to stdout | Resource tests and independent command snapshots preserve README and project bytes |
| One valid named descriptor per directory | Discovery and doctor diagnose duplicate and bare/legacy names; no automatic consolidation or repair | Descriptor, discovery, and doctor regression tests |
| Full tree at arbitrary depth | Filesystem containment with nearest descriptor ancestor, paths/context, root index, and diagnostics; invalid/orphan/duplicate nodes remain visible | Tree and command tests plus independent text/Markdown/JSON fixture with deep nesting and malformed metadata |
| Safe explicit report output | Shared preflight and atomic replacement reject descriptor destinations, symlinks, exclusions, invalid headers, and unauthorized companion metadata | Output tests prove destination preservation on rejection; independent CLI checks verify exact single report output |
| Explicit audit of historical headers | Standalone `meta --existing-frontmatter` and `doctor --existing-frontmatter` include ordinary documents without descriptors; absent headers remain valid | Focused audit tests and independent descriptorless-document fixture |
| Consistent user and embedded instructions | Updated README, DOCS, managed instruction template, skill, prompts, AGENTS, and descriptor indexes | Sol documentation review and embedded-resource tests |

## Resolved review findings

Review corrections closed path escape and portable-path validation gaps,
YAML scalar coercion and merge/alias authorization bypasses, incomplete
existing-header audit discovery, ambiguous frontmatter openers, flattened
tree rendering, and root-index classification. Report preflight now applies
the same companion schema validation as metadata and doctor.

The final correction in `55453ab` rejects required companion string fields
containing only whitespace. Sol reran the adversarial report probe and tests
that verify both no destination creation and byte-for-byte preservation of an
existing destination. Meta and doctor consistency tests also passed.

## Validation evidence

Go 1.26.5 was used from an isolated temporary toolchain. Luna completed the
full suite, vet, and CGO-disabled native build at `55453ab`. Sol independently
ran the full suite on the preceding integrated revision and an uncached domain
suite plus focused adversarial tests on the final correction. Formatting and
`git diff --check` passed.

Commands exercised:

```sh
go test ./...
go vet ./...
CGO_ENABLED=0 go build -trimpath -o /tmp/xdocs-issue21-review .
xdocs meta --documents --strict --format json
xdocs doctor --format json
xdocs tree
```

The primary rebuilt the final revision and reran two independent temporary
project fixtures: complete deep-tree output and read-only command preservation;
and default metadata policy, standalone historical-header audit, strict
descriptor types, YAML merge rejection, and byte preservation. Both passed.
Repository doctor reported valid with zero errors and zero warnings.

Windows AMD64 and macOS ARM64 cross-builds passed on `7582fb6`, before the
final platform-independent whitespace validation correction. Runtime smoke
tests ran on Linux only; native Windows and macOS execution was not tested.
Temporary binaries and smoke scripts are validation artifacts outside the
repository and are not shipped files.
