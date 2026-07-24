---
subject: xdocs-internal-config
description: Strict xdocs.yaml discovery, decoding, defaults, and semantic validation.
parent: xdocs-internal
children: []
files:
  config.go: Configuration precedence, known-field YAML decoding, single-document enforcement, defaults, and validation.
  config_test.go: Precedence, unknown-field, multiple-document, extension, AI mode, and exclusion tests.
documents: {}
tags:
  - configuration
  - yaml
keywords:
  - strict decoding
  - xdocs.yaml
  - known fields
flags: []
status: stable
---

Configuration accepts only the documented schema and never silently retains an
unknown field.
