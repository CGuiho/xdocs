---
name: xdocs-repository-agent-instructions
purpose: Define mandatory engineering, documentation, validation, and release behavior for agents working in the xdocs repository.
description: Repository-local instructions for the GUIHO repository conventions, Go CLI Engineer skill, XDocs metadata, and Git-native Mirror releases.
created: 2026-06-01
owner: xdocs-package
flags: []
tags:
  - agents
  - repository-instructions
  - cli-engineering
keywords:
  - GUIHO repository conventions
  - CLI Engineer skill
  - xdocs workflow
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# Repository Notes

## Required GUIHO Conventions

Before working in this repository, read the GUIHO root repository's `AGENTS.md`
and the conventions under its `conventions/` directory that apply to the task.
The conventions in Cristóvão GUIHO's [cguiho/guiho repository](https://github.com/cguiho/guiho)
are the shared engineering authority.

Locate that repository using the current platform:

- Linux: `/root/SWE/GUIHO`.
- Windows: `/c/SWE/GUIHO` (`C:\SWE\GUIHO`).
- GitHub fallback: [cguiho/guiho](https://github.com/cguiho/guiho).

Prefer the local checkout. Paths are case-sensitive on Linux; if the preferred
path is absent, discover the actual checkout casing (for example,
`/root/swe/guiho` on this machine). If no local checkout is available, read the
conventions from GitHub.

Read `conventions/guiho-convention-0000-swe.md` for general engineering work
and `conventions/guiho-convention-0001-cli.md` for xdocs CLI work, plus any
other conventions applicable to the task. Follow these conventions for
architecture, planning, execution, review, validation, and release work.

## Required CLI Engineering

- Load and follow the `guiho-s-0035-cli-engineer-go` agent skill whenever creating,
  upgrading, refactoring, reviewing, testing, packaging, installing, or
  releasing the xdocs CLI.
- `guiho-s-0035-cli-engineer-go` is a skill, not an agent. It supplements the
  applicable GUIHO repository conventions.
- Use Go 1.26.5, Cobra, `go.yaml.in/yaml/v3`, typed structs, explicit semantic
  validation, standard-library runtime services, `go:embed`, and
  `CGO_ENABLED=0`.
- The approved Go rewrite is breaking. The historical TypeScript tree remains
  only as migration reference; it is not the shipping runtime, CI path,
  release path, installer path, or version source.


- `xdocs` is almost always written lowercase (CLI, code, text). Only capitalize as `XDocs` when used in a title or heading.
- The real package lives at the repository root; run package commands from `C:\GUIHO\xdocs`.
- XDocs ships as a native Go CLI from `main.go` and `cmd/`; domain packages
  live under `internal/`.
- Use Go commands for active implementation and validation. Do not add Bun,
  Node, npm, pnpm, yarn, or TypeScript dependencies to the Go runtime.

## Commands

- Format: `gofmt -w main.go cmd internal devops`
- Test all: `go test ./...`
- Vet: `go vet ./...`
- Build native: `go build -trimpath -o bin/xdocs.exe .`
- Build release matrix:
  `go run ./devops/build-binaries.go --version <version> --commit <sha> --build-date <RFC3339>`

## CLI Behavior

- The xdocs CLI is a structured documentation tool, not a versioning tool. It
  does not bump versions or mutate package manifests.
- Supported commands: `init`, `scan`, `generate`, `merge`, `tree`, `list`, `meta`, `context`, `doctor`, `agent`, `upgrade`, `uninstall`.
- `xdocs init` creates `xdocs.yaml` when missing and installs the bundled
  skill for both supported agent tools. Commands preserve legacy `XDOCS.md`;
  no invocation automatically deletes it. Resource and bounded instruction
  changes use explicitly authorized `init` or `xdocs agent` mutation actions.
- `xdocs scan` walks the project tree while respecting `scan.exclude`, root and nested `.gitignore` files when enabled, and explicit descriptor candidates; it reports complete named `*.xdocs.md` coverage plus same-directory Markdown companion-document coverage without granting write permission.
- `xdocs generate [path]` generates documentation for a specific directory or the entire project.
- `xdocs merge [path]` merges xdocs descriptors from a directory into a single consolidated document.
- `xdocs tree` walks the complete non-excluded filesystem and displays every
  descriptor by directory containment; metadata relationships are diagnosed
  separately by `doctor`.
- `xdocs list [path]` lists files in a scope with descriptions from xdocs metadata.
- `xdocs meta [path]` scans top-down and reads only YAML frontmatter from named `*.xdocs.md` descriptors; `--documents` reports ordinary companions with explicit `frontmatterRequired: false` unless `documentation.frontmatter` opts them in within `documentation.directories`; `--existing-frontmatter` audits existing headers read-only, while `--owner`, `--tag`, and `--keyword` filter metadata before agents read full files.
- `xdocs context <query> [path]` recommends a minimal reading set for a task from descriptor, file, and companion-document metadata; use `--documents`, `--files`, `--limit`, and `--explain` for agent workflows.
- `xdocs doctor [path]` runs CI-friendly health checks for descriptor validity, explicitly required companion-document metadata, tree integrity, and documented file existence; `--existing-frontmatter` audits legacy headers without authorizing writes.
- `xdocs agent skill install|uninstall|update|list|show`, `agent instruction apply|remove|update|show`, and `agent prompt list|show` implement explicit RFC 0034 agent integration.
- Skill mutations default global, use `--local` for project scope, and always target both `.agents/skills` and `.claude/skills`.
- A bare xdocs invocation prints the exact startup banner without agent
  bootstrap. Only the argument- and flag-free welcome performs cache/update
  scheduling and upgrade-journal housekeeping. Data/help/version commands and
  flagged root invocations perform none of that housekeeping or resource mutation.
- Cobra owns the single command catalog and routing. Typed Go structs, strict
  YAML/JSON decoding, and explicit validation protect structured boundaries.
- Every scope supports `-h`/`--help`, `--help-tree`, `--help-tree-depth`, and `--help-docs`. Only root version uses `-v`/`--version`.
- Configuration uses `xdocs.yaml`; global state uses `~/.guiho/xdocs/`.

## Source Structure

- `main.go` -- thin entrypoint, embedded resources, and linker metadata.
- `cmd/` -- one Cobra tree, help, domain adapters, agents, upgrades, and
  uninstall.
- `internal/config/` -- strict YAML configuration and precedence.
- `internal/xdocs/` -- metadata, discovery, tree, context, doctor, generation,
  merge, and list services.
- `internal/agent/` -- embedded resources and idempotent local/global mutations.
- `internal/update/` -- cached notices, detached worker, SemVer, and release
  catalog.
- `internal/upgrade/` -- checksums and platform-safe executable replacement.
- `internal/release/` -- exact eight-binary and eleven-asset release matrix.
- `source/` -- historical TypeScript migration reference; not active runtime.
- `skills/guiho-s-xdocs/SKILL.md` -- canonical embedded skill source.
- `devops/build-binaries.go` -- reproducible pure-Go release matrix.
- `devops/install.sh` / `devops/install.ps1` -- checksum-verifying native Go
  installers.
- `DOCS.md` -- canonical full user-facing documentation; update before release.

## Key Concepts

- xdocs uses `xdocs.yaml` for configuration and named Markdown descriptors with YAML frontmatter as the only structured documentation metadata. Descriptors must be named `*.xdocs.md`; `.docs.md` and `.xdocs.md` by themselves are invalid candidates. Same-directory non-excluded plain `*.md` files are companion documents listed in the descriptor's `documents` metadata. Ordinary Markdown frontmatter is not required unless a matching `documentation.frontmatter` rule is explicitly authorized inside `documentation.directories`; legacy `ignore.rules` denials always win. A legacy `XDOCS.md` is protected ordinary Markdown, not a descriptor; list it in the owning descriptor's `documents` map when non-excluded. Use `xdocs meta [path] --documents --format json` when an agent needs descriptor and companion-document policy without reading full Markdown bodies.
- Metadata fields: `subject`, `description`, `parent`, `children`, `files`, `documents`, `tags`, `keywords`, `flags`, and optional `status`.
- The displayed tree is a directory-containment hierarchy, not a dependency
  graph. It uses the nearest ancestor descriptor so malformed, orphaned, and
  duplicate metadata cannot hide a discovered file; `doctor` validates
  `subject`/`parent`/`children` relationships separately.
- Configuration lives in `xdocs.yaml`. Sections: `extensions`, `ai`, `documentation`, `ignore`, `scan`, and `project`. `documentation.directories` defaults to `[]` and grants descriptor maintenance only within listed repository-relative directories and descendants; `documentation.frontmatter` defaults to `[]` and grants companion metadata only for matching files or directories inside those grants. `ignore.gitignore` defaults to `true`; strict `ignore.rules` objects use `pattern`, `kind`, and `frontmatter: false`.
- Agent resource operations are not configuration-driven. Only explicit
  `init` setup and `agent` mutation actions change those resources; the plain
  welcome does not. Routine descriptor maintenance is an explicitly authorized
  agent-authored suffix edit followed by read-only CLI validation. Keep reports
  on stdout and ordinary Markdown/frontmatter untouched under Convention 0011.
- AI mode (`ai.mode`): `"auto"` (default, AI updates docs automatically) or `"prompt"` (AI announces updates and waits).
- Runtime CLI dependencies: Cobra and `go.yaml.in/yaml/v3`.

## Gotchas

- Run `gofmt`, `go test ./...`, and `go vet ./...` for every Go change.
- Generated outputs (`dist/`, `bin/`) are ignored; do not hand-edit them.
- Prompt files and the agent skill are embedded into native binaries and packaged
  as `guiho-i-xdocs.md` and `guiho-s-xdocs.zip`. Skill mutation always
  addresses both supported tool paths. Releases contain exactly eleven assets.
- The skill `metadata.version` must match the Git release version.
- The packaged 0.12.0 skill and `prompts/agents.md` retain historical legacy
  deletion/bare-bootstrap guidance. This bounded prerequisite does not authorize
  artifact or release version bumps; follow current `DOCS.md`, command help and
  Convention 0011 for the runtime boundary. Resource reconciliation is a separate
  release-gated gap, not permission to run implicit setup during validation.
- Versioning is handled by Mirror through Git only. The canonical tag format
  is `xdocs/vX.Y.Z`; `package.json` and `jsr.json` are not version sources or
  outputs.

## Semantic Project Versioning -- GUIHO Mirror

Invoke the guiho-s-mirror agent skill every time the user wants to bump, tag, release, plan, initialize, configure, or troubleshoot semantic project versioning with GUIHO Mirror.

Before editing release docs or changelogs, inspect `mirror.yaml`. If `agents.write_changelog` is false, skip changelog edits. If it is missing or true, changelog edits are allowed when the project has a changelog.

Use [agents].changelog_path as the changelog file path. If it is missing, use CHANGELOG.md in the project root.

Before publishing a new version, update `DOCS.md` -- the canonical full
documentation for the native xdocs CLI -- to capture every behavior change in
the release, written the same way as the changelog. Treat `DOCS.md` as a
required release artifact: keep it current with CLI commands and flags,
configuration fields, the metadata schema, Go runtime behavior, and agent skill
behavior. Do not publish when `DOCS.md` is stale relative to the shipping code.

GitHub Release descriptions contain only the exact version section extracted
from `CHANGELOG.md`; never pass the full changelog to release creation.

## GUIHO Project

### Identity

| Field | Value |
| --- | --- |
| GUIHO Project ID | g0000 observed in current GUIHO runtime artifacts; confirm before using as a formal registry ID |
| GUIHO Subject ID | TBD - formal subject ID for this component is not declared yet |
| GUIHO Subject Name | XDocs |
| Project Family | guiho |
| Repository Directory | C:\GUIHO\xdocs |
| Repository Kind | shared package |
| Parent Project | GUIHO Root (`cguiho/guiho`; resolve using Required GUIHO Conventions above) |
| Parent Component | GUIHO Root |

### Component Purpose

Native Go structured-documentation CLI for XDocs.

### Parent Context

- Parent AGENTS: [../guiho/AGENTS.md](../guiho/AGENTS.md)
- Parent TODO: [../guiho/TODO.md](../guiho/TODO.md)
- Local TODO: [./TODO.md](./TODO.md)

For the full project map, sibling components, package index, service index,
project-wide TODOs, and cross-repository coordination rules, read the parent
repository's AGENTS.md GUIHO Project section.

### Local Scope

- Kind: shared package
- Work directory: .
- Primary skills: guiho-s-0035-cli-engineer-go, guiho-s-xdocs
- Baseline checks: `gofmt`, `go test ./...`, `go vet ./...`

### Coordination Rules

- This repository is a child of the GUIHO root coordination repository
  (`cguiho/guiho`); resolve its location using Required GUIHO Conventions above.
- Keep component-specific implementation tasks in the local TODO file.
- Keep cross-component planning and parent delegation in the parent TODO file.
- Read this component's existing local instructions before editing source code.
- Do not publish, deploy, run migrations, rotate secrets, or mutate production resources without explicit user approval.

<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->
## XDocs Structured Documentation

This project uses **xdocs** for structured, machine-readable documentation.
Load the `guiho-s-xdocs` agent skill when working with structured
documentation, named `*.xdocs.md` descriptors, companion documents,
repository scanning, metadata discovery, or validation. Use exactly one named descriptor per directory. `xdocs.yaml` configures behavior while named
descriptors own documentation metadata. A legacy `XDOCS.md` is ordinary
Markdown, not a descriptor: commands preserve it and never delete it automatically.

The project configuration is `xdocs.yaml`. Respect `ai.mode`:
`prompt` asks before already-authorized documentation writes, while
`auto` performs them immediately. Neither mode grants permission.
`documentation.directories` lists repository-relative directories whose
non-excluded subtrees may receive descriptor writes; `.` grants the whole
project and an empty list grants none. `documentation.frontmatter` contains
explicit `{pattern, kind}` rules for ordinary Markdown metadata, and those
rules work only inside an authorized directory. A legacy `ignore.rules` entry
with `frontmatter: false` always denies frontmatter and wins over an opt-in.
Keep ordinary Markdown listed in descriptor `documents` metadata without
adding headers unless both explicit grants match. Respect
`ignore.gitignore` and every `ignore.rules` entry.

Read-only `xdocs scan`, `xdocs meta`, `xdocs context`,
and `xdocs doctor` operations, plus `xdocs tree` without
`--output`, discover independently of the write allowlist. `xdocs tree` walks every non-excluded directory to arbitrary depth,
retains every named descriptor, and reports malformed
or orphaned metadata without hiding paths. `meta --existing-frontmatter` and
`doctor --existing-frontmatter` audit existing ordinary Markdown headers
without requiring missing headers or writing repairs. `generate`,
`merge`, and `tree` print reports to stdout unless one exact
`--output` path is requested; that report path does not authorize any other
document writes and a generated report is never a descriptor.

Routine maintenance is suffix-only: author only explicitly authorized named
`*.xdocs.md` files and keep reports on stdout. Data, help and version
commands do not bootstrap agent resources, clear upgrade journals or schedule
update workers. A plain invocation prints the welcome without agent bootstrap;
only that argument- and flag-free welcome performs runtime update housekeeping.
It is not an all-filesystem read-only command.

The explicit `xdocs init` creates missing configuration and installs
the skill; `xdocs agent` mutation actions manage resources and bounded
instructions. These separately authorized setup actions do not grant arbitrary
Markdown metadata edits. Inspect this runtime's help and documentation when
older installed skill guidance describes legacy deletion or bare bootstrap.
<!-- END XDOCS -->

<!-- BEGIN MIRROR — DO NOT EDIT THIS SECTION -->
## GUIHO Mirror Instruction Block

Run plain `mirror` once in a repository to verify the global Mirror skill and
this bounded instruction block. Repeated runs are idempotent.

Use `mirror version plan <target>` and `mirror version apply <target>` for semantic versioning.
`mirror init` defaults to `v{version}` tags and enables release commits and
pushes; explicit interactive or flag selections remain authoritative.

When `mirror.yaml` defines hooks, follow AI instructions only at the
agent-controlled everything, plan, and apply boundaries. Treat command hooks as
repository code: pass `--run-hooks` or `--skip-hooks` only with explicit
authorization, independently of `--yes`.
<!-- END MIRROR -->
## Mandume

GUIHO XDocs.

Managed by the GUIHO Mandume swarm ([CGuiho/mandume](https://github.com/CGuiho/mandume)); the full worker-registry example lives at `example/AGENTS.md` there.

Read the actual [GUIHO Convention 0011](../guiho/conventions/guiho-convention-0011-agent-readiness.md)
and [canonical model registry 0007](../guiho/conventions/guiho-convention-0007-models.md)
before readiness or delegation work. OpenCode is the only currently supported
agent harness; this section is the authoritative worker registry. Use its built-in
subagent tool and a capable authorized native agent whose actual permissions cover
the brief. General supports broad shell/write work; read-only Explore/Explorer
permissions do not establish another agent's capabilities. Parent authority never
proves child permission.

### Mode

```yaml
execution: dnd  # dnd | interruptible — orchestrator NEVER stops during execution/review
notifications: off  # human-facing notifications only; child completion stays enabled
harness: opencode  # only current harness; native background subagents always
tmux-session: xdocs  # orchestrator session on su-57; convention = this project's name
```

### Coordination

- GitHub repository: https://github.com/CGuiho/xdocs.git
- GitHub Project: https://github.com/users/CGuiho/projects/2 — the authoritative source of truth for task state, ownership, priority, scope and Project fields; `TODO.md` and local task records mirror live readbacks.
- GitHub component: `xdocs` — exact existing Component option on Project #2.
- Every task is a real GitHub issue in its owning repository, attached to this Project with exactly one nonblank Component. A draft item alone is insufficient; Repository and Component are distinct. Read back membership, Component and Status after every mutation.
- To-do file: `TODO.md` (repo root)
- Reserved port: pending — reserve in `apps.md` (`CGuiho/guiho`)

### Workers

| Worker       | Class      | Model (opencode ID)                                                                                     | Thinking | Usage        |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| `mastermind` | mastermind | MiMo-V2.6-Pro (`xiaomi/mimo-v2.6-pro`, direct Xiaomi API) | provider default; no variant | CG-authorized default; availability subject to provider/account |
| `engineer` | workhorse | MiMo-V2.6-Pro (`xiaomi/mimo-v2.6-pro`, direct Xiaomi API) | provider default; no variant | CG-authorized default; availability subject to provider/account |

Both roles retain their judgment/labor distinction and use the same authorized
default. The former Muse Spark (`vercel/meta/muse-spark-1.3-contributor`), GLM
(`opencode/glm-5.3-flash`) and DeepSeek (`opencode/deepseek-v4-flash`) roster is
inactive history only, never fallback capacity. Convention 0007 is the single
model authority. Check the actual model catalog and native tool schema; pass the
exact authorized provider/model and available reasoning variant explicitly.
MiMo advertises no variants: omit that parameter and record provider-default
thinking; never fabricate `max`/`xhigh`. `openai/gpt-6.1-sol#xhigh` is expressly
authorized only for the current native-rollout/readiness task, not a future
default or silent fallback. Record provider failures and continue independent
units without substituting an unauthorized model.

### Contract

- Work on `main`. Include `Mode: dnd`, the actual Convention 0011, owning instructions, task identity, exclusive paths, model/variant decision, required capabilities, acceptance/checks and commit/push authority in every owned-unit brief.
- Launch native background child sessions; harness completion notifications resume the parent to inspect the actual session result, failures, scoped diff, checks, issue/Project/Component/Status readbacks and owned commits, integrate and choose the next ready unit. Human notifications off never disables child completion.
- No native polling, sleeping, shell waits or per-worker file tailing. No active CLI-worker exception exists for a capability gap, permission denial, provider failure or earlier CLI request. Record the exact failure, select an already-authorized capable native agent where possible, fail the affected unit safely and continue independent work without host permission changes or silent model fallback.
- Other agent-harness adapters are inactive/historical. CLI workers are dormant future policy only if CG later authorizes a genuinely native-less harness. Ordinary Git/gh/Go/XDocs/RunX tools and primary OpenCode CLI session startup are distinct from worker delegation.
- Never ask CG or wait for a wake-up during DND execution/technical review. Resolve reversible evidence-grounded decisions under `docs/questions/` and continue; record actual security/data-loss or impossible-specification blockers under `docs/issues/`. Technical self-review precedes later human review.
- Commit only completed coherent owned work under `guiho-s-0032-git-commit`; child pushes require explicit parent authority and independent review of the complete outgoing ancestry. Never push held/unowned ranges, force-push, rewrite history, create branches or bypass hooks.
- Use the Mandume skills (`guiho-s-mandume` + lifecycle skills) and the Essentials skills (`guiho-s-0001-guiho`, `guiho-s-0004-working-with-cg`, `guiho-s-0040-explorer`, `guiho-s-0032-git-commit`). Conventions: `conventions/` in `CGuiho/guiho` (`apps.md` for ports).
