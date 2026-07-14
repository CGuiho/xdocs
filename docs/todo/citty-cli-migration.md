---
name: xdocs Citty CLI Migration
purpose: Define the outcome, compatibility contract, and completion signals for migrating the xdocs CLI to Citty.
description: Specifies the complete replacement of handwritten argument parsing and routing while preserving xdocs commands, output formats, agent automation, self-management, library APIs, and native packaging.
created: 2026-07-14
flags:
  - completed
tags:
  - cli
  - migration
  - documentation
keywords:
  - xdocs
  - citty
  - argument parsing
  - command routing
  - native binary
owner: xdocs-todo
---

# xdocs Citty CLI Migration

## Summary

Migrate xdocs to the same Citty-owned CLI architecture proven in RunX. Citty
must become the only parser, command router, alias registry, and ordinary usage
generator. Descriptor discovery, validation, generation, agent automation,
rendering, and self-management remain domain logic behind thin adapters.

## Todo Index

- Task: `2. Migrate CLI Parsing and Routing to Citty`
- Status: completed
- Index: [TODO.md](../../TODO.md)
- Implementation notes: [citty-cli-migration-implementation.md](./citty-cli-migration-implementation.md)

## Outcome

The npm launcher, bundled CLI, and Bun-native executables use one declarative
Citty command tree. The handwritten parser and manual switch router are removed
without changing descriptor semantics, output payloads, automation boundaries,
command defaults, or supported installation paths.

## Current Baseline

- `source/flags.ts` owns token parsing, short aliases, flag normalization, list
  values, positional collection, and helper accessors.
- `source/cli.ts` validates top-level commands and routes through a switch.
- Command handlers consume `XDocsParsedArgs`; `source/guiho-xdocs.ts` publicly
  exports `parseArgs`, `stringFlag`, `booleanFlag`, and `listFlag`.
- `source/help.ts` owns contextual help, extended trees, and Markdown help.
- xdocs is a Bun/TypeScript ESM CLI and library distributed through npm and
  native binaries.

## Scope

### In scope

- Add `citty` as a runtime dependency and update `bun.lock` with Bun.
- Replace `source/flags.ts` and the manual switch in `source/cli.ts` with one
  Citty command tree.
- Refactor command adapters to accept typed Citty values or focused domain
  inputs rather than `XDocsParsedArgs`.
- Resolve the exported parser API deliberately: search repository and
  documented consumers, remove parser exports for the full migration, update
  `source/types.ts` and `source/guiho-xdocs.ts`, and record the API change. If
  confirmed consumers require compatibility, retain only a deprecated
  Citty-backed adapter with no handwritten token parsing and a documented
  removal boundary.
- Update tests, README, `DOCS.md`, architecture, AGENTS, the bundled xdocs
  skill, changelog, and affected XDocs descriptors.
- Validate the library, package launcher, bundle, and native binaries.

### Out of scope

- Changing descriptor schemas, discovery, metadata validation, context
  scoring, generation, tree rendering, config semantics, agent installation,
  or self-upgrade algorithms beyond thin CLI adapters.
- Adding another CLI framework or a second parser beside Citty.
- Publishing, tagging, or bumping xdocs without separate authorization.
- Hand-editing generated `library/`, `bundle/`, `bin/`, or `vendor/` output.

## Required Command Tree

