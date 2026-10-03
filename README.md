#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# GUIHO XDocs

XDocs is a native Go CLI for structured repository documentation. It discovers
every non-excluded named `*.xdocs.md` descriptor at every depth, renders a
complete containment tree, recommends minimal reading sets, and reports
documentation health issues. Descriptor and ordinary Markdown writes are
explicitly opt-in per project directory.

The shipping runtime uses Go 1.26.5, Cobra, strict YAML structs, embedded agent
resources, local cached update notices, safe self-upgrades, and exactly eleven
release assets. Bun and Node are not required.

## Install

PowerShell:

```powershell
irm https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1 | iex
```

Linux and macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.sh | sh
```

The installers select the exact Windows, Linux, macOS, AMD64, ARM64, ARMv7, or
ARMv6 asset, verify it against `checksums.txt`, install `xdocs`, install the
bundled skill into both global agent locations, and verify the executable.

## Start

```text
xdocs
Hello Windows - xdocs v0.9.0
```

A plain argument-free invocation prints the welcome without installing skills
or reconciling repository instructions. Only this argument- and flag-free
welcome reads update notices, schedules a bounded detached update worker and
reports/clears a prior upgrade journal. It preserves project files but is not
an all-filesystem read-only command. Data/help/version and flagged root
invocations skip that runtime housekeeping, even with missing or corrupt caches.

```bash
xdocs init
xdocs scan
xdocs tree
xdocs doctor
```

`xdocs init` creates `xdocs.yaml` when it is missing, then installs the skill
globally by default. Use `xdocs init --local` for project-local skill targets.
Every invocation preserves a legacy `XDOCS.md` in the effective project
directory. It is ordinary Markdown, not a descriptor; list a non-excluded
existing legacy file in the owning descriptor's `documents` map.
Configuration lives in `xdocs.yaml`; named `*.xdocs.md` descriptors own
documentation metadata. The generated configuration starts with no
documentation write grants, so initialization does not authorize descriptor or
ordinary Markdown metadata changes.

## Configuration

xdocs resolves one configuration file:

1. `--config <path>`;
2. `./xdocs.yaml`;
3. `~/.guiho/xdocs/xdocs.yaml`.

```yaml
schema: 1
extensions:
  supported:
    - .xdocs.md
ai:
  mode: auto
documentation:
  directories: []
  frontmatter: []
ignore:
  gitignore: true
  rules:
    - pattern: AGENTS.md
      kind: file
      frontmatter: false
    - pattern: README.md
      kind: file
      frontmatter: false
    - pattern: CLAUDE.md
      kind: file
      frontmatter: false
scan:
  exclude:
    - node_modules
    - .git
    - dist
    - build
    - library
    - bin
    - bundle
    - vendor
project:
  name: example
```

`ai.mode` defaults to `auto`. `auto` performs documentation changes that are
already authorized by `documentation`; `prompt` announces those changes and
waits for confirmation. The mode controls timing only and never grants write
permission.

`documentation.directories` is a list of repository-relative literal directory
paths. Each entry authorizes descriptor maintenance in that directory and its
non-excluded descendants. `.` authorizes the whole non-excluded project. An
empty list authorizes no descriptor writes. XDocs does not populate this list
during `init`.

`documentation.frontmatter` is a list of explicit rules with `pattern` and
`kind` (`file` or `directory`). A rule authorizes ordinary Markdown frontmatter
only when the document is also below an authorized documentation directory.
Legacy `ignore.rules` entries with `frontmatter: false` always deny the
frontmatter write and take precedence. Discovery can still list those
documents in a descriptor's `documents` map, and missing frontmatter is valid
unless both opt-ins match.

`ignore.gitignore` defaults to `true`, so Git-ignored files and directories do
not enter xdocs discovery, metadata, context, or health checks. Each strict
`ignore.rules` object has a repository-relative `pattern`, a `kind` of `file`
or `directory`, and `frontmatter: false`. These matches remain discoverable and
must still be listed in descriptor metadata, but xdocs never requires or
recommends YAML frontmatter for them. A pattern without `/` matches that name
at any depth, and a directory rule applies to all descendants and may end in
`/`. Malformed globs fail configuration loading. Any explicit rules list
replaces the three presets; use `ignore.rules: []` to remove them without
adding replacements.

For example, these rules keep `cloud.md` and every Markdown file under
`docs/legacy` tracked without xdocs-owned frontmatter:

```yaml
ignore:
  rules:
    - pattern: cloud.md
      kind: file
      frontmatter: false
    - pattern: docs/legacy
      kind: directory
      frontmatter: false
```

Unknown configuration fields, multiple YAML documents, unsupported descriptor
extensions, invalid AI modes, malformed ignore rules, and invalid exclusion
entries fail explicitly.

## Descriptor model

Each documented module directory has exactly one named descriptor. Name a new
descriptor after its directory, such as `technologies/technologies.xdocs.md`:

```yaml
---
subject: example-auth
description: Authentication implementation and contracts.
parent: example
children: []
files:
  service.go: Authentication service.
documents:
  design.md: Authentication design.
