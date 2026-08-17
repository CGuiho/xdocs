---
name: XDocs GUIHO CLI Convention 0001 Compliance Architecture
purpose: Define the target runtime, installation, release, configuration, agent-resource, recovery, and validation architecture for convention-compliant xdocs.
description: Breaking native-Go architecture for immutable payloads, a stable launcher, manifest-owned artifacts, dual configuration, synchronous lifecycle transactions, agent evolution, and cross-platform distribution.
created: 2026-08-16
owner: xdocs-architecture-docs
flags:
  - proposed
  - breaking-change
tags:
  - architecture
  - cli
  - installation
  - release
keywords:
  - GUIHO CLI Convention 0001
  - artifacts.json
  - stable launcher
  - immutable payload
  - xdocs.global.yaml
  - synchronous upgrade
---

# XDocs GUIHO CLI Convention 0001 Compliance Architecture

## Status and authority

This document proposes the replacement for the superseded direct-binary,
single-configuration, eleven-asset xdocs lifecycle. It does not authorize
implementation until an independent architecture review accepts it and the
dependent execution plan is independently approved.

The canonical `guiho-a-0043-software-architect` route was invoked twice but
failed to emit an artifact. The SWE Maestro therefore materialized this scoped
fallback from the convention, compliance audit, rejected plan review, and live
repository truth. This provenance is part of the lifecycle record: the
fallback must not be described as produced or approved by `0043`, and it
remains proposed until an independent `0045` review accepts its exact bytes.

The following product decisions are already sealed by the convention and the
human-supplied repository contract:

- the migration is intentionally breaking;
- the CLI name and CLI-owned home-directory name are `xdocs`;
- the CLI home is `$HOME/.guiho/xdocs/` and the shared launcher directory is
  `$HOME/.guiho/bin/`;
- the main agent skill is `guiho-s-xdocs`;
- the main setup prompt is `guiho-p-xdocs`;
- the runtime remains native Go 1.26.5, Cobra, `go.yaml.in/yaml/v3`, typed
  structured boundaries, standard-library lifecycle services, `go:embed`, and
  `CGO_ENABLED=0`;
- Mirror remains the only version authority; and
- source and GitHub Release publication are allowed by the requested release,
  but deployment, promotion, traffic, DNS, production data, and secret effects
  are not authorized.

The historical TypeScript tree is migration reference only. It is not a
runtime, build, installer, validation, manifest, or release input.

## Architectural invariants

1. One Cobra tree owns the user-facing command catalog.
2. `-v` and `--version` print exactly one raw SemVer line. All scopes retain
   help, help-tree, global-flag, and Markdown-help behavior required by the
   convention.
3. The stable launcher is the only executable installed on the shared PATH.
   Application payloads are immutable and versioned.
4. `artifacts.json` and its installed copy are the only authorities for
   replaceable artifact ownership. No lifecycle operation infers ownership from
   a filename prefix or recursively erases the CLI home as a repair strategy.
5. Project and global configuration have different filenames, schemas, and
   locations. Both are strictly decoded and semantically validated.
6. Install, repair, upgrade, activation, and rollback are synchronous
   transactions. POSIX and script-owned uninstall are synchronous. Direct
   Windows Cobra uninstall has the narrowly bounded post-exit finalization
   exception defined below because the running launcher and payload images
   cannot reliably delete themselves. Background update notices may remain
   advisory, and no background worker is authoritative for upgrade mutation or
   success.
7. All candidate artifacts are checksum verified and self-tested before
   activation. The previous verified release remains usable until the new
   release passes post-activation verification.
8. User configuration, declared persistent data, databases, and unrelated
   `.guiho` content are never removed by replacement or rollback.
9. Every user-home and lifecycle test uses a test-owned home, project, PATH,
   cache, agent destination, and staging root. Tests must prove that the real
   user home was unchanged.

## Runtime decomposition

The existing domain packages remain authoritative for documentation behavior.
Lifecycle responsibilities become explicit packages with no Cobra or script
logic hidden inside them:

