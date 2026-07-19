---
name: XDocs Open-Issue and Release Hardening Validation
purpose: Preserve reproducible validation evidence for issues 7 through 12 and the final XDocs patch release.
description: Commands, results, release gates, and remaining external verification for the XDocs CLI hardening work.
created: 2026-07-19
owner: xdocs-validation
flags:
  - validation
  - release-readiness
tags:
  - cli
  - testing
  - release
keywords:
  - 64 tests
  - fourteen assets
  - GitHub issues
  - exact release notes
  - self upgrade
---

# XDocs Open-Issue and Release Hardening Validation

## Local verdict

Passed. The repository is ready for a Mirror-managed patch release.

## Commands and results

| Check | Result |
| --- | --- |
| `bun test` | 64 passed, 0 failed, 319 expectations |
| `bun run typecheck` | passed |
| `bun run build` | passed |
| `bun run binaries` | passed; exact 12 native plus 2 Markdown assets |
| PowerShell parser for `devops/install.ps1` | passed |
| `bash -n devops/install.sh` | passed |
| `xdocs meta . --strict --documents --format json` | passed |
| `xdocs doctor .` | valid, 0 errors, 0 warnings |
| `git diff --check` | passed |

## Acceptance evidence

- Issue #7: global default, `--local`, both tool destinations, idempotence, and
  isolated home coverage pass.
- Issue #8: generated profile text preserves literal `$PATH`; a fresh Bash
  shell resolves `xdocs`, `ls`, and `mkdir`; Windows literal-token guards pass.
- Issue #9: canonical replacement precedes verification/success; swap
  obstruction and version mismatch fail or roll back; a real running Windows
  executable is replaced; the live list returns every release and channel.
- Issue #10: all terminal outcomes print a full-version pinned installer before
  a separate stop command; JSON includes the same recovery object; generated
  stable/prerelease installer commands execute in isolated fixtures.
- Issue #11: Unicode root/group/leaf trees, positive depth, invalid depth,
  hidden-command exclusion, and ANSI-free stdout pass.
- Issue #12: known-length percentage, unknown-length bytes, human bars, JSON
  progress, partial-stream failure attribution, Bash curl progress, and
  deterministic PowerShell progress pass.
- Release hardening: agent assets are named `.md`, payload validation rejects
  PE/NUL/invalid metadata, and installer fixtures cannot touch real global
  homes.
- Release description: extraction returns only the exact tagged version section
  and rejects missing, duplicate, empty, and prefix-only matches.

## Live catalog evidence

Before the patch release, `xdocs upgrade list` returned 14 published GitHub
Releases in newest-first SemVer order. Text and JSON both included
`0.6.0-alpha.0`, exact channel labels, current/latest-stable markers, and a
compatible Windows x64 asset.

## External release gate

After Mirror applies and pushes the patch tag:

1. wait for the protected publish workflow to create the public GitHub Release;
2. verify exactly 14 correctly named assets;
3. verify the Release description contains only the patch section from
   `CHANGELOG.md`;
4. install the patch into an isolated directory and verify `xdocs --version`;
5. execute a live upgrade from the previous public patch and verify the
   canonical executable reports the new patch;
6. add factual evidence to issue #9 and close it as completed;
7. prove the repository has zero open issues.
