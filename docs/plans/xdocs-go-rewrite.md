---
name: XDocs Go Rewrite Implementation Plan
purpose: Provide an executable, ordered plan for replacing the XDocs runtime and release path with Go.
description: Step-by-step units for scaffolding, domain parity, Cobra, agents, updates, upgrades, installers, CI, docs, validation, and release.
created: "2026-07-24"
owner: xdocs-plans
flags:
  - approved
tags:
  - plan
  - go
keywords:
  - cobra
  - xdocs v0.8.0
  - eleven assets
---

# XDocs Go Rewrite Implementation Plan

## Unit 1 — Establish Go And Version Foundations

1. Add `go.mod`, thin `main.go`, build metadata, injected dependencies, typed
   exit errors, and the first Cobra root.
2. Change Mirror to project `xdocs`, Git source/output, and
   `{name}/v{version}` tags.
3. Assert the no-argument banner, root version, forbidden short aliases, and
   fresh command-tree construction.

Acceptance: `go test ./...` can construct and execute an isolated root; neither
the executable nor Mirror reads `package.json` for a version.

## Unit 2 — Port Strict Configuration And Metadata

1. Implement explicit/project/global `xdocs.yaml` resolution.
2. Decode with `KnownFields(true)`, reject multiple YAML documents, and
   validate schema, extension, AI mode, exclusions, and project name.
3. Implement bounded frontmatter reads, descriptor schema validation, named
   descriptor rules, companion frontmatter validation, and stable paths.

Acceptance: precedence, unknown-field, malformed-YAML, semantic-error,
descriptor, and companion-document tests pass.

## Unit 3 — Port XDocs Domain Services

1. Port recursive discovery and exclusion behavior.
2. Port descriptor/document coverage and multiple-descriptor detection.
3. Port tree construction, tree validation, text, Markdown, and JSON output.
4. Port metadata scans, strict mode, owner/tag/keyword filters, companion
   inclusion, and deterministic errors.
5. Port context tokenization, weighted ranking, stable sorting, limits,
   explanations, files, and documents.
6. Port doctor checks, deduplication, missing file detection, warning promotion,
   and stable issue ordering.
7. Port init, scan, generate, merge, list, meta, context, tree, and doctor
   output and file-write behavior.

Acceptance: representative 0.7.x fixtures produce equivalent observable
results and all JSON modes emit exactly one document.

## Unit 4 — Build The Complete Cobra Catalog

1. Add every public command, positional, flag, validation rule, example, and
   side effect to one Cobra tree.
2. Add `--help-tree`, positive depth validation, and `--help-docs` to every
   command scope by traversing that live tree.
3. Permit only `-h` and root `-v`.
4. Keep diagnostics on stderr and map usage, configuration, network, and
   filesystem errors to the Go CLI Engineer exit contract.

Acceptance: root and nested help modes expose the complete real catalog, no
synthetic command exists, and unknown commands/flags fail deterministically.

## Unit 5 — Embed And Manage Agent Resources

1. Embed the canonical skill and four prompts from repository source files.
2. Implement global/local atomic skill install, update, uninstall, list, and
   show for both `.agents` and `.claude`.
3. Implement idempotent instruction apply, remove, update, and show for
   `AGENTS.md`, `CLAUDE.md`, both, or newly created `AGENTS.md`.
4. Keep `xdocs init` global by default and local only with `--local`.

Acceptance: all mutations are idempotent, preserve unmanaged content, validate
embedded metadata, and never use runtime repository files.

## Unit 6 — Implement Cached Updates And Release Discovery

1. Read and validate cache locally before ordinary text output.
2. Start a hidden detached worker without waiting and prevent recursion.
3. Add finite HTTP timeouts, response limits, stable SemVer normalization for
   `xdocs/vX.Y.Z`, atomic cache writes, leases, and stale recovery.
4. Implement stable-only notice behavior and paginated eight-release listing
   with full JSON and Markdown metadata.

Acceptance: foreground commands do no network work; absent, corrupt, stale,
valid, timeout, and concurrent-worker tests pass without worker chains.

## Unit 7 — Implement Installation, Upgrade, And Uninstall

1. Resolve the exact embedded build target, release, checksum, executable, and
   recovery commands before mutation.
2. Stream bounded downloads with progress, verify SHA-256, and reject missing
   or mismatched manifest entries.
3. Replace atomically on Unix and through a detached post-exit helper on
   Windows; verify the canonical executable and restore on failure.
4. Refresh global skills and reconcile instructions after success.
5. Implement `upgrade`, `upgrade check`, `upgrade list`, and `uninstall`
   including dry-run and stable JSON envelopes.
6. Replace Bash and PowerShell installers with Go 11-asset target selection,
   checksum verification, skill ZIP installation, PATH setup, and final
   version verification.

Acceptance: dry-run, exact version, checksum failure, rollback, Windows staging,
installer mapping, and isolated install tests pass.

## Unit 8 — Replace CI And Release Automation

1. Replace Bun setup and commands with pinned Go setup, gofmt check, tidy-diff,
   tests, vet, native build/smoke, and eight-target cross-builds.
2. Build exactly eight binaries plus the skill ZIP, instruction Markdown, and
   checksum manifest.
3. Extract only the exact `## X.Y.Z` changelog section.
4. Trigger publishing only for `xdocs/v*`, keep the job approval-free, classify
   stable/prerelease tags, upload exactly 11 assets, and verify exact equality.
5. Run public installer acceptance against the exact tag.

Acceptance: workflow tests prove no approval environment, no Bun runtime, the
new tag family, exact release notes, and exactly 11 assets.

## Unit 9 — Documentation, Review, Version, And Delivery

1. Update `AGENTS.md`, `README.md`, `DOCS.md`, architecture, decision, plan,
   TODO, xdocs descriptors, and validation docs for Go.
2. Run gofmt, tidy, tests, vet, cross-builds, checksums, installer checks,
   native smoke, `xdocs tree`, and `xdocs doctor`.
3. Review implementation against this plan and record gaps or residual risk.
4. Plan and apply the Mirror minor release from Git, producing
   `xdocs/v0.8.0`.
5. Commit each file separately, push main/tag, verify CI and GitHub release,
   and close any matching XDocs rewrite issue only after public acceptance.

Stop conditions: do not release if the 11-asset set differs, Go validation is
red, installer acceptance fails, a package-based version source remains, or
the publish workflow contains an approval environment.
