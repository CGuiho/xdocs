---
name: Markdown Release Assets and Version-Scoped Notes
purpose: Preserve the accepted XDocs release artifact names, content validation, and GitHub Release note boundary.
description: Records the developer-approved override requiring .md agent assets, Markdown validation before installation, isolated installer tests, and release notes containing only the exact version section.
created: 2026-07-19
owner: xdocs-decisions
flags:
  - decision
  - accepted
tags:
  - release
  - cli
  - installer
  - github-actions
keywords:
  - guiho-s-xdocs.md
  - guiho-i-xdocs.md
  - release notes
  - changelog section
  - binary payload rejection
---

# Markdown Release Assets and Version-Scoped Notes

## Status

Accepted.

## Context

The original RFC 0034 operational contract named the two agent release
artifacts without filename extensions. The developer explicitly overrides that
rule for XDocs because both artifacts are Markdown resources.

The installer regression suite also revealed that its Windows fixture used the
real user home and served a PE executable for every requested asset. That test
could overwrite both installed `SKILL.md` files with an `MZ` payload. Release
and installer correctness therefore requires content validation as well as
unambiguous filenames and isolated fixture homes.

The existing publish workflow passed the complete `CHANGELOG.md` to
`gh release create`. GitHub Release descriptions must instead contain only the
section for the exact version represented by the tag.

## Decision

- The exact fourteen-asset release set is twelve native binaries plus
  `guiho-s-xdocs.md` and `guiho-i-xdocs.md`.
- Builders, release verification, installers, downloads, tests, upgrade
  documentation, and public documentation must use those exact `.md` names.
- Installers must reject empty, binary, or structurally invalid Markdown agent
  assets before writing any installed skill.
- Installer tests must use isolated home directories and realistic Markdown
  fixtures. They must never mutate the developer's global skill installation.
- GitHub Release notes must be extracted from the exact version's level-two
  changelog section. Extraction begins at the matching `## <version>` heading
  and stops before the next level-two heading.
- A missing, duplicate, or empty matching version section is a release failure.

## Alternatives Considered

- Keep extensionless names: rejected because the developer explicitly requires
  visible Markdown filenames and they provide a clearer content contract.
- Validate only non-empty downloads: rejected because a PE executable is
  non-empty and previously passed that check.
- Keep full changelog release notes: rejected because unrelated historical and
  unreleased sections do not belong in one version's release description.
- Hide stranded invalid assets through installer fallbacks: rejected because
  content mismatches must fail visibly before user files are changed.

## Consequences

- This intentionally diverges from the bundled RFC 0034 filename list for
  XDocs while preserving the exact total of fourteen assets.
- Existing releases remain immutable; only future release generation and
  installation use the `.md` names.
- Installer fixture coverage becomes safer and more representative.
- Release creation fails early when the changelog does not contain exactly one
  non-empty section for the tag version.

## Reversal Or Revisit Conditions

Revisit only if the developer changes the first-party asset naming policy or
the release host requires a different artifact format. Any revision must retain
content validation, isolated tests, and exact-version release notes.

## References

- [RFC 0034 migration plan](../plans/rfc-0034-cli-compliance-migration.md)
- [XDocs changelog](../../CHANGELOG.md)
- [Publish workflow](../../.github/workflows/publish.yml)
- [Release asset builder](../../devops/build-binaries.ts)
