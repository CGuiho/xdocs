---
name: xdocs-readme
purpose: Introduce xdocs and provide its primary installation and usage guide.
description: Public overview of the RFC 0034 xdocs library, native CLI, configuration, commands, and distribution model.
created: 2026-06-01
owner: xdocs-package
flags: []
tags:
  - readme
  - cli
  - documentation
keywords:
  - xdocs install
  - xdocs usage
  - RFC 0034
---

# xdocs

`@guiho/xdocs` is a Bun-first structured-documentation library and native CLI
for codebases and AI agents. It discovers named `*.xdocs.md` descriptors,
companion Markdown metadata, containment trees, minimal reading sets, and
documentation health issues.

The CLI follows GUIHO RFC 0034: strict ESM TypeScript, raw Citty, TypeBox
runtime validation, YAML configuration, native binaries, Developer Context
help, explicit agent resources, background update caching, transactional
upgrades, and fourteen release assets.

## Install

### Native installer

```powershell
irm https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.ps1 -OutFile $env:TEMP\xdocs-install.ps1
& $env:TEMP\xdocs-install.ps1
```

```bash
curl -fL https://raw.githubusercontent.com/CGuiho/xdocs/main/devops/install.sh -o /tmp/xdocs-install.sh
bash /tmp/xdocs-install.sh
```

Both installers select the native binary, show download progress, configure
the global binary directory in `PATH`, download and validate
`guiho-s-xdocs.md` and `guiho-i-xdocs.md`, install the skill into both
`~/.agents/skills` and `~/.claude/skills`, and reconcile project instructions.
Executable or otherwise invalid Markdown agent payloads are rejected before
either `SKILL.md` is written.

### npm bootstrap

```bash
npm install --global @guiho/xdocs
```

The npm package ships a small Node-compatible bootstrap. It downloads, caches,
and delegates to the matching native binary. It contains no xdocs domain logic
and does not require Bun to be preinstalled.

## Start

```bash
xdocs
# Hello Windows - xdocs v<version>

xdocs init
xdocs scan
xdocs tree
xdocs doctor
```

`xdocs init` creates `XDOCS.md` and `xdocs.yaml`. Agent files are never mutated
implicitly; use the explicit `xdocs agent` commands.

## Configuration

Configuration is YAML only and resolves in this exact order:

1. `--config <path>`
2. `./xdocs.yaml` under the effective `--cwd`
3. `~/.guiho/xdocs/xdocs.yaml`

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
project:
  name: example
```

When loaded, xdocs reports:

```text
configuration file loaded: /absolute/path/xdocs.yaml
```

Global configuration and update state live only under `~/.guiho/xdocs/`.

## Commands

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
│   ├── skill install|uninstall|update|list|show
│   ├── instruction apply|remove|update|show
│   └── prompt list|show
├── upgrade
│   ├── check
│   └── list
└── uninstall
```

Prompt IDs are `write`, `update`, `agents`, and `generate`:

```bash
xdocs agent prompt list
xdocs agent prompt list --names
xdocs agent prompt show write
```

Agent skill mutations default to global scope and always target both supported
tool directories. Add `--local` for project-local scope:

```bash
xdocs agent skill install
xdocs agent skill update --local
xdocs agent skill uninstall --local
```

Instruction actions operate idempotently on `AGENTS.md`, `CLAUDE.md`, both, or
create `AGENTS.md` when neither exists:

```bash
xdocs agent instruction apply
xdocs agent instruction update
xdocs agent instruction show
xdocs agent instruction remove
```

## Developer Context help

Every command scope supports:

```bash
xdocs <scope> --help
xdocs <scope> -h
xdocs <scope> --help-tree
xdocs <scope> --help-tree-depth 2
xdocs <scope> --help-docs
```

Root help renders the complete public command catalog; nested help renders the
selected subtree. Usage and Markdown help include examples from the same live
Citty definitions. Internal worker routing is hidden and `xdocs home` is not a
public command. Only `-h` and the root `-v` are short aliases.

## Upgrade

```bash
xdocs upgrade
xdocs upgrade --version 0.7.0 --arch x64 --variant baseline --dry-run
xdocs upgrade check
xdocs upgrade list --page 1 --per-page 30
xdocs upgrade list --pre-releases
```

The default x64 variant is `baseline`. Upgrades validate release metadata,
download and verify a native candidate, replace transactionally, roll back on
failure, update `~/.guiho/xdocs/cache.json`, refresh both global skill copies,
and reconcile project instructions.

## Development

```bash
bun install
bun run typecheck
bun test
bun run build
bun run bundle
bun run binary
bun run binaries
```

`bun run binaries` produces exactly twelve native assets plus
`guiho-s-xdocs.md` and `guiho-i-xdocs.md`. Darwin assets use `darwin`; only
Windows binaries use `.exe`.

See [DOCS.md](DOCS.md) for the complete command and library contract and
[ARCHITECTURE.md](ARCHITECTURE.md) for implementation boundaries.