| Package or program | Responsibility |
| --- | --- |
| `main.go` | Thin payload entrypoint, embedded resources, linker metadata, dependency construction, exit mapping. |
| `cmd/` | One Cobra tree, global flags, exact version/help semantics, user interaction, and adapters into domain services. |
| `internal/config/` | Strict project/global schemas, defaults, precedence, merge, initialization, and effective agent-evolution policy. |
| `internal/artifact/` | Strict release and installed manifests, stable IDs, checksums, safe relative paths, ownership classes, and projection declarations. |
| `internal/installation/` | Native path resolution, installed state, transactions, journal recovery, activation, rollback, instance registry, projection reconciliation, and uninstall planning. |
| `internal/release/` | Complete release catalog validation, platform selection, channel selection, typed asset matrix, and deterministic manifest construction. |
| `internal/update/` | Advisory cached release notices only; no detached mutation. |
| `internal/upgrade/` | Synchronous upgrade orchestration over artifact, release, and installation services. |
| `internal/agent/` | Embedded instruction, skill, and prompt catalog plus policy-aware managed projections. |
| `launcher/main.go` | Minimal stable launcher program that validates the activation pointer and waits for the selected payload. |
| `devops/` | Deterministic eight-target payload and launcher builds, packaging, script surfaces, and release verification. |

`internal/installation` is the selected package name. The plan must not retain
the unresolved `internal/install` or `internal/lifecycle` alternatives.

Scripts are thin cross-platform adapters. They may resolve releases, download
and verify assets, and call a verified payload's hidden lifecycle surface; they
must not implement a second ownership or transaction model inconsistent with
the Go packages.

## Canonical installed layout

```text
$HOME/.guiho/bin/xdocs[.exe]
$HOME/.guiho/xdocs/current.json
$HOME/.guiho/xdocs/installed-artifacts.json
$HOME/.guiho/xdocs/xdocs.global.yaml
$HOME/.guiho/xdocs/versions/<version>/xdocs[.exe]
$HOME/.guiho/xdocs/versions/<version>/artifacts/artifacts.json
$HOME/.guiho/xdocs/versions/<version>/artifacts/<canonical artifacts>
$HOME/.guiho/xdocs/state/transactions/<transaction-id>.json
$HOME/.guiho/xdocs/state/instances/<instance-id>.json
$HOME/.guiho/xdocs/state/garbage.json
$HOME/.guiho/xdocs/cache/
$HOME/.guiho/.temp/xdocs-<operation>-<unique-id>/
```

Only the launcher lives outside the CLI home. Managed copies in `.agents` and
`.claude`, and the bounded `AGENTS.md` block, are projections whose canonical
sources remain inside the active version directory.

All paths originate from `os.UserHomeDir()` or an explicitly injected test
home and are joined with `filepath.Join`. A path eligible for mutation must be
clean, absolute after resolution, and proven to be either the exact launcher
path, an exact manifest-declared projection, or a strict descendant of the
CLI-owned home or operation staging directory.

## Manifest and stable identity

`artifacts.json` uses schema version `1` and strict JSON decoding. Its top-level
fields are `schemaVersion`, `cli`, `releaseVersion`, `channel`, `repository`,
`targets`, `controlFiles`, `artifacts`, and `ownedPaths`. `releaseVersion` is
raw SemVer without a `v`.

`controlFiles` structurally declares `artifacts.json` and `checksums.txt` apart
from ordinary artifact records. Neither control file contains a self-digest.
`checksums.txt` authenticates `artifacts.json`; after that verification, the
strict manifest and checksum parser jointly require exactly one checksum for
every published installation asset except `checksums.txt` itself. A missing,
duplicate, extra, malformed, or mismatched entry invalidates the release.

Every ordinary artifact record contains:

- a stable `id`;
- `kind` and optional `platform`/`architecture` selectors;
- release asset name and, for archives, contained path;
- SHA-256 digest matching the checksum file;
- canonical path base and base-relative path;
- ownership class `replaceable`;
- managed projection destinations, if any; and
- compatibility metadata needed by launcher or payload selection.

Artifact path bases are exactly `version` or `shared-launcher`. `version`
resolves below `$HOME/.guiho/xdocs/versions/<version>/`; `shared-launcher`
resolves to the one platform-native launcher path under `$HOME/.guiho/bin/`.
An ordinary release artifact cannot claim runtime state, persistent data,
cache, project configuration, or an arbitrary absolute destination.

