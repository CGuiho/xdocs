# GUIHO XDocs Changelog

## 0.1.4

- Add the `guiho-as-xdocs` agent skill, bundled in the package and embedded in the CLI binary.
- Add the `xdocs agents` command: `install <local|global> [--tool <agents|claude|all>]` and `instructions`.
- `xdocs init` now installs the skill and writes a skill-aware xdocs section into `AGENTS.md`.
- Add the `[agents]` config section (`auto_agents_md`, `auto_skill_install`, `skill_tool`) and config-gated automation that keeps the `AGENTS.md` section fresh and installs the global skill when missing.
- Default to the standard target (`AGENTS.md` + `.agents/skills`); the non-standard Claude target (`.claude/skills`) is used only when requested via `--tool` or detected (`.claude/` or `CLAUDE.md`).
