---
subject: xdocs-docs
description: Durable project documentation for xdocs behavior, design notes, and implementation context.
parent: xdocs-package
children:
  - xdocs-decisions
  - xdocs-todo
files: {}
documents:
  2026-07-05-xdocs-document-model.md: Defines the named descriptor plus companion Markdown document model for xdocs modules.
tags:
  - documentation
  - design
keywords:
  - document model
  - design notes
  - companion documents
flags: []
status: stable
---

The `docs/` directory stores durable xdocs project notes. Plain Markdown
documents directly in this directory are listed in `documents`; categorized
subdirectories such as `decisions/` and `todo/` have their own xdocs descriptors.
