---
subject: xdocs-github-workflows
description: Go CI, tag-triggered release publication, exact-asset verification, and installer acceptance workflows.
parent: xdocs-github
children: []
files:
  ci.yml: Cross-platform Go formatting, module, test, vet, native build, exact eleven-asset, installer syntax, and public installer validation.
  publish.yml: Approval-free xdocs/v* publication with Git-derived versions, exact-version notes, exactly eleven assets, and immutable installer acceptance.
documents: {}
tags:
  - github-actions
  - ci
  - release
keywords:
  - publish workflow
  - xdocs/vX.Y.Z
  - eleven assets
  - no approval gate
  - installer verification
flags: []
status: stable
---

CI validates the native Go CLI on Linux and Windows. Tag publication has no
protected-environment approval gate, derives the version only from
`xdocs/vX.Y.Z`, publishes exactly eleven assets, and uses only the matching
changelog section as release notes.
