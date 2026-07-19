---
name: XDocs Open-Issue and Release Hardening Review
purpose: Review the final implementation for release assets, installers, GitHub Release notes, and issues 7 through 12.
description: Findings-first review of correctness, reliability, test isolation, structured output, documentation, and patch-release readiness.
created: 2026-07-19
owner: xdocs-implementation-reviews
flags:
  - implementation-review
  - approved
tags:
  - cli
  - release
  - installers
  - github-issues
keywords:
  - guiho-s-xdocs.md
  - exact release notes
  - upgrade transaction
  - download progress
  - help tree
---

# XDocs Open-Issue and Release Hardening Review

## Verdict

Approved for a patch release. No blocker, high-severity, or medium-severity
implementation finding remains in the reviewed scope.

## Findings

No open implementation findings.

## Reviewed scope

- exact 14-asset release set: 12 native binaries plus
  `guiho-s-xdocs.md` and `guiho-i-xdocs.md`;
- Markdown identity validation before build/install and rejection of executable
  or malformed agent payloads;
- installer-test isolation from real `HOME` and `USERPROFILE`;
- POSIX and Windows PATH preservation;
- exact tagged-version GitHub Release note extraction;
- global-by-default, dual-tool, idempotent `xdocs init` skill installation with
  `--local`;
- synchronous verified upgrade transaction, rollback, recovery guidance, and
  complete release listing;
- root/group/leaf Unicode help trees and depth validation;
- streamed installer and in-process upgrade download progress;
- text, Markdown, and one-document JSON behavior;
- TODO, decisions, plan, skill, public docs, changelog, and xdocs descriptors.

## Risk review

- Windows running-image replacement is executed with a real compiled
  executable; only backup deletion may be deferred.
- Candidate, canonical, and installer verification require the exact requested
  version.
- Download interruption after partial progress remains a failed download phase
  and cannot report success.
- Installer fixtures use isolated homes and valid Markdown payloads, preventing
  recurrence of the real global-skill PE corruption.
- Release notes fail closed when the exact changelog section is missing,
  duplicated, or empty.
- The protected GitHub `production` environment may delay public Release
  publication after the tag push. That is an external release gate, not an
  implementation defect.

## Evidence

- Full Bun suite: 64 passed, 0 failed, 319 expectations.
- TypeScript source check: passed.
- TypeScript library build: passed.
- Native release build: exactly 12 native binaries plus the two required `.md`
  assets.
- Windows PowerShell and Git Bash recovery installers: passed in isolated homes.
- POSIX installer syntax and fresh-shell PATH command resolution: passed.
- Strict xdocs metadata: passed.
- `xdocs doctor`: 0 errors, 0 warnings.
- Live GitHub release catalog: 14 releases returned in text and JSON, including
  the alpha channel.

## Release condition

Use GUIHO Mirror for the patch transition. After the GitHub Release is public,
verify the exact 14 assets, exact-version release description, native install,
and live self-upgrade before closing issue #9.
