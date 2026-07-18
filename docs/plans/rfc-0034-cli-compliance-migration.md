---
name: xdocs RFC 0034 CLI Compliance Migration Plan
purpose: Provide an executable breaking-change migration plan for bringing the xdocs CLI into complete GUIHO RFC 0034 compliance.
description: Sequences the Bun-only and TypeBox migration, YAML configuration, final Citty catalog, startup and help contracts, complete agent namespace, upgrade/install distribution, fourteen assets, documentation, and validation.
created: 2026-07-18
flags:
  - approved
  - breaking-change
  - implementation-ready
tags:
  - planning
  - cli
  - migration
  - rfc-0034
keywords:
  - xdocs
  - guiho-s-0034-cli-engineer
  - TypeBox
  - xdocs.yaml
  - agent prompt catalog
  - darwin assets
  - fourteen release assets
owner: xdocs-plans
---

# xdocs RFC 0034 CLI Compliance Migration Plan

## Outcome

Migrate `@guiho/xdocs` to the full GUIHO RFC 0034 CLI contract while preserving
its structured-documentation domain. The migration is intentionally breaking.
xdocs does not need to retain TOML configuration, Node-compatible library
internals, root `prompt --name`, plural `agents` commands, automatic skill and
AGENTS mutations on data commands, old cache locations, `macos` release names,
or its Bun-dependent npm launcher.

The final package must use Bun, strict ESM TypeScript, raw Citty, and TypeBox;
keep core source free of prohibited Node imports; use `xdocs.yaml`; expose exact
startup, help, agent, upgrade, installer, and output contracts; keep prompt and
skill resources embedded; and release exactly twelve binaries plus
`guiho-s-xdocs` and `guiho-i-xdocs`.

## Authority And Required Execution Roles

Every execution session must use:

- Agent: `guiho-a-0001-swe`, the GUIHO Software Engineer/SWE coordinator.
- Mandatory CLI specialist skill: `guiho-s-0034-cli-engineer`.
- Execution controller: `guiho-s-0023-plan-executor`.
- Source skills: `guiho-s-0015-bun`, `guiho-s-0019-typescript`, and
  `guiho-s-0011-typebox`.
- Documentation skills: `guiho-s-0016-writing-docs`,
  `guiho-s-0017-todo`, and `guiho-s-xdocs`.
- Release skills: `guiho-s-mirror` after validation and
  `guiho-s-0020-cloud-computing` for GitHub release/CI changes.
- Completion skills: `guiho-s-0029-implementation-reviewer` and
  `guiho-s-0030-validation-reporter`.

The CLI engineer is a skill, not an agent; the SWE agent remains the lifecycle
coordinator.

## Approved Breaking-Change Boundary

- Replace `xdocs.config.toml` with `xdocs.yaml` everywhere.
- Do not provide a TOML compatibility reader or converter in the CLI.
- Remove Node runtime support from core/shared xdocs source where it conflicts
  with the Bun-only rule; the npm bootstrap is the only Node exception.
- Remove root `xdocs prompt --name=<name>`.
- Replace `xdocs agents ...` with `xdocs agent ...`.
- Remove `--tool`, positional `local|global`, and config-driven auto agent
  mutation.
- Remove `-v` from scoped `upgrade --version`; `-v` is root version only.
- Replace `macos` asset names with `darwin`.
- Replace the Bun-dependent package launcher with a Node-compatible native
  bootstrap.
- Remove rather than deprecate incompatible public parser/library helpers when
  necessary; the package is pre-1.0.

## Final Public Command Catalog

```text
xdocs
├── init
├── scan
├── generate [path]
├── merge [path]
├── tree
├── list [path]
├── meta [path]
├── context <query> [path]
├── doctor [path]
├── agent
│   ├── skill
│   │   ├── install
│   │   ├── uninstall
│   │   ├── update
│   │   ├── list
│   │   └── show <id>
│   ├── instruction
│   │   ├── apply
│   │   ├── remove
│   │   ├── update
│   │   └── show
│   └── prompt
│       ├── list
│       └── show <id>
├── upgrade
│   ├── check
│   └── list
└── uninstall
```

