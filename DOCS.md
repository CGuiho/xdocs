---
name: xdocs-documentation
purpose: Provide the complete user and contributor reference for xdocs.
description: Canonical documentation for the Go CLI, descriptors, YAML configuration, command catalog, agents, updates, upgrades, CI, and releases.
created: 2026-06-07
owner: xdocs-package
flags: []
tags:
  - documentation
  - cli
  - api
keywords:
  - xdocs
  - Go
  - Cobra
  - agent resources
---

#### &copy; 2026 [GUIHO](https://guiho.co) as represented by [Cristóvão GUIHO](https://guiho.co/cguiho) All Rights Reserved.

# xdocs Documentation

## Purpose

xdocs gives humans and agents a deterministic map of a repository through one
root `XDOCS.md`, one named `*.xdocs.md` descriptor per documented directory, and
declared companion Markdown documents. Discovery is read-only and complete;
descriptor and ordinary Markdown writes require explicit project policy.

The active implementation is a native Go CLI. The historical TypeScript tree
is retained as migration reference only and is not used by the executable,
installers, CI, versioning, or releases.

## Upgrading to 0.12.0

This minor release contains breaking authorization and report-output changes.
Existing configurations remain loadable, but omitted documentation grants now
mean no descriptor maintenance or companion metadata requirement. Explicitly
list permitted subtrees in `documentation.directories`; grant ordinary Markdown
headers separately with `documentation.frontmatter`. Existing legacy denials
still take precedence. Do not add grants merely to make validation pass.

Keep context in one named descriptor per directory. `tree` now uses filesystem
containment and includes all discovered descriptors; use `doctor` for semantic
parent/child validation. Report output cannot target descriptor filenames and
must pass destination and content validation. Use `meta --existing-frontmatter`
or `doctor --existing-frontmatter` to audit historical headers without repairs.

## Runtime architecture

- Go module: `github.com/CGuiho/xdocs`
- Toolchain: Go 1.26.5, language floor Go 1.23
- Command router: Cobra
- YAML: `go.yaml.in/yaml/v3`
- External contracts: typed structs plus semantic validation
- Runtime services: Go standard library
- Release mode: `CGO_ENABLED=0`

`main.go` embeds resources and build metadata. `cmd/` owns the one public
command tree. `internal/config`, `internal/xdocs`, `internal/agent`,
`internal/update`, `internal/upgrade`, and `internal/release` own focused
runtime services.

## Plain-invocation bootstrap

A successful invocation with no arguments or flags performs a local,
filesystem-only agent bootstrap before printing the beautiful borderless hello
window (two blank lines before and after the window) using the five-tone earth
palette (`#7F5539`, `#A68A64`, `#EDE0D4`, `#656D4A`, `#414833`):

1. preflight the current repository's selected instruction files and reject
   malformed, duplicated, noncanonical, or out-of-order XDocs markers;
2. install or refresh the embedded `guiho-s-xdocs` skill atomically in both
   `~/.agents/skills/guiho-s-xdocs` and
   `~/.claude/skills/guiho-s-xdocs`;
3. reconcile the bounded instruction block in both `AGENTS.md` and `CLAUDE.md`
   when both exist, the existing one when only one exists, or a newly created
   `AGENTS.md` when neither exists; and
4. preserve unmanaged bytes, file mode, and the selected file's LF or CRLF
   convention.

Already-current skill and instruction files are not rewritten. Marker
preflight occurs before global skill mutation, so malformed repository state
returns exit category `5` without a partial bootstrap. Help, version,
developer-help, init, data, explicit agent, upgrade, uninstall, and hidden
worker commands do not enter this bootstrap path. Bootstrap does not load
configuration or scan, generate, merge, or otherwise mutate the documentation
corpus.

## Configuration

Resolution is explicit, project, then global:

1. `--config <path>`;
2. `./xdocs.yaml`;
3. `~/.guiho/xdocs/xdocs.yaml`.

No implicit merge occurs. The decoder uses `KnownFields(true)`, rejects
multiple YAML documents, and then validates:

- `schema` is `1`;
- the only descriptor extension is `.xdocs.md`;
- `ai.mode` defaults to `auto` and accepts only `auto` or `prompt`;
- `documentation.directories` defaults to an empty list and contains only
  repository-relative literal directory paths;
- `documentation.frontmatter` defaults to an empty list and each rule contains
  a repository-relative `pattern` and `kind` of `file` or `directory`;
- `ignore.gitignore` defaults to `true`;
- each `ignore.rules` entry has a non-empty, syntactically valid,
  repository-relative forward-slash glob, `kind` set to `file` or `directory`,
  and `frontmatter` explicitly set to `false`;
- exclusions are non-empty directory names;
- project name is a string.

Global state and update cache live under `~/.guiho/xdocs/`.

In `auto` mode, agents make already-authorized documentation changes in the
same work unit. In `prompt` mode, agents announce those changes and wait for
confirmation. `ai.mode` controls timing only and never expands authorization.