`ownedPaths` separately declares non-release path identities and their allowed
base: `cli-home` for global configuration, state, cache, and persistent data;
`project` for project configuration and the bounded instruction block; and
`agent-global` for managed skill projections. Each record has stable ID,
base-relative path or bounded-block marker, and one class from `configuration`,
`persistent`, `cache`, `transaction`, or `projection`. The schema fixes the
valid class/base combinations. These records have no release asset or checksum.

Stable IDs use these non-versioned forms:

```text
payload:<target-id>
launcher:<target-id>
agent-instruction:guiho-i-xdocs
agent-skill:guiho-s-xdocs
agent-prompts:guiho-p-xdocs
schema:project
schema:global
example:project
example:global
```

Additional agent resources extend their complete main ID with a specific
suffix. An ID is never reused for a different semantic artifact. Version and
checksum changes do not change a stable ID.

Projection rules exist only on the canonical ordinary artifact record. There
is no duplicated top-level projection collection. A rule contains destination
base, relative path or managed-block marker, supported agent tool, and
replacement semantics.

`installed-artifacts.json` stores the verified release-manifest digest and an
immutable copy of that selected manifest, then records realized state by stable
ID: resolved canonical path, realized projection path/status, and the
transaction that installed it. It does not redefine ownership class,
projection rules, or mutable destinations. Runtime state and persistence are
realized only from the selected manifest's `ownedPaths`. The installed file is
atomically replaced after candidate verification and retained as rollback
input until the transaction completes.

## Launcher protocol and activation

Release assets use the deterministic names:

```text
xdocs-<target-id>[.exe]
xdocs-launcher-<target-id>[.exe]
```

Supported payload and launcher targets remain the repository's eight-target
matrix. Each has a canonical target ID, exact build controls, and distinct
asset identity:

| Target ID | GOOS | GOARCH | Tuning |
| --- | --- | --- | --- |
| `linux-amd64` | `linux` | `amd64` | `GOAMD64=v1` |
| `linux-arm64` | `linux` | `arm64` | `GOARM64=v8.0` |
| `linux-armv7` | `linux` | `arm` | `GOARM=7` |
| `linux-armv6` | `linux` | `arm` | `GOARM=6` |
| `darwin-amd64` | `darwin` | `amd64` | `GOAMD64=v1` |
| `darwin-arm64` | `darwin` | `arm64` | `GOARM64=v8.0` |
| `windows-amd64` | `windows` | `amd64` | `GOAMD64=v1` |
| `windows-arm64` | `windows` | `arm64` | `GOARM64=v8.0` |

All builds set `CGO_ENABLED=0`. The canonical target ID, not literal `GOARCH`,
is used in artifact IDs, asset names, manifest selectors, linker
`buildTarget`, installer selection, installed state, and candidate self-test.
Thus Linux ARMv6 and ARMv7 can never collide. The installed launcher is renamed
to `xdocs` or `xdocs.exe` at the shared command path. Launcher and payload
builds are distinct files and manifest entries.

`current.json` is strict schema version `1` with `active` and optional
`previous` records. Each record has raw SemVer and a relative payload path.
The launcher rejects absolute paths, alternate-volume paths, traversal,
symlink/reparse escapes, unsupported schema versions, and any resolved target
outside `$HOME/.guiho/xdocs/versions/`.

The launcher passes original arguments, environment, working directory, and
standard streams to the payload, waits for completion, and returns the exact
payload exit code. It tries `previous` only when `active` is absent or cannot
be started; it does not hide an application command's nonzero exit. Launcher
protocol version 1 is backward compatible with the active and immediately
previous retained payload.

Activation writes a complete candidate pointer beside `current.json`, flushes
it, and atomically replaces the pointer using platform-safe rename semantics.
An installed release is not successful until the stable launcher reports the
exact target SemVer and the active payload passes its post-activation self-test.

## Project and global configuration

The files are:

- project: `<project>/xdocs.yaml`, schema `xdocs.schema.json`;
- global: `$HOME/.guiho/xdocs/xdocs.global.yaml`, schema
  `xdocs.global.schema.json`.

Each generated file begins with a version-pinned HTTPS schema comment pointing
at the exact canonical Git tag. Embedded schemas remain runtime authority and
work offline. Examples are complete, executable configuration documents rather
than fragments.

Strict decode rejects unknown fields and duplicate mapping keys. Semantic
validation rejects unsupported enum values, invalid ignore rules, invalid
paths, and contradictory settings.

