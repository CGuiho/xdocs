#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# GUIHO XDocs

XDocs is a native Go CLI for structured repository documentation. It discovers
named `*.xdocs.md` descriptors, validates companion Markdown metadata, renders
containment trees, recommends minimal reading sets, and reports documentation
health issues.

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

A plain argument-free invocation first ensures the embedded
`guiho-s-xdocs` skill is current in both global agent locations and reconciles
the bounded XDocs instruction block in the current repository. It updates both
`AGENTS.md` and `CLAUDE.md` when both exist, the one that exists otherwise, or
creates `AGENTS.md`. Repeating the invocation leaves already-current files
untouched. Malformed managed markers are refused instead of guessed at.

```bash
xdocs init
xdocs scan
xdocs tree
xdocs doctor
```

`xdocs init` creates `xdocs.yaml` when it is missing, then installs the skill
globally by default. Use `xdocs init --local` for project-local skill targets.
Every user-facing invocation removes a legacy `XDOCS.md` from the effective
project directory before performing its requested behavior. Configuration
lives in `xdocs.yaml`; named `*.xdocs.md` descriptors own documentation
metadata.

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

`ai.mode` defaults to `auto`. The supported modes are `auto`, which makes
relevant documentation changes in the same work unit, and `prompt`, which
announces needed documentation changes and waits for confirmation.

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

Each documented module directory has exactly one named descriptor:

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

Every non-excluded plain sibling Markdown file must be declared in `documents`.
Unless a matching ignore rule sets `frontmatter: false`, it must have
frontmatter containing `name`, `purpose`, `description`, `created`, `owner`,
`flags`, `tags`, and `keywords`.

## Commands

- `xdocs init [--local]`
- `xdocs scan`
- `xdocs generate [path] [--output <path>]`
- `xdocs merge [path] [--output <path>]`
- `xdocs tree [--output <path>]`
- `xdocs list [path]`
- `xdocs meta [path] [--documents] [--strict]`
- `xdocs context <query> [path] [--documents] [--files]`
- `xdocs doctor [path] [--no-documents] [--warnings-as-errors]`
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
write replacements atomically. The plain root invocation is the shared
bootstrap boundary; help, version, data commands, explicit agent management,
upgrade, and uninstall do not run bootstrap. Legacy `XDOCS.md` cleanup occurs
before this distinction; bootstrap never scans or changes named descriptors or
companion documents.

## Updates and upgrades

Ordinary commands perform no foreground network request. They read a validated
local cache and start a bounded detached worker. Explicit `upgrade` commands
resolve `xdocs/vX.Y.Z` releases, verify SHA-256, replace atomically on Unix, and
stage replacement after process exit on Windows. Ownership-safe leases prevent
duplicate background workers, upgrade locks prevent concurrent replacements,
and the next invocation reports the final result of a detached Windows
replacement.

## Release

Mirror uses Git as its only version source and output. Tags are
`xdocs/vX.Y.Z`. A release contains exactly:

- eight native executables;
- `guiho-s-xdocs.zip`;
- `guiho-i-xdocs.md`;
- `checksums.txt`.

See [DOCS.md](DOCS.md) for the full contract.
