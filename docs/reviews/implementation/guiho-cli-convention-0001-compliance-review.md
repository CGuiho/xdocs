---
name: XDocs GUIHO CLI Convention 0001 Compliance Review
purpose: Evaluate the shipping xdocs repository against every applicable requirement in GUIHO CLI Convention 0001.
description: Findings-first audit of project tooling, flags, configuration, agent artifacts, installation, upgrade, uninstall, release, documentation, and validation behavior.
created: 2026-08-16
owner: xdocs-implementation-reviews
flags:
  - compliance-review
  - noncompliant
tags:
  - cli
  - convention
  - compliance
  - lifecycle
keywords:
  - GUIHO CLI Convention
  - guiho-convention-0001-cli
  - stable launcher
  - versioned payload
  - agent evolution
  - runx.yaml
---

# XDocs GUIHO CLI Convention 0001 Compliance Review

## Verdict

**xdocs does not obey GUIHO CLI Convention 0001.**

The repository retains substantial engineering quality from its earlier native
Go migration, but the convention establishes a newer and materially different
CLI lifecycle contract. The current implementation is still built around one
replaceable executable, an exact eleven-asset release, one configuration shape,
and `update`-named agent operations. The convention instead requires a stable
launcher with immutable payloads, complete release manifests and agent
artifacts, separate inheriting global and project configurations with schemas,
agent-evolution policy, a four-script lifecycle, synchronous whole-release
upgrades, and `upgrade` terminology.

This is a mandatory-contract failure, not a partial pass. Several individual
areas conform, but a GUIHO CLI is not compliant when any required lifecycle,
tooling, configuration, command, or artifact boundary is absent.

## Audit snapshot

| Field | Audited value |
| --- | --- |
| Repository | `C:\GUIHO\xdocs` |
| Branch | `main` |
| Commit | `9977a45e5f3a2df05314849126fd0775f7a1eb8f` |
| Commit date | 2026-08-04 |
| Convention | `C:\GUIHO\guiho\docs\conventions\guiho-convention-0001-cli.md` |
| Convention date | 2026-08-16 |
| Audit date | 2026-08-16 |
| Shipping runtime | Repository-root Go/Cobra implementation in `main.go`, `cmd/`, and `internal/` |
| Historical reference | `source/` TypeScript tree; not treated as the shipping runtime |

The convention postdates the audited commit by twelve days. That explains much
of the architectural drift, but it does not make the current branch compliant.

## Findings summary

| ID | Severity | Result |
| --- | --- | --- |
| CLI-CONV-001 | Critical | The mandatory root `runx.yaml` command catalog is absent. |
| CLI-CONV-002 | High | XDocs validation silently excludes tracked hidden directories and the declared tree is incomplete. |
| CLI-CONV-003 | High | `-v`/`--version` prints `xdocs v<version>` instead of raw SemVer. |
| CLI-CONV-004 | High | The help-tree depth and inherited-global-flag contract is not implemented. |
| CLI-CONV-005 | Critical | The mandatory uninstall scripts and README uninstall section do not exist. |
| CLI-CONV-006 | Critical | Installation has no stable launcher, immutable payload layout, installed manifest, or canonical CLI-home artifact store. |
| CLI-CONV-007 | High | Installers cannot select channels and do not perform complete release discovery or eligibility checks. |
| CLI-CONV-008 | Critical | Releases intentionally contain the obsolete eleven-asset set and omit mandatory artifacts and ownership metadata. |
| CLI-CONV-009 | Critical | `xdocs upgrade` replaces the running binary model and can return a detached Windows `scheduled` result. |
| CLI-CONV-010 | High | The mandatory first-and-final reinstallation recovery block is absent. |
| CLI-CONV-011 | Critical | `xdocs uninstall` removes only the executable and lacks the required ownership, preservation, planning, and confirmation contract. |
| CLI-CONV-012 | Critical | Global and project configuration are not separate, inheriting configuration layers. |
| CLI-CONV-013 | Critical | Required project/global schemas, examples, and version-pinned schema references are absent. |
| CLI-CONV-014 | High | The `agent.evolution` authorization policy does not exist. |
| CLI-CONV-015 | High | `xdocs init` does not implement the mandatory reconciliation and interactive setup sequence. |
| CLI-CONV-016 | High | Agent resource commands use the expressly forbidden name `update`. |
| CLI-CONV-017 | High | The main skill lacks the mandatory CLI evolution section and teaches superseded lifecycle behavior. |
| CLI-CONV-018 | High | No convention-compliant main installation/setup prompt or prompt namespace exists. |
| CLI-CONV-019 | Medium | Public, canonical, agent, root-index, and XDocs metadata documentation assert obsolete or inaccurate behavior. |
| CLI-CONV-020 | High | CI and release workflows enforce the obsolete contract and omit mandatory convention gates. |