The existing `write`, `update`, `agents`, and `generate` prompt bodies remain
available as agent prompt IDs. They move from `xdocs prompt --name` to
`xdocs agent prompt list|show`.

## Skill Routing By Unit

| Units | Required skills |
| --- | --- |
| XD-01 | `guiho-a-0001-swe`, `guiho-s-0023-plan-executor`, `guiho-s-0034-cli-engineer`, and `guiho-s-xdocs` |
| XD-02-XD-04 | Add `guiho-s-0011-typebox`, `guiho-s-0015-bun`, and `guiho-s-0019-typescript` |
| XD-05-XD-11 | Keep CLI engineer, Bun, TypeScript, TypeBox, and xdocs loaded |
| XD-12-XD-15 | Add `guiho-s-0020-cloud-computing` for GitHub release/CI behavior; use `guiho-s-mirror` only for read-only release configuration work |
| XD-16 | Add `guiho-s-0016-writing-docs` and `guiho-s-0017-todo` |
| XD-17 | Use SWE coordination plus writing-docs/TODO for the downstream handoff |
| XD-18 | Add `guiho-s-0029-implementation-reviewer` and `guiho-s-0030-validation-reporter` |

Every row inherits the SWE agent and plan executor. Reload skills when execution
continues in a later session.

## Execution Sequence

### Unit XD-01 - Baseline And Complete Runtime Inventory

- Goal: capture current package, CLI, library, agent, prompt, config, cache,
  installer, wrapper, and release behavior before breaking changes.
- Owner: xdocs repository root.
- Dependencies: none.
- Actions:
  1. Confirm branch and preserve unrelated work.
  2. Run current typecheck, tests, build, bundle, binary, and safe matrix checks.
  3. Capture command/output snapshots for every current root and nested
     command, all help modes, agent actions, prompts, upgrades, and failures.
  4. Inventory every prohibited Node import in `source/`.
  5. Inventory public TypeScript exports that depend on Node-specific types or
     behavior.
  6. Inventory config consumers and current `xdocs.config.toml` documentation
     in the GUIHO workspace for downstream handoff.
  7. Record current auto-agent writes performed by bare/data commands and
     current cache paths.
  8. Record release and installer asset names.
- Acceptance:
  - Existing failures, compatibility removals, and migration regressions can be
    distinguished.
- Stop conditions:
  - Stop on unexplained overlapping changes or an undocumented public export
    whose removal has not been added to the plan handoff.

### Unit XD-02 - Add TypeBox And Define Structured Runtime Contracts

- Goal: make TypeBox authoritative for every structured boundary.
- Dependencies: XD-01.
- Expected files:
  - `package.json`, `bun.lock`
  - `source/config.ts`, `source/metadata.ts`, `source/types.ts`
  - new schema modules
  - prompt/agent/update catalog schemas
  - tests and descriptors.
- Schemas:
  - xdocs YAML configuration
  - descriptor and companion-document frontmatter
  - update cache
  - GitHub releases/assets/catalog
  - agent skill metadata
  - prompt catalog metadata
  - enum-like flags and positive numeric flags
  - doctor/meta/context JSON envelopes where stable.
- Actions:
  1. Add `@sinclair/typebox` as a runtime dependency.
  2. Derive static types from schemas.
  3. Replace regex/handwritten shape checking where input is structured.
  4. Decode remote/config/cache/frontmatter values before selection or use.
  5. Keep useful domain-specific diagnostics with source paths and no secret
     exposure.
- Acceptance:
  - Invalid structured data cannot reach tree, context, agent, prompt, or
    upgrade logic.

### Unit XD-03 - Convert Core And Shared Source To Bun-Only

- Goal: eliminate prohibited Node built-ins from core/shared xdocs source.
- Dependencies: XD-02.
- Expected files:
  - `source/agents.ts`
  - `source/cli.ts`
  - `source/config.ts`
  - `source/context.ts`
  - `source/discovery.ts`
  - `source/doctor.ts`
  - `source/help.ts`
  - `source/meta.ts`
  - `source/metadata.ts`
  - `source/prompts.ts`
  - `source/self-management.ts`
  - `source/upgrade-transaction.ts`
  - `source/commands/*.ts`
  - Bun-first path/storage utilities
  - public entrypoint and types.
