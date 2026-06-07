# GUIHO XDocs Changelog

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