```text
xdocs
|- init
|- scan
|- generate [path]
|- prompt
|- merge [path]
|- tree
|- list [path]
|- meta [path]
|- context <query> [path]
|- doctor [path]
|- agents
|  |- install <local|global>
|  `- instructions
|- upgrade
|  |- check
|  `- list
`- uninstall
```

Bare `xdocs upgrade` remains the default upgrade action. The background update
worker remains an internal route.

## Compatibility Contract

- Bare `xdocs` preserves agent bootstrap, cached-update notice, background
  check scheduling, and home help.
- Citty owns `-h`/`--help` and `-v`/`--version`; these work outside an xdocs
  project without scanning descriptors or mutating agent files.
- Preserve global `--cwd`, `--config`, `--format text|json|markdown`,
  `--verbose`, `--help-tree`, and `--help-docs`.
- Preserve `init --global --tool`, `prompt --name`, and output-file flags for
  generate, merge, and tree.
- Preserve metadata `--documents`, `--strict`, `--owner`, `--tag`, and
  `--keyword` flags.
- Preserve context `--documents`, `--files`, `--limit`, `--owner`, `--tag`,
  `--keyword`, and `--explain` flags.
- Preserve doctor `--no-documents` and `--warnings-as-errors`.
- Preserve `agents install <local|global> --tool agents|claude|all` and
  `agents instructions`.
- Preserve upgrade default/check/list, `--version`, `--arch`, `--variant`,
  `--dry-run`, and `uninstall --dry-run`.
- Unknown input, invalid enum/limit values, and missing required arguments must
  produce contextual usage errors without scanning or modifying a project.

## Domain and Side-Effect Boundaries

- `scan`, `generate`, `merge`, `tree`, `list`, `meta`, `context`, and `doctor`
  continue to run config-gated agent automation before domain work.
- `init`, explicit agent commands, help, version, upgrade, and uninstall retain
  their current automation and side-effect boundaries.
- Metadata, context, doctor, list, tree, help, version, and upgrade checks must
  not generate descriptors or mutate documented content.
- JSON and Markdown stdout remain clean machine-readable contracts.
- `XDocsError` remains the domain/validation error with existing exit codes;
  Citty usage failures become concise command-specific errors.

## Implementation Boundaries

- Keep CLI/native entrypoints thin and invoke testable `runCli(rawArgs)`.
- Define flags and positionals on the command that owns them.
- Prefer focused domain input types over leaking Citty types into modules.
- Use Citty ordinary usage while retaining `--help-tree`, `--help-docs`, and
  Markdown help as extended custom outputs.
- Remove `XDocsParsedArgs` when no compatibility adapter remains.
- Do not keep `source/flags.ts` as a wrapper that reparses raw arguments.

## Acceptance Signals

- `citty` is the only parser/router and bundles into npm and native outputs.
- `source/flags.ts` and the manual top-level switch are removed.
- Every command, nested command, positional, flag, default route, format, and
  hidden worker has automated coverage.
- Tests cover help/version outside a project, unknown/missing input, invalid
  formats and limits, JSON/Markdown, automation boundaries, filters, file
  outputs, upgrade/uninstall dry runs, and multi-tool agent installation.
- Public API tests/docs explicitly prove the parser-helper export outcome; no
  accidental library API disappears silently.
- `bun run typecheck`, `bun test`, `bun run build`, `bun run bundle`,
  `bun run binary`, and `bun run binaries` pass.
- Packed-launcher and native `-h`/`-v` smoke tests pass outside a project; the
  native executable needs no Node.js runtime.
- Strict XDocs metadata and doctor checks pass for touched scopes.

## Dependencies and Context

- Use RunX as the behavioral reference while preserving xdocs library and
  automation contracts.
- Preserve the current worktree and its self-upgrade changes before editing
  overlapping CLI tests or types.
- Inspect installed Citty types before nested defaults, repeated flags, and
  contextual usage work.
- Coordinate with task `1. Improve JSON Output Coverage` to avoid conflicting
  output rewrites.

## Watch-outs

- xdocs is both CLI and library; parser-export removal requires an explicit
  compatibility and release decision.
- Global `--version` and `upgrade --version <target>` are different options.
- Bare/data commands run agent automation; help/version must be safe outside a
  project.
- Preserve extended help trees, Markdown docs, examples, and clean stdout.
- Do not duplicate descriptor scans merely to route arguments.

## Before Starting

- Confirm branch/worktree state and preserve user changes.
- Run current typecheck, tests, build, bundle, and native help/version baseline.
- Inventory CLI, flags, command handlers, help, tests, and public docs.
- Search for parser-helper consumers and record the compatibility decision.

## While Working

- Migrate command groups incrementally with regressions before removal.
- Keep domain modules framework-independent and renderers stable.
- Verify automation/no-mutation boundaries after each group.
- Keep source descriptors and bundled skill guidance aligned.

## After Finishing

- Run the full Bun, package, native matrix, and XDocs validation suite.
- Update `DOCS.md` as a required release artifact plus README, architecture,
  AGENTS, skill, changelog, and descriptors.
- Inspect packed/native outputs for Citty and accidental Node dependencies.
- Deliver through protected CI; release separately through GUIHO Mirror.

## References

- [TODO.md](../../TODO.md)
- [Improve JSON Output Coverage](improve-json-output-coverage.md)
- [xdocs package documentation](../../DOCS.md)
- [Citty migration plan](../plans/citty-cli-migration.md)
- [Citty migration implementation notes](citty-cli-migration-implementation.md)
