---
subject: xdocs-github-workflows
description: Continuous integration, classified release publication, and post-publication exact-version installer acceptance workflows.
parent: xdocs-github
children: []
files:
  ci.yml: Cross-platform Bun, TypeScript, test, build, binary-matrix, installer-syntax, and isolated latest-stable public Bash installation validation.
  publish.yml: Stable/prerelease-aware publication followed by exact fourteen-asset verification and tag-pinned exact-version public Bash installer acceptance.
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

Main CI keeps the unpinned latest-stable installer as a generic public smoke.
The tag workflow is the release acceptance owner: it classifies stable and
prerelease releases explicitly, verifies the exact asset set, then installs the
tagged version through the tag-pinned installer and checks the binary, both
skill destinations, and managed project instructions.