`documentation.directories` grants descriptor maintenance for each listed
directory and its non-excluded descendants. `.` grants the complete
non-excluded project; `[]` grants none. `xdocs init` writes the empty defaults
and does not populate this allowlist. Discovery, metadata reads, tree output,
and health checks remain available for every non-excluded directory regardless
of the allowlist.

`documentation.frontmatter` grants ordinary Markdown frontmatter only when a
rule's `pattern` and `kind` match a document and the document is below an
authorized directory. A matching legacy `ignore.rules` entry with
`frontmatter: false` is an explicit denial and always wins. A plain Markdown
file can therefore remain listed in its descriptor's `documents` map without
frontmatter; missing headers are valid unless both opt-ins match.

The default ignore contract is:

```yaml
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
```

When `gitignore` is enabled, root and nested `.gitignore` files exclude matching
files and directories from counts, discovery, descriptor metadata projections,
list, meta, context, and doctor. Matching supports Git-style comments,
negation, directory-only patterns, `*`, `?`, character classes, and `**`
without adding an external runtime dependency.

Ignore-rule patterns are repository-relative forward-slash globs. A pattern
without `/` matches a basename at any depth. A `directory` rule applies to all
descendant Markdown files and may use an optional trailing `/` for clarity.
Malformed globs fail configuration loading. `frontmatter: false` does not exclude a document:
the file stays discovered, must remain in its descriptor's `documents` map,
appears in list/meta/context results, and is reported as valid without reading
or validating frontmatter. Any explicit rules list replaces the presets;
`ignore.rules: []` removes them without adding replacements.

For example, a `cloud.md` file and every Markdown document below a selected
directory can opt out while remaining tracked:

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

## Descriptor contract

Descriptors require:

- `subject`: non-empty stable identifier;
- `description`: non-empty module summary;
- `parent`: parent subject or `null`;
- `children`: subject list;
- `files`: sibling filename-to-description map;
- `documents`: sibling Markdown filename-to-description map;
- `tags`, `keywords`, and `flags`: string arrays;
- optional `status`.

The root `XDOCS.md` has no frontmatter and is the single special project index.
A new directory descriptor should use the directory name, such as
`technologies/technologies.xdocs.md`. A bare `.xdocs.md` filename and legacy
`.docs.md` files are invalid. Multiple named descriptors in one directory are
invalid. The descriptor body carries useful directory context; xdocs does not
create a separate summary or detail file for it. Every plain sibling Markdown
document not excluded by `.gitignore` must be declared, and every declared
non-excluded document must exist.

Companion documents require `name`, `purpose`, `description`, `created`
(`YYYY-MM-DD`), `owner`, `flags`, `tags`, and `keywords` only when an explicit
`documentation.frontmatter` rule and an authorized directory match. The
`owner` must equal the owning descriptor subject when frontmatter is required.
Missing frontmatter is valid otherwise. The default legacy `ignore.rules`
denials protect `AGENTS.md`, `README.md`, and `CLAUDE.md`; XDocs leaves those and
other ordinary Markdown bodies and headers unchanged unless the project has
explicitly authorized the exact scope.

## Command catalog

### Project setup and coverage

- `init [--local]` creates missing root files and installs the embedded skill.
- `scan` reports non-excluded descriptor and companion-document coverage and,
  in verbose output, identifies documents whose frontmatter is not required.
- `doctor [path]` validates descriptors, authorized companion metadata, tree
  links, and documented files. `--existing-frontmatter` audits malformed
  headers that already exist on otherwise non-required Markdown without
  requiring ownership or writing repairs. `--warnings-as-errors` promotes
  warnings.

### Documentation views

- `generate [path]` renders a project or module report.
- `merge [path]` combines descriptors with source markers.
- `tree` renders the complete deepest containment hierarchy as text, Markdown,
  or JSON, including the special root index and diagnostically available
  descriptor paths.
- `list [path]` lists documented files and companion documents.

### Agent context

- `meta [path]` reads frontmatter only. `--documents` reads companion
  frontmatter when it is required and tracks ordinary Markdown with
  `frontmatterRequired: false`; `--existing-frontmatter` implies
  `--documents`, audits every discovered ordinary Markdown file in scope
  (including unlisted and descriptorless files), and returns those audited
  documents in the top-level `documents` JSON array and matching text/Markdown
  sections. Missing headers remain valid; existing headers are checked for
  generic YAML object structure without imposing the companion owner schema.
  `--owner`, `--tag`, and `--keyword` filter before full reads.
- `context <query> [path]` tokenizes a query, applies stable weighted ranking,
  and returns the smallest useful descriptor/file/document reading set.
  `--explain` includes match reasons.

### Agent resources

- `agent skill install|uninstall|update|list|show`
- `agent instruction apply|remove|update|show`
- `agent prompt list|show`

Skill mutations default global and write atomically to both supported tool
paths. `--local` chooses project scope. Instruction apply/update/remove is
idempotent, preserves unmanaged content and line endings, and refuses malformed
managed markers. The plain-invocation bootstrap uses the same embedded sources
and mutation services; explicit agent commands remain available for deliberate
management. These setup operations do not grant permission to edit the
documentation corpus or add frontmatter to agent instruction files.

