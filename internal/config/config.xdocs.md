---
subject: xdocs-internal-config
description: Strict xdocs.yaml discovery, decoding, defaults, opt-in documentation authorization, ignore rules, and semantic validation.
parent: xdocs-internal
children: []
files:
  config.go: Configuration precedence, known-field YAML decoding, single-document enforcement, opt-in documentation directories and frontmatter rules, defaults, Git-aware ignore policy, and semantic validation.
  config_test.go: Precedence, unknown-field, multiple-document, extension, AI mode, documentation-policy, ignore-rule, and exclusion tests.
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
  - documentation authorization
flags: []
status: stable
---

Configuration accepts only the documented schema and never silently retains an
unknown field. `ai.mode` defaults to `auto`; the only supported values are
`auto` and `prompt`. `.gitignore` handling defaults on, while explicit strict
rules can keep matching file or directory documents tracked without requiring
frontmatter.