Merge semantics are deterministic:

- omitted project leaves inherit the global leaf;
- an explicitly present scalar replaces the global scalar;
- maps merge recursively by known typed field;
- lists replace the corresponding global list in full;
- an explicitly present empty list clears the inherited list;
- no generic untyped YAML merge occurs; and
- command flags override the effective typed configuration only for the
  invocation.

`agent.evolution` exists in global and project schemas. Its leaves are
`upgrade` and `issues.bugs`, `issues.improvements`, and `issues.reviews`. Every
leaf accepts exactly `disabled`, `always-ask`, or `always-proceed` and defaults
to `always-ask` when no valid inherited value exists. Project leaves override
global leaves independently. `disabled` prohibits the governed external agent
action without prompting; `always-ask` requires a new explanation and approval;
and `always-proceed` is persistent authorization to perform and report the
action. Explicit user CLI invocation remains authoritative for that invocation,
while an AI agent must obey the effective policy for upgrades and GitHub issue
creation.

`init` creates and validates the global file first, then the project file. It
preserves valid user values and asks before overwriting any existing value.
Noninteractive execution fails when a required answer is missing.

## Embedded and installed agent resources

The payload embeds the canonical instruction, main skill, and prompt bundle.
The released canonical copies are also installed under the active version.
Every projection includes enough marker metadata to trace it to the CLI,
stable artifact ID, and release version.

The main skill contains the convention's exact `## CLI Evolution and Feedback`
section. `xdocs agent skill|instruction` use the leaf name `upgrade`, never
`update`. `agent skill show` returns complete skill content. `agent prompt list`
and `show` expose `guiho-p-xdocs` and only namespaced additional prompt IDs.

The instruction block is mutated only through marker-aware atomic replacement.
No prompt tells an agent to edit markers manually. `init`, install, repair, and
upgrade reconcile canonical sources and projections according to effective
policy and remove retired projections declared only by the prior manifest.

## Transaction engine and recovery

Install, repair, upgrade, and replaceable-artifact reconciliation share a
transaction journal with phases:

```text
created -> downloaded -> verified -> candidate-installed -> projections-snapshotted
-> projections-replaced -> activated -> post-verified -> completed
```

Rollback phases are `rollback-started`, `pointer-restored`,
`projections-restored`, and `rolled-back`. Every transition is atomically
persisted before the next mutation. Recovery reads only strict, path-validated
journals from the CLI-owned state directory.

The exclusive lock stores schema version, random ownership token, PID, process
start identity when available, executable path, and creation time. Recovery is
allowed only after native process inspection proves that the recorded process
identity is no longer active. Age alone never proves a lock stale. Permission
or process-inspection ambiguity fails closed without mutation.

Each payload invocation registers PID, process start identity, verified
payload path, version, and ownership token. Before activation, upgrade may
terminate only another process owned by the current user whose PID/start
identity and executable path match the registered previous xdocs payload.
Filename-only matching is forbidden. Failure to verify or terminate an old
instance stops before activation.

Interrupted journals recover deterministically:

- before activation: remove verified staging/candidate paths owned by the
  journal and leave the previous release active;
- after activation but before post-verification: restore the previous pointer
  and projection snapshot, then verify the previous launcher path;
- after post-verification: finish installed-manifest replacement and cleanup;
- on ambiguous or corrupted state: stop, preserve evidence, and print the exact
  installer recovery command.

The immediately previous verified payload is retained for launcher fallback.
All older inactive payloads are garbage-collection candidates after successful
activation. A locked inactive payload may be recorded in `garbage.json` for a
later bounded cleanup, but deferred cleanup never changes active state and is
never reported as a scheduled upgrade.

## Install and repair

Both installers implement the convention's release selection: exact version,
explicit channel, or latest stable by default. They resolve the complete
paginated release catalog, reject incomplete releases and prereleases for the
stable channel, select the current native target, print the resolved plan, and
download every manifest-declared artifact into a unique staging directory.

Every checksum is verified before any candidate executes. The candidate must
report the exact target SemVer and pass `__self-test` without mutation. The
verified candidate then drives the shared installation transaction or an
equivalent script adapter whose steps and rollback are covered by parity tests.

