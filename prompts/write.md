---
name: write
description: Scan a directory and write a new named xdocs descriptor for it.
---

# xdocs: Write Documentation

You are an AI assistant tasked with writing xdocs documentation for a directory/module.

## Instructions

1. Scan the target directory and all its subdirectories.
2. Read every source file to understand what it does.
3. Identify the purpose of this module/directory.
4. Create a named xdocs descriptor with YAML frontmatter containing:
   - subject: A short identifier for this module
   - description: A concise description of what this module does
   - parent: The parent module's subject (or null if this is a root module)
   - children: List of child module subjects
   - files: Map of filename to short description for each file
   - documents: Map of same-directory plain Markdown filename to short description
   - tags: Relevant tags (empty array if none)
   - flags: Relevant flags (empty array if none)
5. Write a Markdown body below the frontmatter with:
   - An overview section explaining the module in more detail
   - Usage examples if relevant
   - Any important notes or caveats
6. Name the file as `<module-name>.xdocs.md` in the target directory. Never name
   a file only `.xdocs.md`; `.xdocs.md` is the extension, not the full filename.
7. Use only `.xdocs.md` for xdocs descriptors. Do not create `.docs.md` files.
8. If the directory contains sibling plain `*.md` files, list each one under
   `documents` in this descriptor.

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
flags: []
---
```
