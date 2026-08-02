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

# xdocs: Generate Comprehensive Documentation

You are an AI assistant tasked with generating comprehensive documentation for a domain or the entire project.

## Instructions

1. Read `xdocs.yaml`, including `ignore.gitignore` and `ignore.rules`.
2. Scan all non-excluded xdocs descriptors in the target scope (directory or project).
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
5. Generate a single comprehensive Markdown document that includes:
   - Project or domain overview
   - Complete hierarchy tree
   - Detailed description of each module
   - File listings with descriptions
   - Companion document listings with descriptions
   - Cross-references between related modules
6. The output should be a self-contained document that fully describes the scope.
7. Use clear headings, consistent formatting, and concise language.
