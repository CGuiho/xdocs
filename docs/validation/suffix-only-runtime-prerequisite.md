---
name: Suffix-Only Runtime Prerequisite Validation
purpose: Preserve source, filesystem and task-binary evidence for independent review
description: Records successful runtime checks, negative regressions, exact build identity and the remaining descriptor/resource boundaries.
created: 2026-10-03
flags: [testing, independent-review-pending]
tags: [xdocs, validation, runtime]
keywords: [issue-24, issue-25, suffix-only, filesystem, Go]
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# Suffix-Only Runtime Prerequisite Validation

## Commands and Results

| Check | Result |
| --- | --- |
| `gofmt -l cmd/root.go cmd/root_test.go cmd/runtime_boundary_test.go internal/agent/agent.go internal/agent/agent_test.go` | Exit 0; no unformatted source. |
| `GOTOOLCHAIN=go1.26.5 CGO_ENABLED=0 go test -count=1 ./...` | Exit 0; all existing Go package tests pass. |
| `GOTOOLCHAIN=go1.26.5 CGO_ENABLED=0 go vet ./...` | Exit 0. |
| `python3 /tmp/opencode/xdocs-prerequisite-source-check.py` | Exit 0; policy, unchanged YAML, copyrights and links. An initial failed old-case parent TODO link was corrected in `2cafbed`. |
| Old-source regression tests | Expected exit 1; legacy deletion and descriptor-validation escape detected. `/tmp/opencode/xdocs-negative-before-fix.log`. |
| Injected old housekeeping gate in a disposable source fixture | Expected child exit 1; actual lease-guard creation and upgrade-journal deletion detected by snapshots. `/tmp/opencode/xdocs-negative-housekeeping.log`. |
| `python3 /tmp/opencode/xdocs-task-binary-filesystem-proof.py` | Exit 0; 60 safe commands, nine failure cases, exact suffix-only maintenance and separately bounded bare-welcome housekeeping. |
| `meta <scope> --documents --strict --format json` and `doctor <scope> --format json` | Exit 0 for `cmd`, `internal/agent` and the task question directory. Both exit 2 for `docs/todo`: the two new task specs are absent from its descriptor's `documents` map. |

Complete logs and snapshots are under `/tmp/opencode`. Full Go tests/vet ran
after the last Go source change; later changes are documentation only. Native
Linux behavior is tested; cross-platform runtime/installation is not claimed.

## Real Filesystem Proof

Go tests compare complete file/directory sets, regular-file bytes, permissions,
mtimes and symlink targets in isolated projects and homes. They retain a listed
legacy index so strict validation cannot pass by deleting it. Rejected reports
use valid metadata to reach destination rejection rather than failing earlier.

The compiled-binary matrix uses missing, corrupt and expired caches without
update-disable variables, worker markers or lease guards on routine commands.
It preserves legacy bytes, ordinary headers, malformed AGENTS markers, config,
skills, journals, ignored/excluded malformed descriptors and the home file set.
Manual maintenance changes only `project/docs/docs.xdocs.md`; meta/tree/doctor
then leave everything else unchanged. All nine failure cases have empty deltas:
usage/metadata exit 2, missing config exit 3, rejected report destinations exit 1.
JSON remains one stdout document; the existing config-loaded notice uses stderr.

Bare welcome is a separate non-read-only case: with an existing lease to bound
spawning, it creates the lease guard and clears the upgrade journal, preserving
the project and skill projections. Existing scheduling can attempt a worker
even with a fresh cache; cache-TTL reconciliation is outside this source unit.

Evidence: `/tmp/opencode/xdocs-task-binary-filesystem-proof.json` and its
reproducible Python script. Directory mtimes are intentionally excluded from
comparisons; no all-filesystem purity is asserted for the bare welcome.

## Task Binary Provenance

- Path: `/tmp/opencode/xdocs-readiness-task-linux-amd64`.
- Source commit: `2cafbed5f06cea8d564330aa88a905e02166e4d7` (clean build tree).
- Version output: `xdocs v0.12.0+readiness.2cafbed`.
- Build date: `2026-10-03T22:10:57Z`.
- SHA-256: `c3ec5013d9034ab1dff87f5d3572ed41513078616a60d0ebd83006cfe1ce4622`.
- Go build info confirms Go 1.26.5, `CGO_ENABLED=0`, linux/amd64/v1,
  `vcs.revision` equal to that source commit and `vcs.modified=false`.
- Exact linker command/settings and `go version -m` output:
  `/tmp/opencode/xdocs-task-binary-provenance.json`.

The SemVer build suffix identifies a disposable task build; no project version,
release tag, artifact version or global executable was changed. Subsequent
review-record commits do not change runtime sources or embedded resources.

## Explicit Gaps and Delivery Hold

- `documentation.directories: []` grants no descriptor maintenance here. No
  configuration/exclusion is changed. The two newly required task specs need
  an explicitly authorized descriptor/setup follow-up; they are not hidden or
  falsely reported valid. The new question directory has no descriptor; its
  zero-error health result does not establish coverage.
- Full owning-repository tree traversal is skipped to avoid unrelated historical
  and secret-named paths. Full tree behavior is verified in disposable fixtures.
- Required Go CLI Engineer skill is unavailable; no current config JSON Schema,
  MEMORY, local rules or RunX catalog exists. Typed config decoding is tested;
  RunX/resource maintenance is not invoked as a substitute.
- Packaged 0.12.0 skill and agents prompt remain stale under the explicit
  no-artifact/version-bump boundary; see the decision ledger.
- Issues #24 and #25 remain OPEN/Testing on Project #2, Component `xdocs`.
  Independent review, push and any global installation remain parent-owned.

References: [task spec](../todo/suffix-only-runtime-prerequisite.md) and
[housekeeping decision](../questions/suffix-only-runtime-prerequisite/2026-10-03-runtime-housekeeping-boundary.md).