- Actions:
  1. Replace filesystem reads/writes with `Bun.file`, `Bun.write`, and approved
     Bun-native directory/mutation operations.
  2. Replace `node:path` with URL-based resource paths and a narrow
     platform-aware path utility.
  3. Replace `node:os` home discovery with Bun environment resolution.
  4. Keep subprocesses on Bun APIs.
  5. Rework metadata streaming/scanning without Node file handles.
  6. Remove or redesign public Node-runtime compatibility promises and exports.
  7. Confine Node imports to the npm bootstrap.
  8. Add a static prohibited-import test.
- Acceptance:
  - Core/shared source passes the prohibited-import scan.
  - Descriptor scanning, metadata reads, doctor, context, generation, merge,
    agent resources, and upgrades retain domain behavior under Bun.

### Unit XD-04 - Replace TOML With `xdocs.yaml`

- Goal: implement the exact RFC YAML configuration contract.
- Dependencies: XD-02 and XD-03.
- Resolution order:
  1. `--config <path>`
  2. `<effective-cwd>/xdocs.yaml`
  3. `~/.guiho/xdocs/xdocs.yaml`
- Expected files:
  - `source/config.ts`
  - `source/commands/init.ts`
  - CLI adapters, types, tests
  - AGENTS template, bundled skill, README, DOCS, ARCHITECTURE, descriptors.
- Actions:
  1. Delete TOML discovery and `Bun.TOML.parse`.
  2. Parse with `Bun.YAML.parse`.
  3. TypeBox-decode the full extensions/AI/scan/project/agent configuration.
  4. Delete `agents.auto_agents_md`, `agents.auto_skill_install`, and
     `agents.skill_tool`; explicit agent commands replace those mutation
     settings. Keep `[ai].mode` because it governs documentation-writing
     workflow rather than agent-file mutation.
  5. Make `xdocs init` create `xdocs.yaml`.
  6. Print `configuration file loaded: <absolute-path>` when loaded.
  7. Update the xdocs skill's onboarding/config reference to YAML.
  8. Use exit code `3` for missing/invalid configuration where a command
     requires it.
- Acceptance:
  - No shipping source/test/doc/skill promises `xdocs.config.toml`.
  - Exact precedence and loaded-path output are tested.

### Unit XD-05 - Rebuild The Final Citty Command Tree

- Goal: make one raw Citty tree the only catalog and router.
- Dependencies: XD-02 through XD-04.
- Expected files:
  - `source/cli.ts`
  - `source/commands/*.ts`
  - removal/replacement of obsolete prompt/agents adapters
  - CLI tests and descriptors.
- Actions:
  1. Keep domain commands listed in the final catalog.
  2. Remove root `prompt` and plural `agents`.
  3. Add the complete singular `agent` hierarchy.
  4. Keep upgrade/check/list and uninstall.
  5. Remove scoped upgrade `-v`; keep root `-v` only.
  6. Stop pre-parsing ordinary args with Citty `parseArgs` before running the
     command tree; use command context and a narrow hidden-worker bootstrap
     only.
  7. Attach applicable long flags to their real scopes.
  8. TypeBox-decode enum and numeric values after Citty parsing.
- Acceptance:
  - One Citty tree owns routing and metadata.
  - Unknown/invalid input produces scoped usage and never triggers config,
    agent, or update mutation.

### Unit XD-06 - Implement Exact Startup, Storage, And Update Cache

- Goal: standardize xdocs startup and remove current OS-specific cache paths.
- Dependencies: XD-02, XD-04, and XD-05.
- Storage:
  - `~/.guiho/xdocs/xdocs.yaml`
  - `~/.guiho/xdocs/cache.json`
- Exact sequence:
  1. synchronously decode cache
  2. print exact cached update notice first if available
  3. load/decode/report config when needed
  4. spawn hidden detached worker
  5. route command
  6. no arguments prints `Hello Windows - xdocs v<version>`.
