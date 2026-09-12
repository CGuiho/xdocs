---
name: write
purpose: Guide an agent through creating a named xdocs descriptor for a directory or module.
description: Scan a directory and write a new named xdocs descriptor for it.
created: 2026-06-02
owner: xdocs-prompts
flags: []
tags:
  - prompt
  - descriptor-authoring
keywords:
  - write descriptor
  - xdocs metadata
  - module documentation
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# xdocs: Write Documentation

You are an AI assistant tasked with writing one xdocs descriptor for a directory
that the project has explicitly authorized for documentation.

## Instructions

1. Read `xdocs.yaml`, including `documentation.directories`,
   `documentation.frontmatter`, `ai.mode`, `ignore.gitignore`, and
   `ignore.rules`.
2. Resolve the exact target directory. A descriptor write is allowed only when
   `documentation.directories` contains that directory or an ancestor, or
   contains `.`. An empty list grants no descriptor writes. If the target is
   not authorized, report the missing authorization and do not create or edit
   any file.
3. Scan the target and its non-excluded contents without entering paths
   excluded by root or nested `.gitignore` files or `scan.exclude`.
4. Read only the non-excluded source and descriptor content needed to write
   useful context for this directory.
5. Create or update exactly one descriptor for the requested directory. Name a
   new descriptor after the directory, for example
   `technologies/technologies.xdocs.md`. Preserve an existing valid named
   descriptor instead of renaming it automatically. A bare `.xdocs.md` and a
   legacy `.docs.md` are invalid and must be reported, not reused.
6. Create the descriptor with YAML frontmatter containing:
   - subject: A short identifier for this module
   - description: A concise description of what this module does
   - parent: The parent module's subject (or null if this is a root module)
   - children: List of child module subjects
   - files: Map of filename to short description for each file
   - documents: Map of same-directory plain Markdown filename to short description
   - tags: Relevant tags (empty array if none)
   - keywords: Search terms and concepts that should help agents match requests
   - flags: Relevant flags (empty array if none)
7. Write meaningful directory context in the descriptor body below the
   frontmatter, including:
   - An overview section explaining the module in more detail
   - Usage examples if relevant
   - Any important notes or caveats
8. List every non-excluded same-directory plain Markdown file in the
   descriptor's `documents` map, including files without frontmatter.
9. Add or update frontmatter on an ordinary Markdown companion only when its
   path matches an explicit `documentation.frontmatter` rule and is inside an
   authorized documentation directory. A legacy `ignore.rules` entry with
   `frontmatter: false` always denies the write. Missing frontmatter is valid by
   default; never add it to `README.md`, `AGENTS.md`, or another user document
   merely because it is discoverable or listed.
10. Do not create a separate overview, summary, detail, companion, report, or
    index Markdown file. The descriptor is the directory's context. Do not
    create descriptors for other directories unless each is explicitly
    requested and covered by the same authorization.
11. Keep parent and child metadata consistent with the existing descriptor
    tree. Reject the write before changing any target if the descriptor is
    malformed, duplicated, excluded, outside the repository, or would create a
    second descriptor in the directory.

## Frontmatter Template

```yaml
---
subject: module-name
description: What this module does in one sentence.
parent: parent-module
children:
  - child-a
  - child-b
files:
  file-a.ts: What file-a does.
  file-b.ts: What file-b does.
documents:
  implementation-notes.md: What this companion document explains.
tags: []
keywords: []
flags: []
---
```
