---
name: xdocs-readme
purpose: Introduce xdocs and provide its primary installation and usage guide.
description: Public overview of the native Go XDocs CLI, structured-documentation model, commands, configuration, agents, upgrades, and releases.
created: 2026-06-01
owner: xdocs-package
flags: []
tags:
  - readme
  - cli
  - documentation
keywords:
  - xdocs install
  - xdocs Go
  - Cobra
---

# xdocs

xdocs is a native Go CLI for structured repository documentation. It discovers
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
Hello Windows - xdocs v0.8.0
```

```bash
xdocs init
xdocs scan
xdocs tree
xdocs doctor
```

`xdocs init` creates `xdocs.yaml` and `XDOCS.md`, then installs the skill
globally by default. Use `xdocs init --local` for project-local skill targets.

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
  mode: prompt
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

Unknown configuration fields, multiple YAML documents, unsupported descriptor
extensions, invalid AI modes, and invalid exclusion entries fail explicitly.

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

Plain sibling Markdown files must be declared in `documents` and have
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
blocks and preserve every byte outside the block.

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