- Actions:
  - Replace `update.json`, LocalAppData, and XDG cache behavior.
  - Use RFC cache field names.
  - Validate remote response and cache with TypeBox.
  - Ensure hidden worker exits without normal routing or recursive spawning.
  - Remove `runAgentAutomation` from bare and data commands.
  - Keep foreground cache corruption silent unless verbose.
- Acceptance:
  - No foreground network wait; exact banner/notice/order and worker cache
    outcomes are tested.

### Unit XD-07 - Generate All Developer Context Help

- Goal: eliminate the separate handwritten `HelpRecord` catalog and ASCII tree.
- Dependencies: XD-05.
- Actions:
  1. Put usage, descriptions, positionals, flags, examples, and subcommands on
     actual Citty definitions.
  2. Generate standard help through Citty.
  3. Traverse the tree for `--help-tree` at every scope.
  4. Begin with `COMMAND TREE`, render Unicode branches, nest flags, and align
     descriptions.
  5. Add TypeBox-validated `--help-tree-depth`.
  6. Generate clean Markdown through `--help-docs`.
  7. Prevent update notices/progress/automation from polluting help-docs
     redirection.
- Acceptance:
  - Every root/group/leaf has all help forms; no ASCII `|-` or parallel static
    command list remains.

### Unit XD-08 - Implement The Complete Agent Skill Namespace

- Goal: replace current install-only/detection behavior with explicit RFC
  operations.
- Dependencies: XD-02, XD-03, and XD-05.
- Skill rules:
  - Default global; `--local` selects project scope.
  - `install`, `update`, and `uninstall` always target both
    `.agents/skills/guiho-s-xdocs` and
    `.claude/skills/guiho-s-xdocs`.
  - `list [--filter]` enumerates embedded skills.
  - `show <id>` prints path, description, and metadata.
  - Remove legacy `guiho-as-xdocs` through explicit update/uninstall behavior.
- Actions:
  1. Remove `--tool`, target detection, positional local/global, and
     global-auto-install paths.
  2. Keep the bundled `SKILL.md` as one canonical embedded resource.
  3. Validate its frontmatter through TypeBox.
  4. Make operations deterministic and test-isolated.
- Acceptance:
  - All operations affect both standard locations, are idempotent, and never
    run implicitly on documentation commands.

### Unit XD-09 - Implement Exact Instruction Actions

- Goal: manage xdocs guidance explicitly and idempotently.
- Dependencies: XD-08.
- Exact markers:
  - `<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->`
  - `<!-- END XDOCS -->`
- Actions:
  1. `apply`: append or replace current block.
  2. `remove`: remove complete bounded block and normalize surrounding spacing.
  3. `update`: compare canonical content and replace stale block.
  4. `show`: print raw canonical template only.
  5. Resolve AGENTS only, CLAUDE only, both, or create AGENTS when neither.
  6. Limit discovery to the selected project rather than walking into an
     unintended ancestor.
  7. Update the canonical template to instruct agents about `xdocs.yaml`.
- Acceptance:
  - Tests cover zero, one, and both files; repeated operations; stale/legacy
    markers; raw show; and no unrelated content loss.

### Unit XD-10 - Consolidate And Expose The Prompt Catalog

- Goal: preserve xdocs's four useful prompts through the RFC agent prompt
  namespace and one release artifact.
- Dependencies: XD-02, XD-03, and XD-05.
- Expected resources:
  - canonical `prompts/guiho-i-xdocs.md` catalog manifest
  - retained `prompts/write.md`, `prompts/update.md`, `prompts/agents.md`, and
    `prompts/generate.md` raw prompt bodies
  - TypeBox prompt metadata schema.
- Actions:
  1. Remove `xdocs prompt --name`.
  2. Make `xdocs agent prompt list` print IDs/descriptions.
  3. Make `list --names` print only IDs.
  4. Make `show <id>` print only the raw body.
  5. Replace regex-only metadata parsing with TypeBox-decoded prompt records.
  6. Embed the catalog manifest and all four raw bodies into native binaries.
  7. Build one reproducible archive file named exactly `guiho-i-xdocs`
     containing the manifest and four prompt bodies; do not upload the
     individual prompt files as separate release assets.
