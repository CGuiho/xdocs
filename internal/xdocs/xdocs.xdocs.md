---
subject: xdocs-internal-domain
description: Git-aware structured-documentation metadata, discovery, tree, context, doctor, generation, merge, list, and rendering services.
parent: xdocs-internal
children: []
files:
  model.go: Shared descriptor, document, scan, context, and health result models.
  ignore.go: Dependency-free root/nested .gitignore matching, opt-in documentation authorization, and explicit file/directory frontmatter policy.
  metadata.go: Exact YAML frontmatter extraction and typed descriptor/document decoding with read-only existing-header auditing.
  discovery.go: Exclusion-aware complete descriptor and companion-document discovery, including invalid descriptor candidates and traversal diagnostics.
  output.go: Preflighted, project-bounded, atomic single-file report output.
  tree.go: Synchronized parent-child, single-root, duplicate, orphan, and cycle validation with deterministic tree construction.
  meta.go: Metadata-only scoped reads and filters.
  context.go: Ranked minimal reading-set recommendations.
  doctor.go: Descriptor, companion, tree, and documented-file health checks.
  render.go: Deterministic text, Markdown, and JSON domain rendering.
  xdocs_test.go: Discovery, metadata, context, tree, doctor, and existing-header audit regression tests.
  ignore_test.go: Gitignore, negation, authorization, file/directory rule, tracking, context, and doctor regression tests.
  output_test.go: Atomic report output, descriptor rejection, exclusion, missing-parent, and symlink safety tests.
documents: {}
tags:
  - structured-documentation
  - domain
keywords:
  - descriptors
  - frontmatter
  - gitignore
  - frontmatter opt-out
  - explicit authorization
  - context
  - doctor
flags: []
status: stable
---

The domain is independent of Cobra and filesystem mutation outside explicit
generation operations.
