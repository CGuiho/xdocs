---
subject: xdocs-release-notes
description: Exact changelog-section extractor for xdocs/vX.Y.Z Git releases.
parent: xdocs-devops
children: []
files:
  main.go: Validates the Go tag namespace and writes only the matching level-two changelog section.
  main_test.go: Rejects legacy tag formats and accepts stable and prerelease XDocs Go tags.
documents: {}
tags:
  - release-notes
  - go
keywords:
  - exact version section
  - xdocs/vX.Y.Z
flags: []
status: stable
---

Publish CI uses this program so a GitHub Release never receives the full
changelog.
