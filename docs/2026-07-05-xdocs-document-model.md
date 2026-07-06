---
name: xdocs Document Model
purpose: Record the descriptor-plus-companion-document model for future xdocs implementation work.
description: Explains how named xdocs descriptors, root XDOCS.md, and same-directory Markdown companion documents work together for AI navigation.
created: 2026-07-05
keywords:
  - xdocs descriptors
  - companion documents
  - AI navigation
---

# xdocs Document Model

## Summary

xdocs now treats a directory as documented by exactly one named `*.xdocs.md`
descriptor. The root of a repository still uses `XDOCS.md` as a plain index with
no frontmatter, but normal modules use a descriptor such as
`authentication.xdocs.md`. A file named only `.xdocs.md` is invalid because
`.xdocs.md` is the extension, not the filename.

## Descriptor Metadata

The descriptor is the AI-facing map for a module. Its YAML frontmatter contains
the module identity, parent/child tree links, implementation files, and sibling
Markdown companion documents.

```yaml
---
subject: authentication
description: Authentication implementation and session behavior.
parent: backend
children: []
files:
  login.ts: Email/password login flow.
  session.ts: Session lifecycle and validation.
documents:
  authentication-implementation.md: Detailed implementation notes and decisions.
tags:
  - security
keywords:
  - authentication
  - sessions
  - implementation notes
flags: []
status: stable
---
```

`files` is for implementation, configuration, and asset files. `documents` is
only for same-directory plain `*.md` files that are not `*.xdocs.md` descriptors
and not `XDOCS.md`.

`keywords` is for search terms and concepts an agent can use to match a user
request to the right descriptor. Companion Markdown documents use the same idea
in their own frontmatter.

## AI Workflow

Agents should use `xdocs scan` to locate named `*.xdocs.md` descriptors, read
frontmatter first, and use the `documents` map to decide which companion
Markdown files are worth opening. When a user asks about a module, the agent can
find the relevant module by descriptor metadata before reading source files.

When changing a directory, an agent must update the directory descriptor so the
`files`, `documents`, `keywords`, `parent`, and `children` fields match disk. If a sibling
plain Markdown file is added, renamed, or removed, the descriptor's `documents`
map changes in the same unit of work.

## CLI Rules

`xdocs scan` reports descriptor coverage and validates that every sibling plain
Markdown file is listed in `documents`. It also marks a directory invalid when it
has multiple `*.xdocs.md` descriptors or a nameless `.xdocs.md` file.

`xdocs list`, `xdocs generate`, and `xdocs merge` surface both implementation
files and companion documents, keeping the two categories separate.