Open findings: **8 critical, 11 high, and 1 medium**.

## Detailed findings

### CLI-CONV-001 — Mandatory RunX catalog is absent

**Severity:** Critical

The convention requires `mirror.yaml`, `runx.yaml`, and `xdocs.yaml` at the
repository root. It also requires every repeatable development, validation,
build, documentation, installation, packaging, and release command to have a
stable RunX UID, scoped ID, exact command, and description.

Observed evidence:

- `mirror.yaml` and `xdocs.yaml` exist, but `runx.yaml` does not.
- `runx check --format json` failed with `no runx.yaml found`.
- `runx list --format json` failed for the same reason.
- Repeatable workflows exist across `AGENTS.md`, `README.md`,
  `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `package.json`,
  and `devops/`, but none has a RunX catalog identity.

This also means the convention's aggregate compliance gate cannot pass, even
before considering any other finding.

**Acceptance condition:** add a schema-current root catalog with one namespace,
stable UIDs, scoped IDs, exact commands, and accurate descriptions for every
supported repeatable workflow; make both required RunX validation commands
pass.

### CLI-CONV-002 — XDocs coverage omits tracked hidden directories

**Severity:** High

The repository has extensive XDocs metadata, and the ordinary XDocs checks
pass for the corpus that the implementation discovers. That discovered corpus
is not the complete project-owned tree required by the convention.

Observed evidence:

- `internal/xdocs/discovery.go:118-121` unconditionally excludes every
  directory whose name starts with `.`, independently of `xdocs.yaml` and
  `.gitignore`.
- `.github/github.xdocs.md` and
  `.github/workflows/workflows.xdocs.md` exist, but `xdocs scan`, strict
  `xdocs meta`, and `xdocs tree` do not report or validate them.
- `xdocs.xdocs.md:5-14` omits `xdocs-github` from the root `children`, while
  `.github/github.xdocs.md:4` declares `xdocs-package` as its parent. The
  relationship therefore disagrees and escapes validation.
- The tracked project-owned `.vscode/` directory contains seven repository
  configuration files and has no `*.xdocs.md` descriptor.
- The root descriptor's `files` map omits tracked owned root files including
  `.gitignore`, `.npmrc`, and `bun.lock`.
- `xdocs scan` reported 33 covered directories and zero uncovered directories,
  demonstrating that the hidden-directory gap is invisible to the current
  health result rather than absent from the repository.

**Acceptance condition:** include every project-owned tracked directory in the
XDocs corpus or explicitly and validly classify it outside ownership; add the
missing descriptor, reconcile root/child relationships, and ensure strict
metadata, tree, and doctor validation actually cover the hidden owned paths.

### CLI-CONV-003 — Version output is not raw SemVer

**Severity:** High

The required `-v` and `--version` aliases are available, but their output is
noncompliant.

Observed evidence:

- `cmd/root.go:142` sets `{{.Name}} v{{.Version}}` as the version template.
- A source-built runtime probe returned `xdocs vdev` for both `--version` and
  `-v`.
- Installer, upgrade, test, CI, README, and DOCS contracts explicitly expect
  `xdocs v<version>`; examples include `devops/install.sh:136-139`,
  `devops/install.ps1:81-84`, `.github/workflows/publish.yml:111`, and
  `README.md:36`.

The convention requires only the SemVer-compatible value, without the command
name, `v`, labels, notices, or formatting.

**Acceptance condition:** make both aliases emit exactly the raw version such
as `1.2.3`, then update every consumer and assertion to the same contract.

### CLI-CONV-004 — Help-tree controls do not match the mandatory contract

**Severity:** High

Persistent help and documentation flags are broadly available, but three
required help-tree semantics fail.

Observed evidence:

- `cmd/root.go:155` implements `--help-tree-depth` as an integer with internal
  default `0`, not as `max` or an integer greater than `1`.
- `cmd/root.go:79-80` accepts depth `1`, although the convention permits only
  integers greater than `1`.
- A runtime probe rejected `--help-tree-depth max` as an integer parse error and
  accepted depth `1`.
- `--help-tree-global-flags` is absent; a runtime probe returned `unknown flag`.
- `cmd/help.go:72-73` always adds both local and inherited flags for each
  rendered command, so there is no default mode that prints globals once and
  suppresses them below descendants.

The following parts do conform: `-h`/`--help`, `--help-docs`, and
`--help-tree` are persistent; command trees are recursive without a fixed
maximum when the internal depth is zero.

**Acceptance condition:** accept `max` or integers greater than `1`, expose the
specified default, add `--help-tree-global-flags` defaulting false, and render
global flags once unless repetition is explicitly requested.

### CLI-CONV-005 — Four-script lifecycle and README uninstall contract are incomplete

**Severity:** Critical

Only the two installer scripts exist:

- `devops/install.sh`
- `devops/install.ps1`

The mandatory `devops/uninstall.sh` and `devops/uninstall.ps1` do not exist.
Consequently there is no cross-platform script contract equivalent to the
Cobra uninstaller.

`README.md` also ends with `## Release` rather than the required final
`## Uninstall` section. It has no remote uninstall commands, destructive-default
warning, dry-run example, or combined configuration/data preservation example.
Its installation section does not end with the required standalone
`xdocs --version` verification command.

