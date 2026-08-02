---
name: guiho-s-xdocs
purpose: Define the canonical agent workflow for xdocs structured documentation.
description: Use whenever creating, updating, scanning, merging, validating, or navigating xdocs structured documentation, XDOCS.md indexes, named *.xdocs.md descriptors, companion-document metadata, xdocs.yaml, or xdocs agent resources.
created: 2026-06-07
owner: xdocs-guiho-s-xdocs-skill
flags: []
tags:
  - agent-skill
  - structured-documentation
keywords:
  - guiho-s-xdocs
  - xdocs metadata
  - documentation workflow
version: "0.10.0"
metadata:
  version: "0.10.0"
---

# xdocs Structured Documentation

## When to use

Load this skill for:

- `XDOCS.md`;
- named `*.xdocs.md` descriptors;
- companion Markdown metadata;
- `xdocs.yaml`;
- `xdocs scan`, `generate`, `merge`, `tree`, `list`, `meta`, `context`, or
  `doctor`;
- explicit xdocs skill, instruction, or prompt operations.

## Read configuration first

xdocs uses YAML only. Resolve it in this order:

1. explicit `--config <path>`;
2. project `xdocs.yaml`;
3. `~/.guiho/xdocs/xdocs.yaml`.

Read `ai.mode` before writing documentation. The default is `auto`:

- `auto`: make relevant documentation changes in the same work unit.
- `prompt`: announce the descriptors/documents that need updates and wait for
  confirmation.

Read `ignore` before scanning or editing documentation:

- `ignore.gitignore` defaults to `true`; do not enter or document paths matched
  by root or nested `.gitignore` files.
- `ignore.rules` contains strict `pattern`, `kind`, and `frontmatter` fields.
  A `file` or `directory` match with `frontmatter: false` remains a tracked
  companion document, but never add, rewrite, require, or recommend YAML
  frontmatter for it.
- The default frontmatter opt-outs are `AGENTS.md`, `README.md`, and
  `CLAUDE.md` at any depth. Any explicit rules list replaces the presets; an
  empty list removes them without adding replacements.

There are no configuration settings for automatic skill or instruction
mutation. Data commands never change agent files. `xdocs init` is the setup
exception: it installs or refreshes the skill globally by default; pass
`--local` to keep it in the initialized project.

## Document model

One root `XDOCS.md` is the repository index and has no frontmatter.

Every documented package, application, or module uses exactly one named
`*.xdocs.md` descriptor in its directory. `.xdocs.md` by itself and `.docs.md`
are invalid.

Required descriptor frontmatter:

```yaml
---
subject: unique-subject
description: Clear module purpose.
parent: parent-subject-or-null
children: []
files:
  implementation.ts: What this file owns.
documents:
  guide.md: What this companion document explains.
tags: []
keywords: []
flags: []
status: stable
---
```

The tree represents containment, not dependencies. `parent` and `children`
must agree.

Same-directory ordinary Markdown files are companion documents. List every
non-excluded document in the descriptor `documents` map. Give it frontmatter
unless a matching ignore rule sets `frontmatter: false`:

```yaml
---
owner: descriptor-subject
tags: []
keywords: []
---
```

## Workflow

1. Read `xdocs.yaml`, its `ai.mode`, and its complete `ignore` policy.
2. Use metadata-first discovery:

   ```bash
   xdocs context "<task>" [path] --documents --files --format json
   xdocs meta [path] --documents --format json
   ```

3. Read only the recommended descriptors, implementation files, and companion
   documents.
4. Make the implementation/documentation change.
5. Update the owning descriptor without touching Git-ignored paths or adding
   frontmatter to opted-out documents:
   - add/remove/rename `files` entries;
   - add/remove/rename `documents` entries;
   - keep parent/children links synchronized;
   - refresh description, tags, keywords, flags, and status when behavior
     changed.
6. Validate the narrow touched scope:

   ```bash
   xdocs meta <scope> --documents --strict
   xdocs tree
   xdocs doctor <scope>
   ```

7. Widen validation only when the change affects repository-wide integrity.

## CLI catalog

```text
xdocs init [--local]
xdocs scan
xdocs generate [path]
xdocs merge [path]
xdocs tree
xdocs list [path]
xdocs meta [path]
xdocs context <query> [path]
xdocs doctor [path]
xdocs agent skill install|uninstall|update|list|show
xdocs agent instruction apply|remove|update|show
xdocs agent prompt list|show
xdocs upgrade
xdocs upgrade check
xdocs upgrade list
xdocs uninstall
```

