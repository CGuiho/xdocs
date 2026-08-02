---
subject: xdocs-internal-config
description: Strict xdocs.yaml discovery, decoding, defaults, ignore rules, and semantic validation.
parent: xdocs-internal
children: []
files:
  config.go: Configuration precedence, known-field YAML decoding, single-document enforcement, defaults, Git-aware ignore/frontmatter rules, and validation.
  config_test.go: Precedence, unknown-field, multiple-document, extension, AI mode, ignore-rule, and exclusion tests.
documents: {}
tags:
  - configuration
  - yaml
keywords:
  - strict decoding
  - xdocs.yaml
  - known fields
  - gitignore
  - frontmatter opt-out
flags: []
status: stable
---

Configuration accepts only the documented schema and never silently retains an
unknown field. `ai.mode` defaults to `auto`; the only supported values are
`auto` and `prompt`. `.gitignore` handling defaults on, while explicit strict
rules can keep matching file or directory documents tracked without requiring
frontmatter.
