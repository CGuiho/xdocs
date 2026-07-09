
# GUIHO XDocs Documentation

## Files
  - [XDOCS.md](XDOCS.md): The root documentation file for the project. Describes all files and directories at this level, their purpose, and how they relate to each other. This is the file you are reading now.
  - [AGENTS.md](AGENTS.md): Instructions for AI agents working in this repository. Contains commands, CLI behavior, gotchas, and conventions that agents must follow.
  - [README.md](README.md): The public-facing project README. Describes what xdocs is (as a versioning CLI/library), installation, CLI commands, API reference, and configuration.
  - [BRAINSTORM.md](BRAINSTORM.md): The brainstorming document for the project. Contains the vision, problem statement, and early design thinking for xdocs and its areas (code, work, startup).
  - [CHANGELOG.md](CHANGELOG.md): The changelog tracking released versions and what changed in each release.
  - [TECHNICAL.md](TECHNICAL.md): Technical notes and implementation details for the project.
  - [ARCHITECTURE.md](ARCHITECTURE.md): Architecture and technical decisions for the project. Covers file format, CLI design, configuration schema, and all structural choices.
  - [TODO.md](TODO.md): The task list tracking outstanding work items for the project.
  - [DESCRIPTION.md](DESCRIPTION.md): The full description of the project.
  - [xdocs.xdocs.md](xdocs.xdocs.md): The package-root xdocs descriptor for `@guiho/xdocs`; this repository root is the package root.
  - [package.json](package.json): npm package metadata, scripts, package exports, and CLI bin mapping.
  - [jsr.json](jsr.json): JSR package metadata and publish include list.
  - [mirror.config.toml](mirror.config.toml): GUIHO Mirror versioning and release configuration.

## Directories
  - [source/](source/): TypeScript source for the xdocs library, CLI, commands, config, discovery, metadata, tree, prompt, and agent behavior.
  - [scripts/](scripts/): Package-manager launcher and install helper for native binary execution.
  - [devops/](devops/): DevOps install scripts and release binary build tooling.
  - [prompts/](prompts/): Prompt templates loaded by the CLI and embedded into native binaries.
  - [skills/](skills/): Bundled `guiho-s-xdocs` agent skill shipped with the package.
  - [docs/](docs/): Durable project documentation, design notes, and decision records.
  - [.github/](.github/): GitHub-specific configuration (workflows, issue templates, etc.).
  - [.vscode/](.vscode/): VS Code workspace settings and configurations.