Installer repair replaces missing or invalid replaceable artifacts but
preserves project/global configuration and any manifest-declared persistent
data. It installs/repairs the stable launcher, immutable payload, canonical
resource set, global skill projections, bounded instruction block, and
idempotent user-level PATH entry. It never requires administrator/root access.

## Synchronous upgrade

`xdocs upgrade` prints the mandatory two-line reinstall recovery block first
and last for every outcome. After target resolution, the final command pins the
exact target.

Upgrade performs the complete convention transaction in the foreground:
lock, release resolution, full download, checksum verification, candidate
version/self-test, immutable installation, verified old-instance termination,
projection snapshot/replacement, atomic pointer activation, stable-launcher
version check, post-activation self-test, installed-manifest replacement, and
cleanup. Any failure restores the previous pointer and replaceable projections
before returning nonzero.

`--dry-run` resolves and displays the exact complete plan without mutation.
`up-to-date` remains a verified successful outcome. No upgrade result may be
`scheduled`, depend on a detached helper, or overwrite the executing payload.

## Uninstall

`xdocs uninstall`, `devops/uninstall.sh`, and `devops/uninstall.ps1` use one
typed uninstall planner and equivalent flags: preserve configuration, preserve
data, dry run, and confirmation. Before mutation they display exact `REMOVE`
and `PRESERVE` groups. Noninteractive operation without explicit confirmation
fails unchanged.

The installed manifest supplies replaceable paths and projections. The planner
adds the known project configuration and CLI-owned state/persistent paths, then
applies preservation flags. Default uninstall removes the launcher, every
version, the entire CLI home, global skill projections, only xdocs's bounded
instruction block, and the current project's `xdocs.yaml`. It preserves shared
`.guiho`, shared `bin` and `.temp`, the shared PATH entry, other CLI content,
other managed blocks, and `AGENTS.md` itself.

If preservation leaves content in the CLI home, only non-preserved descendants
are removed. Every target passes the same path-containment checks as install
and upgrade.

### Windows direct-command finalization

`uninstall.ps1` remains the preferred fully synchronous Windows surface: the
script runs outside the installed launcher/payload, obtains and confirms the
typed uninstall plan, waits for the CLI process to exit, removes exact
manifest-owned paths, verifies the outcome, and returns success or failure.

Direct `xdocs uninstall` on Windows uses one explicit uninstall-only post-exit
exception for its two locked executable images. It performs this handshake:

1. The payload resolves, displays, confirms, and path-validates the complete
   manifest-authoritative uninstall plan. It performs every unlocked removal
   and preservation action synchronously.
2. It writes a strict, checksummed finalization record under
   `$HOME/.guiho/.temp/xdocs-uninstall-<unique-id>/`. The record contains a
   random ownership token, the launcher and payload PID/start identities, the
   two exact locked executable paths, any now-empty exact parent directories,
   preservation result, and a completion-journal path. No glob, filename
   prefix, arbitrary command string, or path outside the already validated plan
   is permitted.
3. The payload returns a private control result to its verified launcher and
   exits. The launcher reopens the record with no-follow/path-containment
   checks, verifies token and digest, then starts a fixed system-owned Windows
   finalizer command with an argument file rather than interpolated shell text.
4. The finalizer waits for both exact PID/start identities to stop, revalidates
   that each target equals the recorded manifest-resolved path, removes the
   locked launcher/payload and eligible empty CLI-owned directories, verifies
   absence or preservation, and atomically records `completed` or `failed`
   before removing disposable plan material.
5. The launcher exits only after the finalizer process has accepted the valid
   record. The direct command reports **post-exit finalization accepted**, not
   **uninstall complete**, and prints the completion-journal path and exact
   PowerShell recovery/verification command. It never calls this state
   `scheduled`. Failure to create or hand off the finalizer returns nonzero and
   leaves the locked files plus journal available for repair.

Because the originating process must exit before Windows releases the images,
direct Cobra invocation cannot truthfully synchronously report complete
removal. Only the external PowerShell uninstaller may report complete success
after observing the final journal and filesystem. A later installer or
uninstaller checks any retained journal, surfaces `failed` with its exact
paths, and may retry only after the recorded processes are proven stopped.
This exception never applies to install, repair, activation, rollback, or
upgrade, which remain synchronous and fully verified during the original
invocation.

## Complete release construction

