---
subject: xdocs-guiho-s-xdocs-skill
description: Packaged guiho-s-xdocs agent skill that teaches AI agents how to maintain xdocs projects.
parent: xdocs-skills
children: []
files: {}
documents:
  SKILL.md: Versioned xdocs workflow skill defining xdocs.yaml configuration, named descriptors, legacy XDOCS.md cleanup, global-by-default initialization, plain-invocation agent bootstrap, descriptor maintenance, Cobra usage, bounded cache-leased update checks, metadata/context/doctor workflows, and observable verified upgrade/release-list behavior.
tags:
  - skills
  - agents
  - documentation
keywords:
  - xdocs skill
  - companion metadata
  - gitignore
  - frontmatter opt-out
  - metadata-only scan
  - context recommendations
  - doctor checks
  - agent workflow
  - native cli
  - Cobra
  - agent bootstrap
  - upgrade recovery
  - release catalog
  - background update worker
flags: []
status: stable
---

The `guiho-s-xdocs/` directory contains the bundled agent skill shipped with the
package. The installer treats `SKILL.md` as the source of truth and refreshes
installed copies when the bundled version or content changes.
The skill describes ordinary Citty-generated help and contextual usage errors,
while retaining extended `--help-tree` and `--help-docs` workflows.
The skill also documents Git-aware exclusions and strict file/directory rules
that keep selected companion documents tracked without frontmatter. For other
ordinary companion Markdown documents it requires `name`, `purpose`,
`description`, `created`, `flags`, `tags`, `keywords`, and `owner`. It includes
both the legacy top-level
`version` and `metadata.version`, which must stay aligned with the package
version during release preparation. The skill instructs agents to use
`xdocs context "<query>" --documents --files --format json` before opening broad
code/documentation, `xdocs meta [path] --documents --format json` before opening
full Markdown bodies, and `xdocs doctor` before finishing documentation-heavy
changes. It identifies `auto` as the default `ai.mode` and `prompt` as the
confirmation-gated alternative. It also instructs agents to use the installed
native `xdocs` CLI first, reserving Bun source execution for xdocs development
checkouts.
