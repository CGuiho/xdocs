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
version: "0.6.1"
metadata:
  version: "0.6.1"
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

Read `ai.mode` before writing documentation:

- `prompt`: announce the descriptors/documents that need updates and wait for
  confirmation;
- `auto`: make relevant documentation changes in the same work unit.

There are no configuration settings for automatic skill or instruction
mutation. Data commands never change agent files.

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

Same-directory ordinary Markdown files are companion documents. List them in
the descriptor `documents` map and give them frontmatter:

```yaml
---
owner: descriptor-subject
tags: []
keywords: []
---
```

## Workflow

1. Read `xdocs.yaml` and its `ai.mode`.
2. Use metadata-first discovery:

   ```bash
   xdocs context "<task>" [path] --documents --files --format json
   xdocs meta [path] --documents --format json
   ```

3. Read only the recommended descriptors, implementation files, and companion
   documents.
4. Make the implementation/documentation change.
5. Update the owning descriptor:
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
xdocs init
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

Every scope supports `-h`/`--help`, `--help-tree`,
`--help-tree-depth <positive-integer>`, and `--help-docs`. Root version uses
`-v`/`--version`.

## Agent resources

Skill mutations are explicit. They default to global scope and always target:

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
- Do not read whole repositories when metadata can select a smaller context.
- Do not run skill or instruction mutations implicitly.
- Do not treat invalid YAML/frontmatter as a partially usable shape.
- Do not publish packages, create releases, or apply version bumps unless the
  user explicitly authorizes them.

## Completion gate

- configuration and `ai.mode` were respected;
- every changed module has accurate descriptor metadata;
- companion documents are listed and owned;
- tree links are consistent;
- strict metadata and doctor checks pass for the touched scope;
- all documentation references use `xdocs.yaml` and the singular `agent`
  namespace.