**Acceptance condition:** implement both uninstaller scripts with behavior
equivalent to `xdocs uninstall`, document all four exact remote commands, and
make `## Uninstall` the README's final operational section with the required
planning and preservation examples.

### CLI-CONV-006 — Installation architecture is the obsolete direct-binary model

**Severity:** Critical

The convention requires a stable command launcher under `$HOME/.guiho/bin/`,
immutable payloads under `$HOME/.guiho/xdocs/versions/<version>/`, an atomic
`current.json`, an installed ownership manifest, and canonical copies of every
CLI-owned artifact under `$HOME/.guiho/xdocs/`.

Observed evidence:

- `devops/install.sh:7` defaults to `$HOME/.local/bin` and
  `devops/install.sh:58-60` treats that command path as the replaceable payload.
- `devops/install.ps1:3` has the same `.local\bin` default and
  `devops/install.ps1:39-41` stages replacement beside the command executable.
- `devops/install.sh:57` uses the system `mktemp` location, while
  `devops/install.ps1:38` uses the platform temporary directory; neither stages
  under `$HOME/.guiho/.temp/xdocs-install-<unique-id>/`.
- Both installers atomically swap one executable and direct skill projections,
  but neither installs a launcher, immutable payload directory, `current.json`,
  `installed-artifacts.json`, or canonical versioned artifact store.
- Repository search found no launcher protocol, active-version pointer, or
  artifact-manifest implementation.

The current backup-and-restore logic is useful but covers only the older binary
and skill projection scope. It cannot provide manifest-authoritative ownership,
retired-artifact deletion, or whole-release rollback.

**Acceptance condition:** replace the direct-binary layout with the stable
launcher/versioned-payload protocol, validate every resolved path, install all
canonical artifacts under the xdocs home, activate through atomic
`current.json`, and retain the immediately previous verified payload.

### CLI-CONV-007 — Installer release selection is incomplete

**Severity:** High

Observed evidence:

- `devops/install.sh:9-15` accepts `--version` and `--install-dir`; it has no
  `--channel`.
- `devops/install.ps1:1-4` accepts `-Version` and `-InstallDir`; it has no
  `-Channel`.
- `cmd/upgrade.go:14-55` likewise exposes `--version` and `--dry-run`, but no
  `--channel` selector for in-process upgrades.
- `devops/install.sh:39-47` and `devops/install.ps1:21-28` use GitHub's
  latest-release endpoint for the default path instead of applying the full
  compatible-release selection contract.
- There is no mutual-exclusion validation for exact version versus channel,
  because channels are unsupported.
- The installers do not paginate the release catalog for prerelease channel
  selection and do not reject a release based on a complete mandatory artifact
  set or `artifacts.json` because that set and manifest do not exist.

The in-process `internal/update` release client does exhaust GitHub pages and
derives channel names, but that does not implement the required installer
interfaces and selection transaction.

