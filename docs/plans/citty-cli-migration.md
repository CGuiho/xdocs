---
name: xdocs Citty CLI Migration Plan
purpose: Sequence the approved Citty migration into executable, testable units without losing current CLI or library behavior.
description: Defines dependencies, affected files, acceptance criteria, stop conditions, documentation work, and verification for the complete xdocs Citty migration.
created: 2026-07-14
flags:
  - approved
  - executable
tags:
  - implementation
  - cli
  - migration
keywords:
  - xdocs
  - Citty
  - argument parsing
  - command routing
  - native binary
owner: xdocs-plans
---

# xdocs Citty CLI Migration Plan

## Summary

Execute TODO task `2. Migrate CLI Parsing and Routing to Citty` as one package-local
migration. Citty becomes the sole parser, command router, alias registry, and
ordinary usage generator. Existing domain modules, output contracts, agent
automation, native distribution, and self-management behavior remain behind thin
typed command adapters.

The repository search found no package-local consumer of the public
`parseArgs`, `stringFlag`, `booleanFlag`, `listFlag`, or `XDocsParsedArgs` API
outside the CLI implementation, tests, and documentation. The migration therefore
removes those exports and records the intentional breaking library change. No
compatibility parser remains.

## Traceability

- Task index: [TODO.md](../../TODO.md), task `2`
- Approved specification: [Citty CLI migration](../todo/citty-cli-migration.md)
- Canonical package documentation: [DOCS.md](../../DOCS.md)
- CLI architecture: [ARCHITECTURE.md](../../ARCHITECTURE.md)
- Repository instructions: [AGENTS.md](../../AGENTS.md)

## Baseline

Before implementation on 2026-07-14:

- `bun run typecheck` passed.
- `bun test` passed: 112 tests, 293 expectations.
- `bun run build`, `bun run bundle`, and `bun run binary` passed.
- The worktree already contained user changes for equal-version self-upgrade
  no-op behavior. Those changes must be preserved while migrating the overlapping
  upgrade adapter, tests, types, README, DOCS, and source descriptor.

## Unit 1: Introduce Citty and Freeze the CLI Contract

- Goal: Install Citty with Bun and capture the exact command/flag tree in tests.
- Owning repository: `C:\GUIHO\xdocs`.
- Dependencies: Approved task specification and passing baseline.
- Expected files: `package.json`, `bun.lock`, `source/guiho-xdocs.spec.ts`.
- Data/schema impact: None.
- Auth/cache impact: None; preserve the existing update-cache behavior.
- Documentation impact: Record Citty as a runtime dependency and CLI architecture
  choice in canonical documentation during Unit 5.
- Tests/checks: Inspect installed Citty types and add parser/router behavior tests
  for root flags, every command, nested commands, required positionals, invalid
  enum/limit values, and unknown input.
- Acceptance criteria:
  - `citty` is a runtime dependency installed through `bun add citty`.
  - Tests describe the current CLI contract before handwritten parsing is removed.
- Stop condition: Stop if the installed Citty API cannot represent nested commands,
  required/optional positionals, aliases, or testable raw-argument execution without
  a second parser.

## Unit 2: Refactor Command Handlers to Focused Inputs

- Goal: Remove command-handler dependence on `XDocsParsedArgs` and flag helper
  functions while preserving domain behavior and outputs.
- Dependencies: Unit 1.
- Expected files: `source/commands/*.ts`, `source/types.ts`, command tests.
- Data/schema impact: None.
- Auth/cache impact: None.
- Documentation impact: Update `source/commands/commands.xdocs.md` when handler
  responsibilities or accepted inputs change.
- Tests/checks: Targeted handler/CLI tests for paths, outputs, filters, agent tools,
  upgrade variants, dry runs, and uninstall dry runs.
- Acceptance criteria:
  - Each handler accepts `XDocsCliOptions` plus a small command-specific input.
  - Citty types do not leak into domain modules.
  - Existing output payloads and side-effect boundaries remain unchanged.
- Stop condition: Stop if preserving an output contract would require changing
  domain semantics outside the approved scope.

## Unit 3: Replace Parsing and Routing with One Citty Command Tree

- Goal: Define every root, command, nested command, positional, flag, alias,
  default route, and hidden worker through one declarative Citty tree.
- Dependencies: Unit 2.
- Expected files: `source/cli.ts`, `source/help.ts`, deletion of `source/flags.ts`,
  CLI tests, and potentially a focused CLI-only type module if required by Citty.
