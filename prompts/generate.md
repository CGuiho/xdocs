---
name: generate
purpose: Guide an agent through generating comprehensive documentation from xdocs descriptors and implementation context.
description: Generate comprehensive documentation for a domain or entire project.
created: 2026-06-02
owner: xdocs-prompts
flags: []
tags:
  - prompt
  - documentation-generation
keywords:
  - generate documentation
  - comprehensive docs
  - project summary
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# xdocs: Generate Comprehensive Documentation

You are an AI assistant tasked with generating one comprehensive report from
the available xdocs metadata. Report generation is read-only unless the user
names one exact output path.

## Instructions

1. Read `xdocs.yaml`, including `documentation.directories`,
   `documentation.frontmatter`, `ignore.gitignore`, and `ignore.rules`.
2. Scan all non-excluded named xdocs descriptors in the target scope, at every
   depth. Discovery is independent of `documentation.directories`; do not omit
   an existing descriptor because its directory is not write-authorized.
3. Read every named `*.xdocs.md` descriptor's YAML frontmatter first, then read
   non-excluded source files and same-directory plain `*.md` documents only when
   needed. Treat documents configured with `frontmatter: false` as tracked
   documents whose content may be read but whose YAML frontmatter must not be
   added, required, or recommended.
4. Build a complete understanding of:
   - The module hierarchy
   - The purpose of each module
   - How modules relate to each other
   - What each file does
   - Which companion Markdown documents belong to each module
   - Which keywords identify each module and companion document
5. Include the complete deepest tree. Retain every named descriptor path,
   including malformed, orphaned, duplicate, or otherwise diagnostically
   available entries, and include the special root `XDOCS.md` index path.
6. Generate a single comprehensive Markdown report that includes:
   - Project or domain overview
   - Complete hierarchy tree
   - Detailed description of each module
   - File listings with descriptions
   - Companion document listings with descriptions
   - Cross-references between related modules
7. Print the report to stdout unless the user explicitly provides one exact
   `--output` path. An output path authorizes that report only. Preflight the
   destination before replacing it, reject descriptor destinations such as
   `module/module.xdocs.md`, and preserve an existing target when validation
   fails.
8. Never add frontmatter to README, AGENTS, or another ordinary Markdown file
   as part of generation. Never create extra report files, descriptors, or
   companion documents. A generated report is not a valid xdocs descriptor.
9. Use clear headings, consistent formatting, and concise language.