**Acceptance condition:** support exact version and channel as mutually
exclusive selectors, default to the highest stable compatible complete release,
exhaust the release catalog, and fail before mutation when any target or
mandatory artifact is incompatible or absent.

### CLI-CONV-008 — Release set is incomplete and has no ownership manifest

**Severity:** Critical

The repository intentionally validates an exact eleven-asset release:

- eight native executables;
- `guiho-s-xdocs.zip`;
- `guiho-i-xdocs.md`; and
- `checksums.txt`.

`internal/release/matrix.go:27-35` constructs that set and
`internal/release/matrix.go:65-67` rejects any count other than eleven.
`devops/build-binaries.go:73-100` builds the same fixed contract. The file named
`guiho-i-xdocs.md` is copied from the prompt catalog and does not contain the
Go `InstructionTemplate` used to manage `AGENTS.md`.

The release omits, as independently installable and manifest-declared content:

- a stable launcher;
- the complete prompt bodies and convention-compliant main prompt;
- the actual complete managed instruction source;
- project and global configuration schemas;
- complete configuration examples;
- `artifacts.json`; and
- ownership/projection metadata for every contained artifact.

Although `checksums.txt` covers the limited assets, the convention requires it
to cover every published installation artifact except itself and requires
`artifacts.json` to define installed ownership and canonical projections.

**Acceptance condition:** publish the complete release unit and validate both
its manifest semantics and checksums before any install, upgrade, repair, or
uninstall path can consume it.

### CLI-CONV-009 — Upgrade is not a synchronous whole-release transaction

**Severity:** Critical

Observed evidence:

- `internal/upgrade/upgrade.go:139-145` plans candidate, backup, and lock files
  beside the currently executing executable.
- `internal/upgrade/upgrade.go:172-202` downloads and verifies only the native
  target binary, then delegates executable replacement.
- `internal/upgrade/replace_unix.go:14-37` renames the running command payload
  in place and refreshes only instruction and skill projections.
- `internal/upgrade/replace_windows.go:17-54` copies the executable into a
  helper and starts a detached replacement process.
- `internal/upgrade/upgrade.go:197-201` and `cmd/upgrade.go:44-46` explicitly
  report a `scheduled` outcome on Windows.
- `internal/upgrade/replace_windows.go:167-170` starts another detached cleanup
  command.
- The upgrade lock writes a process ID, but stale recovery uses file age alone
  and does not verify that the recorded process has stopped.
- There is no stable launcher, immutable version directory, `current.json`,
  full artifact download, installed-manifest reconciliation, hidden
  installation self-test, instance registry, verified old-process termination,
  or whole-release rollback journal.

The existing implementation does have bounded HTTP, SHA-256 verification for
the binary, an ownership-token lock, unique candidate paths, and binary rollback.
Those are useful controls, but they do not satisfy the convention's required
transaction scope or its express prohibition on scheduled/detached upgrade
authority.

**Acceptance condition:** upgrade the complete selected release synchronously
into a new immutable payload directory, reconcile all manifest-owned artifacts,
atomically activate `current.json`, verify through the stable launcher, and
complete or roll back before the original invocation returns.

### CLI-CONV-010 — Mandatory upgrade recovery block is absent

**Severity:** High

The convention requires a precise two-line reinstall block as the first
user-visible upgrade output and again as the final block for every outcome.

Observed evidence:

- `cmd/upgrade.go:21-27` calls release resolution and the upgrade service before
  printing recovery guidance.
- Failure output at `cmd/upgrade.go:29-36` prints a labeled one-line
  `recovery:` value, not the required block.
- Success output at `cmd/upgrade.go:43-47` prints recovery after other result
  fields, but it is not the specified final two-line message.
- `internal/upgrade/replace_windows.go:161-164` clears recovery on successful
  completion.
- `xdocs upgrade` exposes `--version` only, so it cannot preserve a requested
  channel selector in the initial message.

**Acceptance condition:** after local argument validation, print the exact
platform-specific reinstall block before any remote or mutating work and print
it again as the final block for success, up-to-date, dry-run, rollback, and
failure, pinned to the resolved version when known.

### CLI-CONV-011 — Uninstall removes only the executable

**Severity:** Critical

`cmd/upgrade.go:138-166` defines the entire public uninstall command. It resolves
the current executable and removes or schedules removal of that executable. It
supports only `--dry-run`.