- Acceptance:
  - All four current prompt IDs remain available through the new namespace.
  - Unknown prompt IDs fail as usage errors without extra stdout.

### Unit XD-11 - Standardize Output And Exit Discipline

- Goal: align domain commands and platform commands with stable streams.
- Dependencies: XD-02 through XD-10.
- Exit map:
  - `0` success
  - `1` unexpected/operational failure
  - `2` usage/TypeBox validation failure
  - `3` config resolution/decoding failure
  - `4` release/network failure
  - `5` installation/upgrade/filesystem failure
  - `130` interruption.
- Actions:
  - Keep one JSON document per JSON invocation.
  - Keep progress/ANSI off JSON stdout.
  - Send diagnostics to stderr.
  - Complete the existing JSON-output TODO as part of this unit only when every
    command's stable schema and tests are delivered; do not mark it complete
    merely because the migration plan mentions it.
- Acceptance:
  - CLI tests parse JSON and assert streams/exit codes for every command family.

### Unit XD-12 - Complete Upgrade And Post-Upgrade Agent Reconciliation

- Goal: preserve verified transactional upgrade while adding the exact RFC
  list and follow-up behavior.
- Dependencies: XD-02, XD-06, XD-08 through XD-11.
- `xdocs upgrade` flags:
  - `--version`
  - `--arch`
  - `--variant`
  - `--dry-run`
  - `--format`.
- `upgrade list`:
  - `--page`
  - `--per-page`
  - `--pre-releases`
  - stable-only default, latest first.
- Actions:
  1. Default x64 to baseline.
  2. TypeBox-validate pages, releases, assets, and numeric flags.
  3. Keep observable transaction, rollback, verification, and recovery.
  4. Write RFC cache after canonical verification.
  5. Update global skills in both locations after success.
  6. Reconcile instruction files for the current project.
- Acceptance:
  - Existing Windows/transaction reliability tests remain and expand for
    pagination, pre-releases, JSON, new cache, and agent reconciliation.

### Unit XD-13 - Rebuild Installers For Binary And Agent Assets

- Goal: make `devops/install.sh` and `devops/install.ps1` complete installers.
- Dependencies: XD-08 through XD-12.
- Actions:
  1. Select exact Linux/Darwin/Windows asset and baseline/default/modern
     variant.
  2. Print the required sequence metadata before network work.
  3. Display real-time progress; remove silent curl/download flags.
  4. Validate and transactionally verify the binary.
  5. configure PATH when missing.
  6. download/install `guiho-s-xdocs` into both global skill paths.
  7. download `guiho-i-xdocs`, discover instruction files, and reconcile.
  8. print each action and final version verification.
- Acceptance:
  - Isolated PowerShell/POSIX tests cover progress, binary, PATH, both skills,
    instruction updates, corruption, network failure, rollback, and spaces.

### Unit XD-14 - Replace The Npm Launcher With A Node Bootstrap

- Goal: let npm users bootstrap the native xdocs binary without Bun.
- Dependencies: XD-12 and final asset names.
- Actions:
  - Replace the package `bin` target with a tiny isolated Node ESM launcher at
    `scripts/xdocs-bin.mjs`.
  - Detect platform/architecture/variant, cache by package version, download
    when absent, chmod Unix binaries, forward args/stdio/env, and preserve the
    native exit code.
  - Remove Bun/source fallback and postinstall dependence from the public
    launcher.
  - Keep xdocs domain and library logic out of the wrapper.
- Acceptance:
  - Packed npm smoke tests succeed with Node and no Bun in PATH.

### Unit XD-15 - Build And Publish Exactly Fourteen Assets

- Goal: enforce the RFC release set.
- Dependencies: XD-08, XD-10, XD-13, and XD-14.
- Native binaries:
  - `xdocs-linux-arm64`
  - `xdocs-linux-x64`
  - `xdocs-linux-x64-baseline`
  - `xdocs-linux-x64-modern`
  - `xdocs-darwin-arm64`
  - `xdocs-darwin-x64`
  - `xdocs-darwin-x64-baseline`
  - `xdocs-darwin-x64-modern`
  - `xdocs-windows-arm64.exe`
  - `xdocs-windows-x64.exe`
  - `xdocs-windows-x64-baseline.exe`
  - `xdocs-windows-x64-modern.exe`
