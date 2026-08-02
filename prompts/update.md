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

# xdocs: Update Documentation

You are an AI assistant tasked with updating existing xdocs documentation after code changes.

## Instructions

1. Read `xdocs.yaml`, including `ignore.gitignore` and `ignore.rules`.
2. Identify which non-excluded files have changed in the recent modifications.
3. Find the named `*.xdocs.md` descriptor files that document the directories
   containing those changes. There must be exactly one descriptor per directory,
   and it must not be named only `.xdocs.md`.
4. For each affected xdocs descriptor:
   a. Re-read the files listed in the metadata to check if descriptions are still accurate.
   b. Check if new files were added that need to be listed.
   c. Check if files were removed that should be unlisted.
   d. Check if non-excluded sibling plain `*.md` documents were added or
      removed, and keep the `documents` metadata map exact.
   e. Keep documents matched by an `ignore.rules` entry with
      `frontmatter: false` listed, but never add, rewrite, require, or recommend
      YAML frontmatter for them.
   f. Update the description if the module's purpose has changed.
   g. Update `keywords` if the module's searchable concepts changed.
   h. Update children if subdirectories were added or removed.
   i. Update the body content if significant changes occurred.
5. Preserve the existing structure and style of the xdocs descriptor.
6. Do not remove information that is still accurate.

## Checklist

- [ ] All new files are listed in the files metadata
- [ ] Removed files are no longer listed
- [ ] All sibling plain Markdown documents are listed in the documents metadata
- [ ] Git-ignored paths are absent and frontmatter-opted-out documents remain listed without frontmatter edits
- [ ] Removed Markdown documents are no longer listed
- [ ] File descriptions are accurate
- [ ] Module description reflects current state
- [ ] Keywords reflect current searchable concepts
- [ ] Children list matches actual subdirectories
- [ ] Parent reference is still correct