Because the command validates no canonical installed path or manifest
ownership, invoking a development or otherwise noncanonical xdocs executable
can target that executable for deletion.

It does not:

- use an installed ownership manifest;
- remove all versioned payloads or the xdocs CLI home;
- remove global/project configuration by default;
- remove persistent data, databases, caches, or state;
- remove managed skill/prompt/definition projections;
- remove only the bounded instruction block;
- support `--preserve-config`, `--preserve-data`, or `--yes`;
- print resolved `REMOVE` and `PRESERVE` groups;
- require interactive confirmation when `--yes` is absent; or
- preserve and validate shared `.guiho`, `.guiho/bin`, `.guiho/.temp`, other
  CLIs, and the shared PATH through an explicit ownership plan.

**Acceptance condition:** make the Cobra command and both uninstall scripts use
one manifest-authoritative contract with destructive defaults, preservation
flags, dry-run, confirmation, exact ownership boundaries, and platform-equivalent
results.

### CLI-CONV-012 — Configuration layers are conflated

**Severity:** Critical

The convention requires distinct `xdocs.yaml` and `xdocs.global.yaml` files,
with the global file providing a baseline and the project file overriding only
the values it supplies.

Observed evidence:

- `internal/config/config.go:16` defines only `Filename = "xdocs.yaml"`.
- `internal/config/config.go:151-166` returns the project file if it exists;
  otherwise it falls back to `$HOME/.guiho/xdocs/xdocs.yaml`.
- Because resolution selects one file, it never loads both and never performs
  field-level global-to-project inheritance.
- `README.md:58-62` and `DOCS.md:73-77` explicitly describe this one-file
  precedence model.

Strict YAML decoding and explicit semantic validation at
`internal/config/config.go:184-272` are good foundations, but they validate the
wrong single-layer contract.

**Acceptance condition:** implement separate filenames, separate typed shapes,
strict decoding for both, deterministic inheritance, project overrides, and
effective-value reporting without treating the global file as a relocated
project config.

### CLI-CONV-013 — Configuration schemas and examples are missing

**Severity:** Critical

No `xdocs.schema.json` or `xdocs.global.schema.json` exists. There is no complete
global configuration example, and generated project configuration has no
version-pinned schema reference.

Observed evidence:

- Repository search found no xdocs JSON Schema file.
- `internal/config/config.go:318-350` generates plain YAML without the required
  `yaml-language-server` HTTPS comment.
- There is no separate global default generator or example.
- The release matrix and installers do not package, verify, install, or expose
  schemas and examples.

The mutable Mirror schema URL in `mirror.yaml` describes Mirror's own
configuration and does not satisfy xdocs's schema obligations.

**Acceptance condition:** provide separate complete schemas and examples,
embed an equivalent offline validation contract, generate version-pinned release
URLs in both YAML files, and publish/install the exact schema and example
artifacts with each release.

### CLI-CONV-014 — Agent-evolution authorization policy is absent

**Severity:** High

`internal/config/config.go:30-64` contains extensions, AI mode, ignore, scan,
and project fields only. It has no `agent.evolution` structure and no validation
for `disabled`, `always-ask`, or `always-proceed`.

Neither `xdocs.yaml` nor any global configuration supplies effective values for:

- `agent.evolution.upgrade`;
- `agent.evolution.issues.bugs`;
- `agent.evolution.issues.improvements`; or
- `agent.evolution.issues.reviews`.

Consequently init cannot default these values, the skill cannot read them, and
agents cannot distinguish prohibited, approval-gated, and persistently
authorized upgrade or issue actions.

**Acceptance condition:** add the exact string-valued policy to the global
schema with project overrides, default every unresolved field to `always-ask`,
reject unknown values, and make all agent guidance and governed actions use the
effective policy.

### CLI-CONV-015 — `xdocs init` is not the required reconciliation flow

**Severity:** High

`cmd/domain.go:18-77` implements init as a short noninteractive sequence:

1. create `xdocs.yaml` if missing;
2. create `XDOCS.md` if missing; and
3. install the skill globally or, with `--local`, only locally.

It does not ensure or reconcile:

