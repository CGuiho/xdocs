# GUIHO XDocs Changelog

## Unreleased

- Fix bare `xdocs` invocations so they run config-gated agent automation before printing help, installing or refreshing the global `guiho-s-xdocs` skill and removing legacy `guiho-as-xdocs` installs when configured.

## 0.3.0

- Stabilize the 0.3.0 release line, including native binary distribution, direct installers, package-manager native binary installation, and Bun-native TOML/YAML parsing.
- Ship the renamed `guiho-s-xdocs` agent skill with versioned frontmatter, automatic refresh from the bundled package copy, and legacy `guiho-as-xdocs` cleanup.
- Refresh README guidance and regression coverage for the stable release.

## 0.3.0-alpha.2

- Rename the bundled xdocs agent skill from `guiho-as-xdocs` to `guiho-s-xdocs` and add a frontmatter `version` field.
- Refresh installed skills from the bundled package copy, removing legacy `guiho-as-xdocs` skill directories and replacing stale `guiho-s-xdocs` installs when version or content differs.
- Keep `[agents].auto_skill_install` defaulted to `true` and run global skill refresh during config-gated command automation.
- Update the TypeScript API, tests, help text, README, architecture notes, AGENTS guidance, and canonical `DOCS.md` for the renamed skill behavior.

## 0.3.0-alpha.1

- Remove external parser dependencies (`smol-toml`, `yaml`) and use Bun-native `Bun.TOML.parse` and `Bun.YAML.parse` instead.
- Change the package-manager `xdocs` bin to point at a native binary path and add a `postinstall` downloader that installs the matching GitHub Release binary into `bin/xdocs.exe`; Node.js is used only during install by Node-based package managers, not at `xdocs` runtime.
- Update build configuration to include Bun types for the library build.
- Document the native package-manager install path and Bun-native parser behavior.

## 0.3.0-alpha.0

- Add native-binary-first distribution support for xdocs, including a Bun-powered release binary matrix for Linux x64/arm64, macOS x64/arm64, and Windows x64.
- Add direct installers (`install.sh` and `install.ps1`) so users can install the native `xdocs` binary without requiring Node.js or Bun at runtime.
- Add a native binary entrypoint that embeds prompts, the `guiho-as-xdocs` skill, and package version metadata so compiled binaries work without adjacent package files.
- Update CI and the publish workflow to build the release binary matrix and publish native binaries as GitHub Release assets while keeping npm publishing intact.
- Document the native binary distribution model in `DOCS.md`, `README.md`, `ARCHITECTURE.md`, and `AGENTS.md`.
- Add xdocs metadata files for the package root, source module, and devops module.

## 0.2.3

- `xdocs agents instructions` and config-gated AGENTS.md automation now tolerate formatter-only blank lines and trailing whitespace inside the managed xdocs block, preserving the user's formatted block when the actual text is unchanged.
- Update the managed AGENTS.md xdocs block wording to match the current repository model: one root `XDOCS.md` index and package/application root `.xdocs.md` files.

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
