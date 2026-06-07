# GUIHO XDocs Changelog

## 0.2.2

- Fix: the published library crashed under Node (`ERR_UNKNOWN_FILE_EXTENSION` for `.md`) because the prompts and the `guiho-as-xdocs` skill were loaded with Bun-only text imports. They are now read from disk at runtime (`readFileSync` relative to `import.meta.url`), so the `xdocs` CLI and the library work under both Node and Bun.

## 0.2.1

- Clarify the repository model: a repository has exactly one `XDOCS.md` (no frontmatter) that indexes its packages and applications, and each package/application has its own root `.xdocs.md` (with frontmatter and `parent: null`) that tops its tree.
- `xdocs init` now scaffolds `XDOCS.md` as that frontmatter-less repo root index (with `## Packages` / `## Applications` sections).
- `xdocs scan` reports the root `XDOCS.md` as `[root index]` instead of `[incomplete]`.
- Update the `guiho-as-xdocs` skill and `DOCS.md` to describe the one-`XDOCS.md`-per-repo model.

## 0.2.0

- The `guiho-as-xdocs` skill now mandates **automatic xdocs maintenance**: an agent creates or updates a directory's `.xdocs.md` (purpose, files with their key functions/exports, and `parent`/`children` links) whenever it creates or changes a module, as part of the definition of done -- the user no longer has to ask. `[ai].mode` governs how docs are written, not whether.
- Add `DOCS.md`, the canonical full documentation for `@guiho/xdocs`, shipped in the package.
- `AGENTS.md` now requires updating `DOCS.md` before each release, written the same way as the changelog.

## 0.1.4

- Add the `guiho-as-xdocs` agent skill, bundled in the package and embedded in the CLI binary.
- Add the `xdocs agents` command: `install <local|global> [--tool <agents|claude|all>]` and `instructions`.
- `xdocs init` now installs the skill and writes a skill-aware xdocs section into `AGENTS.md`.
- Add the `[agents]` config section (`auto_agents_md`, `auto_skill_install`, `skill_tool`) and config-gated automation that keeps the `AGENTS.md` section fresh and installs the global skill when missing.
- Default to the standard target (`AGENTS.md` + `.agents/skills`); the non-standard Claude target (`.claude/skills`) is used only when requested via `--tool` or detected (`.claude/` or `CLAUDE.md`).