- both global skill destinations independently of an optional local copy;
- the bounded instruction block in `AGENTS.md`;
- `$HOME/.guiho/xdocs/xdocs.global.yaml`;
- separate project/global schema validation;
- unanswered setup questions;
- the four agent-evolution policy values;
- explanation and recommendation of `always-proceed`;
- interactive versus noninteractive missing-answer behavior;
- preservation of and confirmation before replacing existing user values; or
- a final validation and absolute-path summary across all required resources.

It can report `xdocs initialized` without those mandatory checks.

**Acceptance condition:** implement the complete idempotent, interactive when
needed, fail-closed reconciliation sequence and report success only after every
common and xdocs-specific check passes.

### CLI-CONV-016 — Agent command tree uses forbidden `update`

**Severity:** High

The convention expressly prohibits `update` in the agent skill and instruction
command trees.

Observed evidence:

- `cmd/agent.go:30` creates `agent skill update` instead of `upgrade`.
- `cmd/agent.go:101` creates `agent instruction update` instead of `upgrade`.
- `internal/upgrade/upgrade.go:211-215`, both installers, README, DOCS, AGENTS,
  and the bundled skill invoke or document those forbidden command names.
- Runtime help confirmed `update` and did not expose `upgrade` under
  `xdocs agent skill`.
- `cmd/agent.go:74-90` implements `agent skill show` as metadata-only output,
  while the convention requires it to display the selected bundled skill.

The remaining required agent command families and leaf operations are present.

**Acceptance condition:** replace the two public action names with `upgrade`,
remove `update` from the public trees and lifecycle consumers, make skill
`show` display the selected bundled skill, and update tests, help, skills,
instructions, docs, installers, and release validation together.

### CLI-CONV-017 — Main skill lacks mandatory evolution and lifecycle guidance

**Severity:** High

`skills/guiho-s-xdocs/SKILL.md` is the confirmed main skill and contains useful
domain-specific XDocs workflows. It does not contain the exact mandatory
heading `## CLI Evolution and Feedback`.

It also omits the required complete guidance for:

- the canonical repository and issue-creation URLs;
- reading the effective `agent.evolution` policy;
- all three policy values;
- categorizing bugs, improvements, and review findings;
- checking for upgrades subject to policy;
- providing a created issue URL; and
- installing the CLI from README, verifying it, running init, and completing
  the convention's managed lifecycle.

Instead, `skills/guiho-s-xdocs/SKILL.md:137-201` documents the forbidden
`update` command names, positive-integer help depth, and Windows `scheduled`
upgrade model.

**Acceptance condition:** add the exact required section and policy-aware
lifecycle guidance, replace superseded behaviors, and validate that the skill's
versioned installed copy is part of the complete release manifest.

### CLI-CONV-018 — Main prompt and prompt namespace are noncompliant

**Severity:** High

The convention requires a user-confirmed main prompt, normally
`guiho-p-xdocs`, that explains what xdocs does and how to install, verify, and
upgrade it. Additional prompt IDs must begin with that complete ID plus a
suffix.

Observed evidence:

- `internal/agent/agent.go:22` hardcodes `write`, `update`, `agents`, and
  `generate` as prompt IDs.
- None of those four bodies is the required installation/setup prompt.
- `prompts/guiho-i-xdocs.md` is a catalog manifest for those four prompts, not
  a main setup prompt.
- The names are unprefixed and therefore do not satisfy the additional-prompt
  namespace rule.
- `prompts/agents.md:23-26` tells agents to edit a simplified
  `<!-- BEGIN XDOCS -->` block manually, while the runtime owns a different
  guarded marker and the convention assigns instruction changes to
  `xdocs agent instruction`.
- The fixed release does not publish and manifest the complete prompt bodies as
  canonical installed artifacts.

**Acceptance condition:** record the confirmed main prompt ID, provide the
complete install/verify/init/upgrade prompt, rename any additional prompts under
its namespace, expose them through `agent prompt`, and package/manifest them in
the release.

### CLI-CONV-019 — Repository documentation is internally stale

**Severity:** Medium

Documentation consistently describes the old contract, so this is more than an
unimplemented future design hidden from users.

Examples:

- `AGENTS.md:77` requires `update` action names and `AGENTS.md:124` requires
  exactly eleven assets.
- `README.md:11`, `README.md:168-174`, and `README.md:198-216` present the old
  release, command, detached upgrade, and uninstall behavior.
