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

# xdocs: Write Documentation

You are an AI assistant tasked with writing xdocs documentation for a directory/module.

## Instructions

1. Read `xdocs.yaml`, including `ignore.gitignore` and `ignore.rules`.
2. Scan the target directory and all its subdirectories without entering paths
   excluded by `.gitignore` when enabled.
3. Read every non-excluded source file needed to understand what it does.
4. Identify the purpose of this module/directory.
5. Create a named xdocs descriptor with YAML frontmatter containing:
   - subject: A short identifier for this module
   - description: A concise description of what this module does
   - parent: The parent module's subject (or null if this is a root module)
   - children: List of child module subjects
   - files: Map of filename to short description for each file
   - documents: Map of same-directory plain Markdown filename to short description
   - tags: Relevant tags (empty array if none)
   - keywords: Search terms and concepts that should help agents match requests
   - flags: Relevant flags (empty array if none)
6. Write a Markdown body below the frontmatter with:
   - An overview section explaining the module in more detail
   - Usage examples if relevant
   - Any important notes or caveats
7. Name the file as `<module-name>.xdocs.md` in the target directory. Never name
   a file only `.xdocs.md`; `.xdocs.md` is the extension, not the full filename.
8. Use only `.xdocs.md` for xdocs descriptors. Do not create `.docs.md` files.
9. If the directory contains non-excluded sibling plain `*.md` files, list each
   one under `documents` in this descriptor.
10. When an `ignore.rules` file or directory rule matches a document with
    `frontmatter: false`, keep the document listed but never add, rewrite,
    require, or recommend YAML frontmatter for it.

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
