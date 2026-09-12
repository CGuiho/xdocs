---
name: update
purpose: Guide an agent through synchronizing existing xdocs descriptors after repository changes.
description: Update existing xdocs descriptors after code or document changes.
created: 2026-06-02
owner: xdocs-prompts
flags: []
tags:
  - prompt
  - documentation-maintenance
keywords:
  - update descriptor
  - synchronize metadata
  - documentation maintenance
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# xdocs: Update Documentation

You are an AI assistant tasked with synchronizing existing xdocs descriptors
after code or document changes, within the project's explicit authorization.

## Instructions

1. Read `xdocs.yaml`, including `documentation.directories`,
   `documentation.frontmatter`, `ai.mode`, `ignore.gitignore`, and
   `ignore.rules`.
2. Identify which non-excluded files changed. Discovery is read-only and must
   include all non-excluded descriptor paths at every depth, regardless of the
   write allowlist.
3. Find the existing named `*.xdocs.md` descriptor for each changed directory.
   There must be exactly one descriptor per directory. A bare `.xdocs.md` and
   legacy `.docs.md` are invalid; report them instead of repairing or reusing
   them.
4. Before editing a descriptor, verify that its directory is covered by
   `documentation.directories` or by `.`. If it is not covered, leave the
   descriptor and every ordinary Markdown file unchanged and report the
   required authorization.
5. For each authorized affected xdocs descriptor:
   a. Re-read the files listed in the metadata to check if descriptions are still accurate.
   b. Check if new files were added that need to be listed.
   c. Check if files were removed that should be unlisted.
   d. Check if non-excluded sibling plain `*.md` documents were added or
      removed, and keep the `documents` metadata map exact.
   e. Keep every discovered ordinary Markdown file listed even when it has no
      frontmatter. Add or update its frontmatter only when an explicit
      `documentation.frontmatter` `{pattern, kind}` rule matches inside an
      authorized directory. A matching legacy `ignore.rules` denial with
      `frontmatter: false` always wins.
   f. Update the description if the module's purpose has changed.
   g. Update `keywords` if the module's searchable concepts changed.
   h. Update children if subdirectories were added or removed.
   i. Update the body content if significant changes occurred.
6. Preserve the existing descriptor structure, useful body context, and all
   information that remains accurate.
7. Do not create extra summary, overview, detail, companion, report, or index
   Markdown files. The descriptor body carries directory context.
8. `ai.mode: auto` permits only these already-authorized writes; `prompt` asks
   before them. Neither mode grants permission.

## Checklist

- [ ] All new files are listed in the files metadata
- [ ] Removed files are no longer listed
- [ ] All sibling plain Markdown documents are listed in the documents metadata
- [ ] Git-ignored paths are absent and documents without an explicit
      frontmatter grant remain listed without frontmatter edits
- [ ] Removed Markdown documents are no longer listed
- [ ] The changed descriptor directory is explicitly authorized
- [ ] Legacy `frontmatter: false` denials were applied before opt-ins
- [ ] File descriptions are accurate
- [ ] Module description reflects current state
- [ ] Keywords reflect current searchable concepts
- [ ] Children list matches actual subdirectories
- [ ] Parent reference is still correct
