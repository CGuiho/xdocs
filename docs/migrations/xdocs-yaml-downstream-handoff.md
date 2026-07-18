---
name: xdocs YAML Downstream Migration Handoff
purpose: Identify GUIHO repositories that must replace xdocs.config.toml with xdocs.yaml after the RFC 0034 breaking release.
description: Point-in-time repository inventory and exact consumer migration guidance.
created: 2026-07-18
owner: xdocs-migrations
flags:
  - breaking-change
tags:
  - migration
  - xdocs
keywords:
  - xdocs.yaml
  - downstream consumers
  - breaking change
---

# xdocs YAML Downstream Migration Handoff

## Required consumer change

For every path below:

1. rename `xdocs.config.toml` to `xdocs.yaml`;
2. translate `schema`, `extensions.supported`, `ai.mode`, `scan.exclude`, and
   `project.name` to YAML;
3. delete any `agents` section;
4. replace old CLI examples with the singular `xdocs agent` namespace;
5. run the new local/source xdocs command:

   ```bash
   xdocs meta . --documents --strict
   xdocs tree
   xdocs doctor .
   ```

No compatibility reader exists. This handoff is informational; consumer
repositories were not modified by the xdocs implementation task.

## Inventory

Point-in-time scan of `C:\GUIHO` on 2026-07-18 found:

```text
account-ui/xdocs.config.toml
arrow-app/xdocs.config.toml
auth/xdocs.config.toml
brain/xdocs.config.toml
cg/xdocs.config.toml
cristo/xdocs.config.toml
cookie/xdocs.config.toml
drive/xdocs.config.toml
guiho/xdocs.config.toml
guiho-admin-core/xdocs.config.toml
guiho-admin-ui/xdocs.config.toml
guiho-cloud/xdocs.config.toml
guiho-core/xdocs.config.toml
guiho-db/xdocs.config.toml
guiho-linux/xdocs.config.toml
guiho-main/xdocs.config.toml
guiho-ui/xdocs.config.toml
helm/xdocs.config.toml
identity/xdocs.config.toml
janitor/xdocs.config.toml
kitadi40/xdocs.config.toml
liga40/xdocs.config.toml
liga40-admin-ui/xdocs.config.toml
liga40-core/xdocs.config.toml
liga40-main/xdocs.config.toml
liga40-redirect-core/xdocs.config.toml
liga40-ui/xdocs.config.toml
logger/xdocs.config.toml
luisa/xdocs.config.toml
maria/xdocs.config.toml
mirror/xdocs.config.toml
nante40/xdocs.config.toml
nante40-core/xdocs.config.toml
nante40-main/xdocs.config.toml
nante40-ui/xdocs.config.toml
organization-ui/xdocs.config.toml
razura40/xdocs.config.toml
razura40-cloud/xdocs.config.toml
razura40-core/xdocs.config.toml
razura40-ui/xdocs.config.toml
rd-0003-arrow-elysia/xdocs.config.toml
rd-0004-remix/xdocs.config.toml
red-carpet/xdocs.config.toml
remix-v3-alpha/xdocs.config.toml
rrpl/xdocs.config.toml
sensacional/xdocs.config.toml
soneca40/xdocs.config.toml
soneca40-cloud/xdocs.config.toml
soneca40-ui/xdocs.config.toml
stored/xdocs.config.toml
superiority/xdocs.config.toml
suraia/xdocs.config.toml
time/xdocs.config.toml
turmab40/xdocs.config.toml
turmab40-core/xdocs.config.toml
turmab40-core/core/xdocs.config.toml
turmab40-main/xdocs.config.toml
turmab40-ui/xdocs.config.toml
web40/xdocs.config.toml
web40-landing/xdocs.config.toml
web40-ui/xdocs.config.toml
xawande40/xdocs.config.toml
xforty/xdocs.config.toml
```

RunX and Mirror also appeared in the scan, but they are being migrated in their
own RFC 0034 implementation work and remain independently owned.

## Coordination

Future execution should be staged through the GUIHO root TODO and then applied
repository by repository after reading each local `AGENTS.md`.
