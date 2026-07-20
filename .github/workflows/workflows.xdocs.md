---
subject: xdocs-github-workflows
description: Continuous integration, release publication, and public installer verification workflows.
parent: xdocs-github
children: []
files:
  ci.yml: Cross-platform Bun, TypeScript, test, build, binary-matrix, installer-syntax, and isolated latest-stable public Bash installation validation.
  publish.yml: Protected exact-version release publication with exact fourteen-asset verification.
documents: {}
tags:
  - github-actions
  - ci
  - release
keywords:
  - publish workflow
  - fourteen assets
  - curl
  - installer verification
flags: []
status: stable
---

The main CI workflow validates the latest stable public installer after release
publication; the protected publish workflow remains focused on building and
verifying release assets.