- `DOCS.md:197-198` and `DOCS.md:313` repeat the old agent and asset contracts.
- `.github/workflows/workflows.xdocs.md:8-26` declares exactly eleven assets as
  the accepted workflow behavior.
- `XDOCS.md:13` links a nonexistent `DESCRIPTION.md`.
- `XDOCS.md:15-20` presents npm metadata and the TypeScript tree as current
  package/runtime sources even though the root descriptor and repository rules
  say they are historical migration references.
- The same root index omits active `cmd/` and `internal/` directories.

Historical dated review documents may accurately describe earlier accepted
states and should not be rewritten as if they were current. The problem is the
current public, canonical, instruction, root-index, and live metadata surfaces.

**Acceptance condition:** after implementation, update README, DOCS, AGENTS,
the main skill, root index, current descriptors, workflow descriptors, and
examples in the same work unit; keep historical records clearly historical.

### CLI-CONV-020 — Automation enforces the superseded contract

**Severity:** High

The workflows provide solid cross-platform Go checks for the current design,
but they make noncompliance durable:

- `.github/workflows/ci.yml:34-43` builds and verifies exactly eleven assets.
- `.github/workflows/ci.yml:43-65` syntax-checks installer scripts only; there
  are no uninstaller scripts to test.
- `.github/workflows/ci.yml:32-33` and `.github/workflows/ci.yml:59-62` smoke the
  noncompliant version and depth-one help behavior.
- `.github/workflows/publish.yml:44-51` builds the same fixed release set and
  `.github/workflows/publish.yml:84-96` rejects a release that does not have
  exactly eleven assets.
- `.github/workflows/publish.yml:111` and
  `.github/workflows/publish.yml:134` require `xdocs v<version>` output.
- The workflows do not gate on `mirror config check`, RunX catalog validation,
  strict XDocs validation, the XDocs tree, doctor, schemas/examples,
  `artifacts.json`, stable-launcher behavior, channel selection, whole-release
  upgrade rollback, or the shared uninstall contract.

**Acceptance condition:** make CI and publication validate the new complete
artifact/lifecycle contract and all three mandatory project tools, including
cross-platform install, reinstall, upgrade, rollback, and uninstall acceptance
without touching real user state.

## Requirement matrix

| Convention area | Status | Evidence or finding |
| --- | --- | --- |
| Go, Cobra, standard library, native Go tools | Pass | `go.mod`, `main.go`, repository-root Go runtime |
| Root `mirror.yaml` | Pass | File exists; `mirror config check` returned `ok` |
| Mirror as Git SemVer authority | Pass | `mirror.yaml` uses Git-only SemVer and `xdocs/v{version}` tags |
| Root `runx.yaml` and command catalog | Fail | CLI-CONV-001 |
| Root XDocs index/descriptors/tree | Fail | CLI-CONV-002 and CLI-CONV-019 |
| Long flags and standard short aliases | Pass | No nonstandard public short aliases found; Cobra accepts space/equals forms |
| Raw root version | Fail | CLI-CONV-003 |
| Per-command help/docs/tree controls | Fail | CLI-CONV-004 |
| Four lifecycle scripts | Fail | CLI-CONV-005 |
| No Cobra `install` command | Pass | No public `install` command exists at root |
| Exact version/channel selection | Fail | CLI-CONV-007 |
| Complete release unit and ownership manifest | Fail | CLI-CONV-008 |
| Installer transaction and idempotent repair | Fail | CLI-CONV-006 through CLI-CONV-008 |
| Stable launcher and immutable payloads | Fail | CLI-CONV-006 and CLI-CONV-009 |
| Shared `.guiho` ownership boundary | Fail | Current install path is `.local/bin`; no manifest-authoritative boundary |
| CLI home canonical artifact store | Fail | CLI-CONV-006 |
| Project/global configuration and inheritance | Fail | CLI-CONV-012 |
| Agent evolution policy | Fail | CLI-CONV-014 |
| Separate schemas and examples | Fail | CLI-CONV-013 |
| One managed instruction and at least one skill | Partial | Both exist, but lifecycle packaging and command naming fail |
| Mandatory skill evolution section | Fail | CLI-CONV-017 |
| Main setup prompt and namespace | Fail | CLI-CONV-018 |
| Required command tree | Partial | Main families exist; two required `upgrade` leaves are named `update` |
| Mandatory init sequence | Fail | CLI-CONV-015 |
| Whole-release synchronous upgrade | Fail | CLI-CONV-009 and CLI-CONV-010 |
| Shared uninstall contract | Fail | CLI-CONV-005 and CLI-CONV-011 |