- Agent assets:
  - `guiho-s-xdocs`
  - `guiho-i-xdocs`
- Actions:
  1. Remove all `macos` selectors/names.
  2. Make the builder Bun-only.
  3. package skill and prompt catalog reproducibly.
  4. upload exactly fourteen.
  5. fail CI for missing, duplicate, extra, legacy, or wrongly suffixed assets.
- Acceptance:
  - Automated expected-set comparison passes.

### Unit XD-16 - Align Docs, Skill, Architecture, TODO, And XDocs

- Goal: make every durable surface describe only the final contract.
- Dependencies: XD-01 through XD-15 stable.
- Expected files:
  - `README.md`, `DOCS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`
  - `AGENTS.md`
  - bundled xdocs skill and prompt catalog
  - TODO/spec/implementation notes
  - older decisions/plans that promise TOML, Node compatibility, root prompt,
    plural agents, or auto-agent mutation
  - all affected descriptors.
- Actions:
  1. Document `xdocs.yaml`, exact precedence, startup, cache, help, agent
     catalog, upgrade flags, installers, wrapper, exit map, and assets.
  2. Supersede conflicting decisions instead of leaving two approved contracts.
  3. Update the bundled skill's command selection, config reference, agent
     commands, and automatic-maintenance wording.
  4. Keep root and module descriptors, companion documents, owners, keywords,
     and tree links correct.
  5. Update existing TODO statuses only when implementation evidence proves
     their outcomes.
- Acceptance:
  - Search finds no shipping/public `xdocs.config.toml`, `xdocs prompt`,
    `xdocs agents`, scoped upgrade `-v`, old cache path, or `macos` asset name.

### Unit XD-17 - Downstream Configuration Migration Handoff

- Goal: identify repositories that must adopt `xdocs.yaml`.
- Dependencies: XD-04 and XD-16.
- Actions:
  - Produce a repository/path list with required migration notes.
  - Do not edit consumer repositories without separately authorized
    cross-repository execution.
  - Route future cross-repo coordination through the GUIHO root TODO/docs.
- Acceptance:
  - No consumer is silently treated as compatible.

### Unit XD-18 - Full Validation And Release Readiness

- Goal: prove every completion-gate requirement without publication.
- Dependencies: XD-16 and XD-17.
- Checks:
  1. `bun run typecheck`
  2. `bun test`
  3. `bun run build`
  4. `bun run binary`
  5. `bun run binaries`
  6. complete RFC CLI test matrix
  7. package/library export checks after breaking removals
  8. Node-only packed npm bootstrap tests
  9. isolated installer tests
  10. prohibited-import scan
  11. exact fourteen-asset assertion
  12. xdocs meta/scan/tree/doctor validation using the new CLI contract
  13. `git diff --check` and final scoped status.
- Evidence:
  - implementation review
  - durable validation report
  - explicit failed/skipped checks and residual risk.
- Approval gates:
  - Do not apply Mirror versioning, tag, publish, push, globally install, or
    overwrite a live xdocs executable without separate authorization.

## First Executable Unit

Begin with XD-01, then add TypeBox in XD-02 and complete the Bun-only foundation
in XD-03. The YAML, command, agent, and help migrations depend on those two
platform foundations and should not be interleaved before their contracts pass.

## Completion Definition

xdocs is complete only when TypeBox validates every structured boundary, no
prohibited Node imports remain in core/shared source, the final command catalog
is the sole public catalog, ordinary documentation commands do not mutate agent
files, all four prompts are available through the new agent prompt namespace,
and release verification finds exactly twelve binaries plus the two named agent
assets.

## References

- [xdocs TODO](../../TODO.md)
- [RFC 0034 task specification](../todo/rfc-0034-cli-compliance-migration.md)
- [Previous Citty plan](./citty-cli-migration.md)
- [Current upgrade plan](./upgrade-reliability-implementation.md)
- [Package architecture](../../ARCHITECTURE.md)
- [Canonical documentation](../../DOCS.md)
