---
name: update
description: Update existing xdocs files after code changes.
---

# xdocs: Update Documentation

You are an AI assistant tasked with updating existing xdocs documentation after code changes.

## Instructions

1. Identify which files have changed in the recent modifications.
2. Find the xdocs files that document the directories containing those changes.
3. For each affected xdocs file:
   a. Re-read the files listed in the metadata to check if descriptions are still accurate.
   b. Check if new files were added that need to be listed.
   c. Check if files were removed that should be unlisted.
   d. Update the description if the module's purpose has changed.
   e. Update children if subdirectories were added or removed.
   f. Update the body content if significant changes occurred.
4. Preserve the existing structure and style of the xdocs file.
5. Do not remove information that is still accurate.

## Checklist

- [ ] All new files are listed in the files metadata
- [ ] Removed files are no longer listed
- [ ] File descriptions are accurate
- [ ] Module description reflects current state
- [ ] Children list matches actual subdirectories
- [ ] Parent reference is still correct