Release construction has no hard-coded total asset count. One typed declaration
generates payload targets, launcher targets, resource archives/files, schemas,
examples, `artifacts.json`, and `checksums.txt`. The canonical release includes:

- eight native payloads;
- eight matching launchers;
- the `guiho-s-xdocs` skill archive;
- the `guiho-p-xdocs` prompt archive;
- the real `guiho-i-xdocs.md` instruction source;
- project/global schemas and complete examples;
- the manifest; and
- checksums.

The builder receives exact version, commit, and RFC3339 build date. It rejects
dirty or contradictory metadata, produces deterministic archives/manifests,
and verifies every asset, contained path, checksum, and embedded version before
publication. `DOCS.md` and the exact `CHANGELOG.md` version section are release
gates because `mirror.yaml` enables changelog writing.

The live minor target is not embedded during ordinary convention implementation.
After those units are integrated, clean `main` runs `mirror version plan minor`
to resolve the target. A dedicated release-preparation PR updates or renders
all target-bearing resources from immutable templates, is independently
reviewed and validated, and is merged. Clean `main` must then produce the same
Mirror target and effects before apply.

## Validation architecture

Tests inject a `RuntimePaths` value containing home, project, PATH, CLI home,
cache, skill destinations, and staging root. Production construction derives
it from native APIs; tests never substitute the real home. Background update
work is disabled in deterministic probes.

Validation layers are:

1. typed unit and structural tests for strict decode, manifest identity,
   checksums, path containment, merge semantics, policy, journals, locks, and
   state transitions;
2. native Go integration tests for launcher dispatch/exit codes, repair,
   activation, rollback, recovery, process identity, projections, and uninstall;
3. isolated lifecycle smoke on Windows, Linux, and macOS; foreign ARM targets
   are build/format checks unless a native runner is explicitly available;
4. native PowerShell validation on Windows and POSIX shell validation separately
   on Linux and macOS;
5. deterministic eight-payload/eight-launcher release construction and complete
   manifest/checksum verification;
6. Mirror, RunX, strict XDocs metadata/tree/doctor, Go format/tidy/test/vet/build,
   workflow, installer, and publication-contract gates; and
7. exact-PR-head implementation review, validation, integration, aggregate Kimi
   K3 maximum-reasoning review, clean-main release preparation, and remote
   release verification.

RunX discovery, reveal, and dry-run precede any cataloged mutating or
high-impact command. Text review is limited to in-scope tracked files and must
refuse to open `.env`, `encrypted.env`, keys, credentials, or directories that
contain them.

## Delivery boundaries

Planning artifacts first become durable on `main`. Each focused implementation
unit starts from the accepted integrated dependency on a dedicated branch and
isolated worktree, owns exact non-overlapping paths, records a question ledger,
opens a PR, and passes the canonical `0048` execution, `0049` review, `0050`
validation, and `0052` integration/reachability/cleanup gates. OpenCode
DeepSeek v4 Pro at maximum reasoning is the human-selected implementation
workhorse under the executor's governance; it does not replace lifecycle gates.

Kimi K3 at maximum reasoning is an additional aggregate exact-head review. Any
actionable finding returns through a corrective unit and the same PR gates.
Immediately before Mirror apply, automation is re-inspected. A tag may publish
source and GitHub Release artifacts, but any deployment or other production
effect stops for separate exact human approval.

## Superseded decisions

This architecture supersedes prior xdocs decisions only where they prescribe:

- installation in `.local/bin` or any direct payload on PATH;
- one global `xdocs.yaml` treated as a relocated project file;
- an eleven-asset fixed release;
- in-place executable replacement or detached scheduled upgrade; or
- metadata-only skill display, forbidden `update` leaf commands, or non-namespaced
  prompt resources.

The native Go/Cobra domain architecture and Git-native Mirror authority remain
accepted.

## Architecture review gate

Before plan revision, an independent architecture reviewer must verify that:

- every convention ownership and recovery invariant is represented;
- the stable IDs and package boundaries are unambiguous;
- configuration and agent-evolution semantics are deterministic;
- launcher fallback and transaction recovery cannot escape the CLI boundary;
- platform validation distinguishes native execution from build-only evidence;
- lifecycle and production-effect gates are complete; and
- no implementation question remains that changes product or architecture
  direction.
