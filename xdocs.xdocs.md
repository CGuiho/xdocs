---
subject: xdocs-package
description: Package root for the @guiho/xdocs CLI, native binary builders, prompts, skills, and TypeScript source.
parent: null
children:
  - xdocs-source
  - xdocs-devops
  - xdocs-scripts
  - xdocs-skills
  - xdocs-prompts
  - xdocs-docs
files:
  package.json: npm package metadata, CLI bin mapping, build/test scripts, and package publish file list.
  jsr.json: JSR package metadata and publish include list.
  tsconfig.json: Strict TypeScript settings for source development.
  tsconfig.build.json: Build-specific TypeScript settings for library output, including Bun and Node types.
  mirror.config.toml: GUIHO Mirror release/versioning configuration for package.json, jsr.json, and Git tag outputs.
documents:
  DOCS.md: Canonical full documentation for @guiho/xdocs; release artifact updated before publishing.
  LICENSE.md: Package license document shipped with @guiho/xdocs.
tags:
  - package
  - cli
  - documentation
keywords:
  - xdocs
  - cli
  - structured documentation
  - native binary
flags: []
status: stable
---

The `xdocs/` directory is the actual `@guiho/xdocs` package. It contains the
TypeScript implementation, package metadata, bundled prompt and skill resources,
package-manager launcher/install scripts, and Bun-native release binary
tooling. It is versioned by GUIHO Mirror using `mirror.config.toml`.