tags:
  - authentication
keywords:
  - session
flags: []
---
```

The descriptor body carries the directory's useful overview, details, and
usage context. Do not create a separate summary or detail Markdown file for
that context. The bare `.xdocs.md` name and legacy `.docs.md` files are invalid
descriptors. There is no special root descriptor.

Every non-excluded plain sibling Markdown file must be declared in `documents`,
whether or not it has frontmatter. Ordinary Markdown needs the standard
frontmatter fields only when an explicit `documentation.frontmatter` rule and
an authorized directory match. The default legacy denials protect `README.md`,
`AGENTS.md`, and `CLAUDE.md`; do not add frontmatter to those or other user
documents merely because XDocs discovers them.

## Commands

- `xdocs init [--local]`
- `xdocs scan`
- `xdocs generate [path] [--output <path>]`
- `xdocs merge [path] [--output <path>]`
- `xdocs tree [--output <path>]`
- `xdocs list [path]`
- `xdocs meta [path] [--documents] [--existing-frontmatter] [--strict]`
- `xdocs context <query> [path] [--documents] [--files]`
- `xdocs doctor [path] [--no-documents] [--existing-frontmatter] [--warnings-as-errors]`
- `xdocs agent skill install|uninstall|update|list|show`
- `xdocs agent instruction apply|remove|update|show`
- `xdocs agent prompt list|show`
- `xdocs upgrade [--version <version>] [--dry-run]`
- `xdocs upgrade check`
- `xdocs upgrade list [--page <n>] [--size <n>]`
- `xdocs uninstall [--dry-run]`

Every scope supports `-h`/`--help`, `--help-tree`,
`--help-tree-depth <positive-integer>`, and `--help-docs`. Only the root
supports `-v`/`--version`. Use `--format text|json|markdown` for stable output.

`scan`, `list`, `meta`, `context`, and `doctor` are read-only, including project
and agent resources, cache, leases and upgrade journals. Without `--output`,
`generate`, `merge`, and `tree` are also read-only. The tree walks all non-excluded directories to arbitrary
depth, includes every discovered named descriptor, and reports malformed or orphaned metadata without hiding a node. `meta --existing-frontmatter` and
`doctor --existing-frontmatter` audit existing ordinary Markdown headers only:
missing headers remain valid, malformed existing headers are reported, and no
repair or ownership is inferred.

`generate`, `merge`, and `tree` print reports to stdout unless one exact
`--output` path is supplied. That path authorizes only the requested report;
it does not authorize metadata edits or additional files. Descriptor-shaped
destinations are rejected, and a rejected destination is left byte-for-byte
unchanged.

For suffix-only readiness work, keep reports on stdout and author only the
exact named `*.xdocs.md` files already authorized by the task and literal
`documentation.directories` grants. Keep `documentation.frontmatter: []`,
existing exclusions and ignore denials. The CLI validates those manual edits;
`generate` and `merge` render reports rather than maintain descriptors.

```bash
xdocs meta docs --documents --strict --format json
xdocs tree --format json
xdocs doctor docs --format json
```

## Agents

The binary embeds:

- `skills/guiho-s-xdocs/SKILL.md`;
- `prompts/write.md`;
- `prompts/update.md`;
- `prompts/agents.md`;
- `prompts/generate.md`.

Skill operations target both `.agents/skills/guiho-s-xdocs` and
`.claude/skills/guiho-s-xdocs`. Instruction operations use bounded managed
blocks, preserve every byte outside the block and its LF/CRLF convention, and
write replacements atomically. Only explicitly authorized `init` and `agent`
mutation actions change these resources. Welcome, help, version and data
commands do not bootstrap them or delete legacy documents.

The managed instruction block teaches agents to inspect the documentation
allowlist before writing. Applying it never adds frontmatter to `AGENTS.md` or
other ordinary Markdown and does not grant corpus write permission. The
explicit `init` agent bootstrap behavior is a setup exception.

The packaged 0.12.0 skill and `prompts/agents.md` still describe historical
legacy deletion/bare bootstrap. This source-only prerequisite changes no
artifact or release version. Use this README, [DOCS.md](DOCS.md), current
command help and GUIHO Convention 0011 for the new runtime boundary; refreshing
release-pinned agent resources remains separately gated work.

## Updates and upgrades

Only the argument- and flag-free welcome reads the local update cache and may
start a bounded detached worker; it performs no foreground network request.
Routine data/help/version commands do neither. Explicit `upgrade` commands
resolve `xdocs/vX.Y.Z` releases, verify SHA-256, replace atomically on Unix, and
stage replacement after process exit on Windows. Ownership-safe leases prevent
duplicate background workers, upgrade locks prevent concurrent replacements,
and the next argument- and flag-free welcome reports the final result of a detached Windows
replacement.

## Release

Mirror uses Git as its only version source and output. Tags are
`xdocs/vX.Y.Z`. A release contains exactly:

- eight native executables;
- `guiho-s-xdocs.zip`;
- `guiho-i-xdocs.md`;
- `checksums.txt`.

See [DOCS.md](DOCS.md) for the full contract.