## Confirmed conforming elements

The following points passed and should be preserved during remediation:

- The shipping CLI is a repository-root Go/Cobra application, not the
  historical TypeScript runtime.
- The module uses Cobra and strict `go.yaml.in/yaml/v3` decoding.
- `internal/config/config.go:191-203` rejects unknown YAML fields and multiple
  YAML documents.
- Public multiword flag names use lowercase kebab case, and no nonstandard
  short aliases were found.
- Cobra supplies both `-h`/`--help` and `-v`/`--version`; only the version
  output format fails.
- The required root `init`, `agent`, `upgrade`, and `uninstall` families exist,
  and no forbidden root `install` command exists.
- The eight native target matrix is present and build tooling sets
  `CGO_ENABLED=0` with portable baseline architecture settings.
- Current installers verify SHA-256 for every artifact they currently download
  and have rollback logic for their limited binary/skill scope.
- The release client exhausts GitHub pagination, strictly parses xdocs tags,
  ignores drafts, derives prerelease channels, and sorts valid releases.
- The existing upgrade implementation has an ownership-token lock, unique
  candidate paths, checksum verification, and binary rollback; these controls
  can inform the new transaction.
- XDocs strict metadata, tree, and doctor checks pass for the 33 directories the
  current discovery implementation includes.
- Mirror configuration validation passes.
- Go formatting, tests, vetting, and module-tidiness validation pass at the
  audited commit.

## Validation evidence

| Command or probe | Result |
| --- | --- |
| `mirror config check` | Pass: `ok`; loaded root `mirror.yaml` |
| `runx check --format json` | Fail: no `runx.yaml` found |
| `runx list --format json` | Fail: no `runx.yaml` found |
| `gofmt -l main.go cmd internal devops` | Pass: no files listed |
| `go test ./...` | Pass across all Go packages |
| `go vet ./...` | Pass |
| `go mod tidy -diff` | Pass: no diff |
| `go run . --version` | Functional but noncompliant: `xdocs vdev` |
| `go run . -v` | Functional but noncompliant: `xdocs vdev` |
| `go run . --help-tree --help-tree-depth max` | Fail: integer parse error |
| `go run . --help-tree --help-tree-depth 1` | Pass, but depth `1` is forbidden by the convention |
| `go run . --help-tree --help-tree-global-flags` | Fail: unknown flag |
| `go run . scan` | Pass for 33 discovered directories; hidden owned directories omitted |
| `go run . meta . --documents --strict` | Pass for the discovered corpus |
| `go run . tree` | Pass for the discovered corpus; `.github` subtree absent |
| `go run . doctor . --warnings-as-errors` | Pass: 0 errors, 0 warnings in the discovered corpus |
| Git Bash syntax check for `devops/install.sh` | Pass |
| PowerShell parser check for `devops/install.ps1` | Pass |

The first Go validation attempt was blocked by Windows access to the shared Go
build cache. The same commands were rerun with isolated repository-local
task-specific Go caches and passed; the cache error was environmental, not a
source failure.

No installer, upgrade, uninstall, version mutation, tag, push, publication, or
production operation was executed. Lifecycle conclusions come from source,
tests, workflow definitions, documentation, and nonmutating CLI probes.

## Remediation order

The safest implementation order is:

1. establish `runx.yaml` and the new typed global/project configuration,
   schemas, examples, and agent-evolution policy;
2. define and test `artifacts.json`, canonical CLI-home ownership, the launcher
   protocol, immutable payload layout, and raw-version/self-test contract;
3. rebuild the release matrix around the complete manifest-declared artifact
   set;
4. replace installers, synchronous upgrade, and all three uninstall interfaces
   with shared ownership and rollback services;
5. migrate init, agent command names, the main skill, and prompts;
6. repair help-tree semantics and all version consumers;
7. update current documentation and XDocs coverage; and
8. make CI and release automation enforce the convention end to end.

Until those conditions are met and every mandatory Mirror, RunX, XDocs, Go,
installer, upgrade, rollback, and uninstall check passes, this repository must
be treated as **noncompliant with GUIHO CLI Convention 0001**.
