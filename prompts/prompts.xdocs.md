---
subject: xdocs-prompts
description: Runtime prompt templates used by xdocs prompt commands and embedded into native binaries.
parent: xdocs-package
children: []
files: {}
documents:
  agents.md: Prompt for updating AGENTS.md with xdocs instructions.
  generate.md: Prompt for generating comprehensive documentation from xdocs metadata.
  update.md: Prompt for updating existing xdocs descriptors after code or document changes.
  write.md: Prompt for writing a named xdocs descriptor for a module.
tags:
  - prompts
  - ai
  - documentation
keywords:
  - prompts
  - AI instructions
  - documentation generation
flags: []
status: stable
---

The `prompts/` directory contains Markdown prompt templates loaded by
`source/prompts.ts` at runtime and embedded by `source/embedded-resources.ts` for
native binaries. They are plain companion documents, so this descriptor lists
each prompt under `documents`.
