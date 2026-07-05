---
name: update
description: Update existing xdocs descriptors after code or document changes.
---

# xdocs: Update Documentation

You are an AI assistant tasked with updating existing xdocs documentation after code changes.

## Instructions

1. Identify which files have changed in the recent modifications.
2. Find the named `*.xdocs.md` descriptor files that document the directories
   containing those changes. There must be exactly one descriptor per directory,
   and it must not be named only `.xdocs.md`.
3. For each affected xdocs descriptor:
   a. Re-read the files listed in the metadata to check if descriptions are still accurate.
   b. Check if new files were added that need to be listed.
   c. Check if files were removed that should be unlisted.
   d. Check if sibling plain `*.md` documents were added or removed, and keep
      the `documents` metadata map exact.
   e. Update the description if the module's purpose has changed.
   f. Update children if subdirectories were added or removed.
   g. Update the body content if significant changes occurred.
4. Preserve the existing structure and style of the xdocs descriptor.
5. Do not remove information that is still accurate.

## Checklist

- [ ] All new files are listed in the files metadata
- [ ] Removed files are no longer listed
- [ ] All sibling plain Markdown documents are listed in the documents metadata
- [ ] Removed Markdown documents are no longer listed
- [ ] File descriptions are accurate
- [ ] Module description reflects current state
- [ ] Children list matches actual subdirectories
- [ ] Parent reference is still correct
