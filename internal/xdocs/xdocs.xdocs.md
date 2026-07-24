---
subject: xdocs-internal-domain
description: Structured-documentation metadata, discovery, tree, context, doctor, generation, merge, list, and rendering services.
parent: xdocs-internal
children: []
files:
  model.go: Shared descriptor, document, scan, context, and health result models.
  metadata.go: YAML frontmatter extraction and typed descriptor/document decoding.
  discovery.go: Exclusion-aware descriptor and companion-document discovery.
  tree.go: Synchronized parent-child, single-root, duplicate, orphan, and cycle validation with deterministic tree construction.
  meta.go: Metadata-only scoped reads and filters.
  context.go: Ranked minimal reading-set recommendations.
  doctor.go: Descriptor, companion, tree, and documented-file health checks.
  render.go: Deterministic text, Markdown, and JSON domain rendering.
  xdocs_test.go: Discovery, metadata, context, tree, and doctor regression tests.
documents: {}
tags:
  - structured-documentation
  - domain
keywords:
  - descriptors
  - frontmatter
  - context
  - doctor
flags: []
status: stable
---

The domain is independent of Cobra and filesystem mutation outside explicit
generation operations.