### Upgrade and uninstall

- `upgrade [--version X.Y.Z] [--dry-run]`
- `upgrade check`
- `upgrade list [--page N] [--size N]`
- `uninstall [--dry-run]`

Release discovery accepts only `xdocs/vX.Y.Z`. The list is SemVer-sorted before
pagination, defaults to eight entries, and retains full machine-readable
metadata in JSON. Direct upgrade uses the linker-embedded build target so ARMv6
and ARMv7 remain distinct.

All scan, meta, context, and doctor operations are read-only. Without
`--output`, tree discovery is also read-only. `generate`, `merge`, and `tree`
write nothing unless the user supplies one exact `--output` path. That path authorizes only the requested report; it cannot
authorize descriptor or companion metadata changes, and a descriptor-shaped
destination is rejected. Output validation runs before replacement so a rejected
destination retains its original bytes. No command creates extra summary,
companion, or index files as a side effect.

## Help and output

Every command supports:

- `-h`, `--help`;
- `--help-tree`;
- `--help-tree-depth <positive-integer>`;
- `--help-docs`.

Only root defines `-v`/`--version`; no other short aliases exist. Tree and
Markdown help traverse the live Cobra tree.

Text results use stdout and diagnostics use stderr. JSON mode emits exactly one
JSON document and excludes notices, progress, and ANSI decoration.

Exit categories are:

- `0`: success;
- `1`: unexpected or operational failure;
- `2`: usage or validation;
- `3`: configuration;
- `4`: remote release or network;
- `5`: installation, upgrade, or filesystem mutation;
- `130`: interruption.

## Update cache

Startup reads only local cache state. A newer-version notice is printed only
when the cache is valid and contains a genuinely newer version. A hidden,
detached, recursion-protected worker performs a finite-time release request and
atomically replaces the cache. Leases coalesce concurrent starts and stale
leases are recoverable. Each lease has an ownership token, and stale takeover
is serialized by a crash-released operating-system file lock so an old worker
cannot remove a newer worker's lease.

## Installation and upgrade safety

The Bash and PowerShell installers:

1. resolve a stable `xdocs/vX.Y.Z` release;
2. distinguish supported OS and CPU targets;
3. display target metadata and download URLs;
4. download the binary, checksum manifest, skill ZIP, and instruction asset;
5. verify SHA-256 for every installed or reconciled payload;
6. preflight the exact candidate version and both skill metadata versions;
7. stage the executable and both skill destinations transactionally;
8. reconcile instructions, creating `AGENTS.md` when needed;
9. execute an exact final `xdocs --version` check and roll back on failure.

Unix upgrades write beside the destination, verify, rename, smoke-test, and
roll back on failure. Windows upgrades copy a helper, wait for the current
process to exit, replace, verify, restore on failure, and clean up.
Concurrent upgrades are rejected by a token-owned lock. A detached Windows
helper writes an atomic result journal containing verification, rollback, and
recovery information; the next ordinary command reports and clears it.

## Build and release

`devops/build-binaries.go` produces exactly:

- `xdocs-linux-amd64` (`GOAMD64=v1`);
- `xdocs-linux-arm64` (`GOARM64=v8.0`);
- `xdocs-linux-armv7` (`GOARM=7`);
- `xdocs-linux-armv6` (`GOARM=6`);
- `xdocs-darwin-amd64` (`GOAMD64=v1`);
- `xdocs-darwin-arm64` (`GOARM64=v8.0`);
- `xdocs-windows-amd64.exe` (`GOAMD64=v1`);
- `xdocs-windows-arm64.exe` (`GOARM64=v8.0`);
- `guiho-s-xdocs.zip`;
- `guiho-i-xdocs.md`;
- `checksums.txt`.

All executable builds use `CGO_ENABLED=0`, `-trimpath`, and linker metadata for
version, commit, build date, and target. AMD64 V2/V3/V4 and unsupported
platforms are not published by default.

## Versioning and GitHub publishing

Mirror configuration is Git-native:

```yaml
project:
  name: xdocs
version:
  source: git
  output:
    - git
git:
  tag_template: "{name}/v{version}"
```

`package.json` and `jsr.json` are not version sources or outputs. Publish CI
triggers only on `xdocs/v*`, contains no manual approval environment, extracts
only the exact version section from `CHANGELOG.md`, publishes exactly eleven
assets, verifies exact equality, and runs the tag-pinned public installer.

## Contributor validation

```bash
gofmt -w main.go cmd internal devops
go mod tidy
go test ./...
go vet ./...
go run ./devops/build-binaries.go \
  --version 0.11.0 \
  --commit "$(git rev-parse HEAD)" \
  --build-date "2026-08-23T00:00:00Z"
```

Cross-compilation proves buildability, not foreign runtime behavior. Native CI
smoke tests are required where matching runners exist.
