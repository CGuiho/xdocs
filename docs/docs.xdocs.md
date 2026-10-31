---
subject: xdocs-docs
description: Durable project documentation for xdocs behavior, design notes, and implementation context, plus the pointer to the internal lifecycle records kept in the private GUIHO repository.
parent: xdocs-package
children:
  - xdocs-architecture-docs
  - xdocs-decisions
  - xdocs-migrations
  - xdocs-superpowers
  - xdocs-todo
files: {}
documents:
  2026-07-05-xdocs-document-model.md: Defines the named descriptor plus companion Markdown document model for xdocs modules.
  internal-records.md: Where the internal lifecycle records live: the private GUIHO repository CGuiho/guiho, under docs/projects/xdocs/.
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


#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.
The `docs/` directory stores durable xdocs project notes. Plain Markdown
documents directly in this directory are listed in `documents`; categorized
subdirectories such as `decisions/`, `superpowers/`, and `todo/` have their own
xdocs descriptors. The planning, question-ledger, review and validation trees
moved to the private GUIHO repository `CGuiho/guiho` under
`docs/projects/xdocs/`; see
[internal-records.md](internal-records.md).