- Data/schema impact: None.
- Auth/cache impact: Preserve cached update notices and background scheduling on
  bare invocation only.
- Documentation impact: Update `source/source.xdocs.md` for added/removed files and
  revised CLI/help ownership.
- Tests/checks:
  - Root and command `-h`/`--help`, root `-v`/`--version`, `--help-tree`, and
    `--help-docs` outside a project.
  - Bare invocation, data-command automation, explicit agent commands, the hidden
    update worker, and no-mutation usage failures.
  - Unknown commands/flags, missing required values/positionals, invalid formats,
    limits, scopes, tools, architectures, and variants.
- Acceptance criteria:
  - Citty is the only parser and router.
  - `source/flags.ts`, `XDocsParsedArgs`, parser helpers, and the manual switch are
    removed.
  - `runCli(rawArgs)` remains a testable library entrypoint and entrypoint modules
    remain thin.
  - Ordinary help is generated by Citty; extended tree/Markdown help remains
    available through xdocs custom renderers.
- Stop condition: Stop if help/version requires project discovery, agent writes,
  or process termination in library tests.

## Unit 4: Resolve the Public Library API and Compatibility Evidence

- Goal: Make parser-helper removal deliberate and visible.
- Dependencies: Unit 3.
- Expected files: `source/guiho-xdocs.ts`, `source/types.ts`, public API tests,
  `README.md`, `DOCS.md`, `CHANGELOG.md`.
- Data/schema impact: None.
- Auth/cache impact: None.
- Tests/checks: Build declaration output and verify supported public exports remain.
- Acceptance criteria:
  - Parser helpers and `XDocsParsedArgs` are no longer exported or documented.
  - The Unreleased changelog explicitly calls out the library API break.
  - CLI/domain public APIs remain available.
- Stop condition: Stop if a repository consumer is discovered after implementation;
  assess whether a deprecated Citty-backed adapter is required before proceeding.

## Unit 5: Complete Documentation and Task Tracking

- Goal: Align every shipping and repository-local documentation surface with the
  implemented Citty architecture.
- Dependencies: Units 1-4 behavior is stable.
- Expected files: `README.md`, `DOCS.md`, `ARCHITECTURE.md`, `AGENTS.md`,
  `CHANGELOG.md`, `skills/guiho-s-xdocs/SKILL.md`, `TODO.md`, task spec, and affected
  `*.xdocs.md` descriptors.
- Data/schema impact: None.
- Auth/cache impact: None.
- Tests/checks: Search for stale `flags.ts`, handwritten parser, manual routing, and
  old parser API references.
- Acceptance criteria:
  - `DOCS.md` describes all shipping commands, flags, API changes, automation, and
    Citty ownership accurately.
  - The bundled skill and AGENTS source structure match the real implementation.
  - Task `2` status and linked spec reflect verified implementation state only.
  - Descriptor files list all added/removed/significantly changed files and docs.
- Stop condition: Do not mark the task complete until Unit 6 passes.

## Unit 6: Full Verification and Delivery Evidence

- Goal: Prove source, library, launcher, bundle, and native paths all use the same
  Citty command tree and preserve contracts.
- Dependencies: Units 1-5.
- Expected files: Tests and `docs/validation/` evidence only if failures or durable
  results require a separate report.
- Tests/checks:
  - `bun run typecheck`
  - `bun test`
  - `bun run build`
  - `bun run bundle`
  - `bun run binary`
  - `bun run binaries`
  - package launcher source-checkout smoke tests
  - built library import/export smoke tests
  - native `-h`/`-v`, command help, unknown-input, and JSON-output smoke tests from
    outside an xdocs project
  - strict xdocs metadata, tree, scan, and doctor checks for touched scopes
- Acceptance criteria:
  - All commands pass, or any environment-only blocker is isolated and reported
    with the remaining successful evidence.
  - Native executables require no Node.js runtime and include Citty.
  - Generated outputs are inspected through commands and remain unedited by hand.
  - Git diff contains no accidental overwrite of the pre-existing self-upgrade work.
- Stop condition: Do not publish, tag, bump, deploy, or push without separate user
  authorization.

## First Executable Unit

Run Unit 1: install `citty` with Bun, inspect its installed TypeScript API, and add
contract tests before replacing command handlers.