Foreground commands read only `~/.guiho/xdocs/cache.json`. An expired cache may
start one short-lived detached update worker. The cache-scoped lease coalesces
simultaneous invocations, the entire remote check is bounded to 15 seconds, and
stale or orphaned leases recover after 30 seconds. Ownership tokens and a
crash-released operating-system acquisition lock ensure an old worker cannot
remove a newer lease and simultaneous stale takers elect exactly one owner. The
internal worker is a hidden Cobra command that bypasses ordinary startup notice
and scheduling behavior, so it cannot recursively launch another worker.

`xdocs upgrade list` always exhausts GitHub pagination before applying its
user-visible page. It defaults to `--page 1 --size 8`; size accepts positive
integers up to 100. Use its channel, full-tag, publication, compatible asset,
current, latest-stable, and pagination fields instead of treating one visible
page as the complete catalog.

Human text intentionally projects the complete catalog into the concise
`VERSION CHANNEL PUBLISHED CURRENT LATEST ASSET` table shared with RunX.
Markdown and JSON retain complete tags, timestamps, release/asset metadata, and
pagination; use a structured format whenever those details are required.

A bare invocation first idempotently ensures the embedded skill in both global
agent locations and the bounded XDocs instruction block in the current
repository, then prints the deterministic GUIHO XDocs welcome. It updates both
`AGENTS.md` and `CLAUDE.md` when both exist, whichever exists otherwise, or
creates `AGENTS.md`. It preserves unmanaged content and line endings, refuses
malformed managed markers, and does not scan or mutate the documentation
corpus. The foreground reads the cache and awaits only the local
lease-and-detached-spawn handoff. The remote request remains bounded and
detached. A notice is rendered only when a stable cached SemVer is newer than
the running version.

After any `xdocs upgrade` outcome, preserve the printed recovery block. Its
installer command is pinned to the resolved full version; its process-stop
command is separate. JSON callers must read the equivalent `recovery` object.
Download events include known-length percentage progress or unknown-length byte
progress; human output renders them and JSON retains the structured values.
Upgrade transactions are exclusive and use unique candidate/backup paths. On
Windows, `scheduled` means replacement is pending; the helper records exact
verification and rollback in a completion journal that the next ordinary
invocation reports and clears.

Every scope supports `-h`/`--help`, `--help-tree`,
`--help-tree-depth <positive-integer>`, and `--help-docs`. Root version uses
`-v`/`--version`.

## Agent resources

The plain argument-free invocation is the shared bootstrap exception. It
ensures the embedded skill globally at both targets below. Explicit skill
commands use the same targets by default:

```text
~/.agents/skills/guiho-s-xdocs
~/.claude/skills/guiho-s-xdocs
```

Use `--local` for the corresponding project directories.

Instruction actions manage the exact bounded block in `AGENTS.md`,
`CLAUDE.md`, both, or a newly created `AGENTS.md`:

```text
<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->
...
<!-- END XDOCS -->
```

Prompt IDs are `write`, `update`, `agents`, and `generate`:

```bash
xdocs agent prompt list --names
xdocs agent prompt show write
```

## Safety

- Do not edit generated build, bundle, binary, or vendor output manually.
- Do not invent descriptors for excluded/generated directories.
- Do not read, list, or validate Git-ignored paths when
  `ignore.gitignore: true`.
- Keep `frontmatter: false` documents listed and trackable, but never add,
  rewrite, require, or recommend YAML frontmatter for them.
- Do not read whole repositories when metadata can select a smaller context.
- Do not run skill or instruction mutations implicitly outside the documented
  plain-invocation bootstrap and explicit setup or agent-management actions.
- Do not treat invalid YAML/frontmatter as a partially usable shape.
- Do not publish packages, create releases, or apply version bumps unless the
  user explicitly authorizes them.

## Completion gate

- configuration and `ai.mode` were respected;
- `.gitignore` and explicit ignore/frontmatter rules were respected;
- every changed module has accurate descriptor metadata;
- companion documents are listed; required frontmatter is owned and opted-out
  documents were left untouched;
- tree links are consistent;
- strict metadata and doctor checks pass for the touched scope;
- all documentation references use `xdocs.yaml` and the singular `agent`
  namespace.
