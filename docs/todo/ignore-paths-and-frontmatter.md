---
name: xdocs-ignore-paths-and-frontmatter
purpose: Define Git-aware path exclusion and explicit frontmatter opt-out behavior for xdocs.
description: Task contract for honoring .gitignore and keeping configured Markdown files visible without requiring YAML frontmatter.
created: 2026-08-02
owner: xdocs-todo
flags: []
tags:
  - todo
  - configuration
  - frontmatter
keywords:
  - xdocs ignore
  - gitignore
  - frontmatter opt-out
  - xdocs.yaml
---

# Ignore Paths And Frontmatter

## Status

- State: in progress
- Updated: `2026-08-02T23:38:54+02:00`
- Executing plan unit: implement the configuration, matcher, discovery policy,
  validation, agent guidance, and user documentation as one compatible feature.

## Outcome

xdocs must stop treating every Markdown file as eligible for xdocs-owned YAML
frontmatter. Paths ignored by Git are outside the xdocs corpus by default.
Explicit xdocs rules can keep a file or directory discoverable, referenced, and
searchable while disabling its companion-document frontmatter requirement.

## Configuration Contract

```yaml
ignore:
  gitignore: true
  rules:
    - pattern: AGENTS.md
      kind: file
      frontmatter: false
    - pattern: README.md
      kind: file
      frontmatter: false
    - pattern: CLAUDE.md
      kind: file
      frontmatter: false
```

- `ignore.gitignore` defaults to `true`. Matching `.gitignore` files and
  directories are excluded from discovery, counts, metadata, context, and
  health checks.
- `ignore.rules` is a strict list of objects. `pattern` is a forward-slash glob
  relative to the repository; a pattern without a slash matches that name at
  any depth. `kind` is exactly `file` or `directory`.
- `frontmatter: false` means matching Markdown files remain ordinary companion
  documents and remain listed through descriptor metadata, scan, list, meta,
  and context. xdocs does not require, parse, validate, generate, or recommend
  YAML frontmatter for them.
- A directory rule applies to every descendant Markdown document.
- The three agent/public entry files above are the default rules. An explicit
  empty `ignore.rules: []` disables those presets.
- Existing `scan.exclude` remains supported for name-only directory exclusions.

## Acceptance Criteria

1. Strict YAML decoding accepts the new section and rejects unknown fields,
   invalid kinds, empty or absolute patterns, and any rule that does not
   explicitly set `frontmatter: false`.
2. Defaults, omitted configuration, and `xdocs init` all enable `.gitignore`
   handling and the three preset rules.
3. Root and nested `.gitignore` patterns, negation, directory patterns, and
   `**` globs are honored without adding a runtime dependency.
4. Git-ignored files and directories are absent from xdocs scan and metadata
   results.
5. A frontmatter-opted-out Markdown file remains discovered and must still be
   declared in its descriptor `documents` map, but missing or invalid
   frontmatter produces no metadata or doctor issue.
6. Meta and context output identify or safely handle documents whose
   frontmatter is not required.
7. README, DOCS, the bundled xdocs skill, configuration descriptors, and the
   repository `xdocs.yaml` describe and exercise the shipping contract.
8. `gofmt`, `go mod tidy` clean-diff verification, `go test ./...`, `go vet
   ./...`, native build, exact release-matrix build, and narrow xdocs checks are
   recorded before completion.

## Lifecycle Notes

- Feature brainstorming, standalone requirements, and standalone architecture
  artifacts are waived because the developer supplied the product behavior,
  defaults, schema shape, and user examples directly, and this spec preserves
  them before implementation.
- A separate plan document is unnecessary: the change is one Go CLI plan unit
  contained by `internal/config`, `internal/xdocs`, tests, embedded guidance,
  and canonical documentation.
- No release, tag, or Mirror version apply is authorized by this task. The
  compatible feature implies a future minor version, deferred until explicit
  release authorization.
