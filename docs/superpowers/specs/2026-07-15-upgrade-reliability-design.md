---
name: XDocs Upgrade Reliability Design
purpose: Define the approved behavior and implementation boundaries for a reliable, observable, and recoverable xdocs self-upgrade workflow.
description: Specifies the immediate verified executable swap, progress and output contracts, complete release catalog, pinned recovery commands, installer hardening, tests, ownership, and release gates for xdocs issues 9 and 10.
created: 2026-07-15
flags:
  - final
  - approved-design
tags:
  - architecture
  - cli
  - reliability
  - release
keywords:
  - xdocs upgrade
  - GitHub issue 9
  - GitHub issue 10
  - Windows executable replacement
  - upgrade list
  - recovery command
  - prerelease
owner: xdocs-superpowers-specs
---

# XDocs Upgrade Reliability Design

## Summary

This specification defines the approved repair for [xdocs issue #9](https://github.com/CGuiho/xdocs/issues/9) and [xdocs issue #10](https://github.com/CGuiho/xdocs/issues/10). The `xdocs upgrade` command must expose its plan before a long download, replace the canonical executable during the command, verify the installed version, roll back failed replacements, and always provide a copy-paste recovery path pinned to an exact version. `xdocs upgrade list` must return the complete release catalog with stable and prerelease labels.

The current Windows implementation downloads a candidate, writes the update cache as though the target were installed, starts a detached PowerShell process that waits for xdocs to exit, and reports a scheduled replacement. That sequence cannot prove that the canonical `xdocs.exe` changed. A failed detached process leaves the old binary in place while the cache and command output imply success.

The replacement becomes a synchronous, verified transaction. Only deletion of the renamed old executable may be deferred until the running old process exits.

## Goals

- Print and flush the complete upgrade plan before downloading the asset body.
- Stream clear plan, download, validate, replace, verify, cache, cleanup, and terminal outcomes in text and Markdown modes.
- Replace the canonical executable immediately on Windows, macOS, and Linux.
- Verify the canonical executable reports the exact target version before declaring success.
- Restore the previous executable whenever replacement or verification fails.
- Update cached version state only after successful verification.
- Always show an exact-version recovery installer command after every terminal upgrade outcome, including failures before a target plan exists.
- Show a separate process-stop command without killing processes automatically.
- List every valid published xdocs version, newest semantic version first, including alpha, beta, release-candidate, and other prerelease channels.
- Keep text, Markdown, and JSON outputs stable enough for automated tests and callers.
- Close the GitHub issues only after the released native binary passes a real installed upgrade.

## Non-goals

- The upgrade command will not bump project versions or mutate a documented project's package files.
- The upgrade command will not kill xdocs processes automatically.
- The implementation will not introduce a shared cross-repository upgrade package during this priority repair.
- Uninstall behavior is not redesigned except where shared replacement utilities must preserve its existing behavior.
- This specification does not authorize publishing; release execution remains a separate gated step.

## Considered Approaches

### Selected: repository-local verified transaction

xdocs keeps its upgrade implementation inside this repository and separates release discovery, transaction execution, recovery guidance, and presentation through typed contracts. This avoids adding a bootstrap dependency to the failure-recovery path and permits a patch-sized release.

### Rejected: improve messages around scheduled replacement

Keeping the detached canonical replacement would make the output clearer without making the operation reliable. The parent xdocs process cannot observe the detached move, verify the new canonical path, or roll it back. This does not satisfy issue #9.

### Deferred: shared self-upgrade package

RunX, Mirror, and xdocs need aligned behavior, but extracting a shared package now would introduce cross-repository sequencing, publishing, and bootstrap risks. Contract parity is required; shared code is not required for this repair.

## Architecture

The implementation uses five focused responsibilities. They may remain in a small number of files initially, but their types and ownership boundaries must stay explicit.

1. **Release catalog** fetches GitHub Releases pages, normalizes xdocs tags, validates semantic versions, classifies channels, selects compatible assets, and sorts releases.
2. **Upgrade planner** resolves the exact target and constructs an immutable `UpgradePlan` before any asset body is downloaded.
3. **Upgrade transaction** downloads, validates, replaces, verifies, commits cache state, rolls back, and cleans temporary files.
4. **Recovery guidance** creates shell-appropriate exact-version install and process-stop commands from the plan or from a visibly labeled current-version repair fallback.
5. **Presenters** consume the same plan, events, and terminal result to render text, Markdown, or JSON without duplicating upgrade decisions.

Command handlers remain thin. Citty continues to own argument parsing and routing. Domain functions must not write directly to stdout; they report typed events through an injected event sink so presentation can occur before awaited work.

## Upgrade Plan Contract

Planning completes before download. A plan has the following logical shape:

```ts
type UpgradePlan = {
  currentVersion: string
  targetVersion: string
  platform: 'windows' | 'macos' | 'linux'
  arch: 'x64' | 'arm64'
  variant: 'baseline' | 'default' | 'modern' | null
  assetName: string
  downloadUrl: string
  executablePath: string
  temporaryPath: string
  backupPath: string
  releaseUrl: string
}
```

`targetVersion` is always an exact valid semantic version, including the full prerelease suffix. `downloadUrl` points to the exact tagged release rather than a mutable `latest` URL. Temporary and backup paths reside beside the canonical executable so every rename stays on one filesystem.

If implicit target discovery fails, `plan` remains `null`. xdocs still emits recovery guidance pinned to the exactly installed version with `targetSource: 'fallback-current'`. The text and Markdown labels must state that this command is a repair reinstall of the current version, not an upgrade to a newly discovered version. The implementation never substitutes a mutable `latest` target. An explicitly requested version can still produce a plan and target-specific recovery guidance when latest-release discovery is unavailable.

## Upgrade Event Contract

The transaction emits monotonically sequenced events:

```ts
type UpgradePhase =
  | 'plan'
  | 'download'
  | 'validate'
  | 'replace'
  | 'verify'
  | 'cache'
  | 'cleanup'

type UpgradeEvent = {
  sequence: number
  phase: UpgradePhase
  status: 'started' | 'succeeded' | 'skipped' | 'failed'
  message: string
}
```

Sequences begin at one and never repeat. Messages contain no terminal color codes. Presenters may add color in text mode. Timestamps are intentionally excluded from the stable contract so output and snapshots remain deterministic.

The normal phase order is plan, download, validate, replace, verify, cache, and cleanup. Each transition receives the next sequence number. Terminal state is represented by the envelope `outcome`, not by an extra event phase. A successful rollback produces `outcome: 'rolled-back'` after a failed `replace` or `verify` event and successful cleanup events. Rollback failure produces `outcome: 'failed'` with both the replacement and rollback errors and must preserve every recoverable file.

Text and Markdown presenters render and flush `started` events immediately. `succeeded`, `skipped`, and `failed` events close the corresponding phase. JSON retains the complete ordered event sequence in its final envelope.

## Transaction Semantics

### Download and validation

- Emit and flush the plan before requesting the asset body.
- Emit `Downloading...` before awaiting the body.
- Write the response to a uniquely named temporary executable beside the canonical path. Windows temporary files retain an `.exe` suffix.
- Reject unsuccessful HTTP responses, empty bodies, and invalid platform magic bytes.
- Execute the temporary candidate with `--version` where the platform permits and require the exact target version before mutation.
- Disable background update checks in verification children to prevent recursion or output noise.

### Immediate canonical replacement

On Windows:

1. Remove only a stale backup owned by the current transaction.
2. Rename the canonical executable to the transaction backup path.
3. Rename the validated temporary executable to the canonical path immediately.
4. Execute the absolute canonical path with `--version`.
5. Require exit code zero and exact target-version output.

The old xdocs process continues executing from the renamed backup. A helper may wait for the old process and remove that backup, but it must never be responsible for installing the canonical executable.

On macOS and Linux, set executable permissions on the candidate, use same-filesystem renames, and apply the same canonical-path verification and rollback rules.

### Rollback

If the candidate cannot take the canonical path or canonical verification fails:

1. Remove the failed canonical candidate when present.
2. Rename the backup back to the canonical path.
3. Verify that the restored canonical path is executable and reports the previous version when possible.
4. Remove remaining transaction temporary files when safe.
5. Return a nonzero result containing the original failure and any rollback failure.

The command must never report success when the canonical path is absent, still reports the old version, or reports a different target.

### Cache commit and cleanup

The update cache remains unchanged through download, validation, replacement, and verification. The `cache` phase starts only after canonical verification succeeds. It updates cached state to the target. A cache write failure after a verified replacement is reported in the result and repaired on the next check; it does not undo a working executable.

The transaction first tries to remove the backup. If Windows still holds the renamed image open, xdocs schedules deletion of that backup only and returns `cleanup.scheduled: true`. Deferred backup cleanup is not deferred installation.

## Recovery Guidance

Every terminal outcome includes:

```ts
type UpgradeRecovery = {
  targetVersion: string
  targetSource: 'release' | 'explicit' | 'fallback-current'
  installCommand: string
  stopProcessCommand: string
}
```

The recovery block appears after success, already-current, dry-run, rolled-back, and failed results, even when `plan` is `null`. The install command is copy-paste ready and pins `targetVersion`; it never uses `latest`. `targetSource` records whether the pin came from release discovery, an explicit version, or the current-version repair fallback. The stop command is separate, clearly optional, and appears after the installer command.

When implicit discovery fails, text and Markdown use this visible label before the command: `Target discovery failed. Repair fallback: reinstalling currently installed xdocs <currentVersion>.` The JSON equivalent uses `plan: null`, `outcome: "failed"`, and `targetSource: "fallback-current"`.

Windows uses `powershell.exe` so the command can be invoked from PowerShell or Git Bash. Its logical template is:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$installer = Join-Path $env:TEMP "xdocs-install.ps1"; Invoke-WebRequest "https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1" -OutFile $installer; & $installer -Version "<targetVersion>"; Remove-Item $installer -Force'
```

The optional stop command is:

```powershell
powershell.exe -NoProfile -Command 'Get-Process xdocs -ErrorAction SilentlyContinue | Stop-Process -Force'
```

macOS and Linux use the direct installer with the exact version:

```bash
curl -fsSL https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.sh | bash -s -- --version '<targetVersion>'
```

Quoting is generated and tested rather than assembled ad hoc in the presenter. Recovery commands must also be present as uncolored strings in JSON.

## Output Contracts

### Text

Text mode writes the bordered plan immediately:

```text
------------------------------------------------------------
  xdocs upgrade
------------------------------------------------------------
  current : 0.6.0-alpha.0
  target  : 0.6.0-alpha.1
  os      : windows
  arch    : x64
  binary  : xdocs-windows-x64-baseline.exe
  path    : C:/Users/example/.local/bin/xdocs.exe
  url     : https://github.com/CGuiho/xdocs/releases/download/%40guiho%2Fxdocs%400.6.0-alpha.1/xdocs-windows-x64-baseline.exe
------------------------------------------------------------
Downloading...
Validating...
Replacing...
Verifying...
Updating cache...
Cleaning up...
Upgrade complete: 0.6.0-alpha.0 -> 0.6.0-alpha.1

If the upgrade did not take effect, install 0.6.0-alpha.1 directly:
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$installer = Join-Path $env:TEMP "xdocs-install.ps1"; Invoke-WebRequest "https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1" -OutFile $installer; & $installer -Version "0.6.0-alpha.1"; Remove-Item $installer -Force'
If Windows reports the file is in use, stop other xdocs processes and retry:
  powershell.exe -NoProfile -Command 'Get-Process xdocs -ErrorAction SilentlyContinue | Stop-Process -Force'
```

Every phase line is flushed before its awaited operation begins. `Upgrade complete` appears only after canonical verification.

### Markdown

Markdown mode contains the same information and ordering using a heading, plan table, bold phase lines, terminal result, and fenced recovery commands. It is streamed phase by phase and remains valid when captured as one document. It must not contain ANSI color codes.

### JSON

JSON mode writes exactly one valid JSON document to stdout. Human progress is not mixed into stdout. The presenter buffers typed events and includes them in the terminal object:

```ts
type UpgradeResult = {
  verifiedVersion: string | null
  cacheUpdated: boolean
  cleanup: {
    backupPath: string | null
    scheduled: boolean
  }
}

type UpgradeError = {
  code: string
  message: string
}

type UpgradeEnvelope = {
  schemaVersion: 1
  command: 'xdocs upgrade'
  outcome: 'upgraded' | 'up-to-date' | 'dry-run' | 'rolled-back' | 'failed'
  plan: UpgradePlan | null
  events: UpgradeEvent[]
  result: UpgradeResult | null
  recovery: UpgradeRecovery
  error: UpgradeError | null
}
```

```json
{
  "schemaVersion": 1,
  "command": "xdocs upgrade",
  "outcome": "upgraded",
  "plan": {
    "currentVersion": "0.6.0-alpha.0",
    "targetVersion": "0.6.0-alpha.1",
    "platform": "windows",
    "arch": "x64",
    "variant": "baseline",
    "assetName": "xdocs-windows-x64-baseline.exe",
    "downloadUrl": "https://github.com/CGuiho/xdocs/releases/download/%40guiho%2Fxdocs%400.6.0-alpha.1/xdocs-windows-x64-baseline.exe",
    "executablePath": "C:/Users/example/.local/bin/xdocs.exe",
    "releaseUrl": "https://github.com/CGuiho/xdocs/releases/tag/%40guiho%2Fxdocs%400.6.0-alpha.1"
  },
  "events": [
    { "sequence": 1, "phase": "plan", "status": "started", "message": "Resolving upgrade target." },
    { "sequence": 2, "phase": "plan", "status": "succeeded", "message": "Upgrade plan resolved." },
    { "sequence": 3, "phase": "download", "status": "started", "message": "Downloading upgrade asset." },
    { "sequence": 4, "phase": "download", "status": "succeeded", "message": "Upgrade asset downloaded." },
    { "sequence": 5, "phase": "validate", "status": "started", "message": "Validating upgrade asset." },
    { "sequence": 6, "phase": "validate", "status": "succeeded", "message": "Upgrade asset validated." },
    { "sequence": 7, "phase": "replace", "status": "started", "message": "Replacing canonical executable." },
    { "sequence": 8, "phase": "replace", "status": "succeeded", "message": "Canonical executable replaced." },
    { "sequence": 9, "phase": "verify", "status": "started", "message": "Verifying canonical executable." },
    { "sequence": 10, "phase": "verify", "status": "succeeded", "message": "Canonical executable reports 0.6.0-alpha.1." },
    { "sequence": 11, "phase": "cache", "status": "started", "message": "Updating cached version state." },
    { "sequence": 12, "phase": "cache", "status": "succeeded", "message": "Update cache committed." },
    { "sequence": 13, "phase": "cleanup", "status": "started", "message": "Cleaning transaction artifacts." },
    { "sequence": 14, "phase": "cleanup", "status": "succeeded", "message": "Backup cleanup scheduled after the old process exits." }
  ],
  "result": {
    "verifiedVersion": "0.6.0-alpha.1",
    "cacheUpdated": true,
    "cleanup": {
      "backupPath": "C:/Users/example/.local/bin/xdocs.exe.old",
      "scheduled": true
    }
  },
  "recovery": {
    "targetVersion": "0.6.0-alpha.1",
    "targetSource": "release",
    "installCommand": "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$installer = Join-Path $env:TEMP \"xdocs-install.ps1\"; Invoke-WebRequest \"https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1\" -OutFile $installer; & $installer -Version \"0.6.0-alpha.1\"; Remove-Item $installer -Force'",
    "stopProcessCommand": "powershell.exe -NoProfile -Command 'Get-Process xdocs -ErrorAction SilentlyContinue | Stop-Process -Force'"
  },
  "error": null
}
```

The envelope fields are fixed: `schemaVersion`, full `command`, `outcome`, nullable `plan`, sequenced `events`, nullable `result`, required `recovery`, and nullable `error`. `outcome` is one of `upgraded`, `up-to-date`, `dry-run`, `rolled-back`, or `failed`. Failed and rolled-back operations return a nonzero exit code. Machine-readable errors use stable codes plus a human message. Paths and URLs are ordinary uncolored strings.

Implicit discovery failure still returns an exact repair command:

```json
{
  "schemaVersion": 1,
  "command": "xdocs upgrade",
  "outcome": "failed",
  "plan": null,
  "events": [
    { "sequence": 1, "phase": "plan", "status": "started", "message": "Resolving upgrade target." },
    { "sequence": 2, "phase": "plan", "status": "failed", "message": "Could not resolve the latest xdocs release." }
  ],
  "result": null,
  "recovery": {
    "targetVersion": "0.6.0-alpha.0",
    "targetSource": "fallback-current",
    "installCommand": "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$installer = Join-Path $env:TEMP \"xdocs-install.ps1\"; Invoke-WebRequest \"https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1\" -OutFile $installer; & $installer -Version \"0.6.0-alpha.0\"; Remove-Item $installer -Force'",
    "stopProcessCommand": "powershell.exe -NoProfile -Command 'Get-Process xdocs -ErrorAction SilentlyContinue | Stop-Process -Force'"
  },
  "error": {
    "code": "upgrade-target-unavailable",
    "message": "Could not resolve an exact upgrade target; recovery reinstalls the currently installed version."
  }
}
```

## Complete Release Catalog

`xdocs upgrade list` fetches the complete GitHub Releases collection with `per_page=100` and follows pagination until no next page exists. A later-page failure fails the command instead of silently returning a partial catalog.

Each accepted release has this logical shape:

```ts
type XDocsRelease = {
  version: string
  tag: string
  channel: 'stable' | 'alpha' | 'beta' | 'rc' | 'prerelease'
  prerelease: boolean
  publishedAt: string | null
  releaseUrl: string
  assets: XDocsReleaseAsset[]
  compatibleAsset: XDocsReleaseAsset | null
}
```

Only valid xdocs semantic-version tags are included. Duplicate versions are removed. Releases sort by semantic version descending, with publication time as a deterministic tie-breaker. Stable releases have channel `stable`; prerelease identifiers beginning with `alpha`, `beta`, or `rc` use that label; every other prerelease uses `prerelease`.

Text output is an aligned table with Version, Channel, Published, and Compatible Asset columns. It marks the installed version as `current` and the highest stable release as `latest stable`. Markdown uses an equivalent table. JSON uses this complete wrapper:

```ts
type UpgradeListEnvelope = {
  schemaVersion: 1
  command: 'xdocs upgrade list'
  currentVersion: string
  latestStableVersion: string | null
  releases: XDocsRelease[]
}
```

The `releases` array contains every valid paginated release. An empty valid catalog is rendered explicitly rather than as a blank screen.

## Installer Hardening

The direct PowerShell and shell installers are the recovery source of truth and must support exact stable and prerelease versions.

- Download to a unique temporary file rather than directly to the canonical destination.
- Validate platform magic bytes and execute the candidate with `--version` before replacement.
- Install through a same-directory temporary path and canonical swap.
- Preserve baseline/default/modern x64 fallback and arm64 selection.
- Quote install directories and version strings safely.
- Verify the final absolute canonical path reports the requested version.
- Restore the previous destination on replacement or verification failure.
- Warn when another `xdocs` earlier in `PATH` shadows the installed path.
- Remove installer temporary files in success and failure paths.
- Return nonzero on download, validation, replacement, rollback, or verification failure.

The package-manager installer must consume the same asset-name and exact-tag conventions. It may share pure helpers, but package installation must not be coupled to interactive CLI presentation.

## Concurrency and Crash Recovery

Only one upgrade transaction may own an executable path at a time. A same-directory lock or transaction journal records current, temporary, and backup paths. A second upgrade fails clearly and prints recovery guidance.

At startup, an interrupted transaction with a missing canonical path and intact backup is recoverable by restoring the backup before beginning new work. Stale temporary files with an intact canonical path may be removed. The implementation must never guess between two valid canonical candidates; it reports the journal state and recovery command.

## Test Design

### Pure and catalog tests

- Semantic ordering across stable, alpha, beta, rc, numeric prerelease identifiers, and build metadata.
- Invalid and unrelated tags, duplicate releases, missing dates, and missing assets.
- Pagination with zero, one, 100 plus one, and multiple full pages followed by a partial page.
- Failure on a later page, rate limiting, and malformed GitHub responses.
- Channel labels and compatible asset selection for every supported platform, architecture, and x64 variant.
- Exact recovery-command generation for stable and prerelease targets, paths with spaces, and shell quoting.

### Transaction tests

- Plan and `Downloading...` are written before a gated mocked response body resolves.
- Normal event order and exactly one terminal event.
- Invalid downloads never mutate the canonical executable or cache.
- Rename failure preserves the previous canonical path.
- Verification mismatch restores the byte-identical previous executable.
- Rollback failure reports both errors and preserves recoverable artifacts.
- The `cache` event begins only after exact canonical verification, and cached state changes only after that point.
- Concurrent transactions cannot share the same executable path.
- Interrupted-journal recovery restores a missing canonical path from backup.

### Windows end-to-end tests

- Copy a real executable to a temporary `xdocs.exe`, keep it running, and prove it can be renamed while the old process remains alive.
- Install a real target at the canonical path and verify `xdocs.exe --version` returns the target before `upgradeSelf` returns.
- Confirm replacement is not scheduled and only backup deletion may be scheduled.
- Stop the old process and confirm deferred backup cleanup completes.
- Force candidate verification failure and prove automatic rollback.
- Execute the printed PowerShell recovery installer in a temporary install directory and verify the exact prerelease version.
- Exercise the recovery command from both PowerShell and Git Bash.

### Output tests

- Snapshot text and Markdown plans, ordered events, terminal outcomes, and recovery blocks.
- Parse each JSON invocation as exactly one document and validate the fixed envelope, common event phases/statuses, result, recovery, and errors.
- Cover upgraded, up-to-date, dry-run, download failure, rolled-back, and failed outcomes.
- Verify every terminal outcome includes the exact-version installer command before the optional singular `stopProcessCommand`.
- Verify implicit discovery failure keeps `plan: null` and emits a visibly labeled current-version repair with `targetSource: "fallback-current"`.
- Verify `upgrade list` text, Markdown, and JSON all contain every paginated release in semantic order, while JSON also reports `currentVersion` and `latestStableVersion`.

## Exclusive Implementation Ownership

To avoid shared-worktree collisions, one XDocs upgrade implementation owner has exclusive write responsibility for this slice until integration:

- `source/self-management.ts`
- `source/types.ts`
- `source/commands/upgrade.ts`
- `source/cli.ts` only when command flags or format routing require changes
- new focused self-management, upgrade-command, and Windows end-to-end test files
- `devops/install.ps1`
- `devops/install.sh`
- `scripts/install-package.ts` when asset or verification behavior changes
- directly affected xdocs descriptors
- `DOCS.md`, `README.md`, the bundled skill, and changelog entries required by shipping behavior

Other agents may review read-only or work in isolated worktrees, but they must not edit these paths concurrently. The implementation owner stages explicit paths and never broad-stages the repository.

## Validation and Release Gates

Implementation is complete only after all of the following pass:

1. `bun run typecheck`
2. `bun test`
3. `bun run build`
4. `bun run binary`
5. `bun run binaries`
6. Focused XDocs metadata validation for every changed descriptor and companion document
7. XDocs tree validation with no new orphan, duplicate, or parent-child errors
8. Windows immediate-replacement, rollback, cleanup, and printed-installer end-to-end tests
9. Linux and macOS replacement tests in CI
10. Manual text, Markdown, and JSON smoke tests from an installed native binary

Before release, update `DOCS.md`, user-facing help, the bundled skill where its command contract changes, and `CHANGELOG.md`. Use GUIHO Mirror to inspect configuration and plan the smallest appropriate version; never hand-edit version fields or tags. Publishing and pushing require their normal explicit authorization and protected workflow.

After publishing, verify that the GitHub release contains every supported native asset and that the direct installers resolve the exact tag. Upgrade a machine from the previously published binary to the new binary, run `xdocs --version`, run `xdocs upgrade list`, and execute the printed exact-version recovery command in a temporary install directory.

Issue #9 closes only after the published binary performs an immediate verified canonical replacement and the complete catalog/output behavior is confirmed. Issue #10 closes only after every terminal outcome, including pre-plan discovery failure, prints the pinned installer and separate stop command, and the printed installer is proven to install its exact stable or prerelease version. If publishing or live verification fails, both issues remain open.

## Implementation Handoff

This document is the approved design gate. Source implementation begins only after this specification commit is reviewed. The implementation plan must preserve the transaction ordering, public output schemas, exclusive path ownership, and release/issue gates defined here.
