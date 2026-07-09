# GUIHO XDocs Changelog

## 0.5.1

- Remove the GitHub Actions production approval gate from the native-binary publish workflow so patch releases can complete unattended.
- Print a first-run package-manager launcher notice before installing the native CLI binary so users know xdocs is downloading/installing instead of hanging.

## 0.5.0

- Add native CLI self-management with `xdocs upgrade`, `xdocs upgrade check`, `xdocs upgrade list`, and `xdocs uninstall`.
- Add non-blocking background update checks on bare `xdocs` invocations with a cached notice that tells users to run `xdocs upgrade` when a newer release is available.
- Add `--help-tree` and `--help-docs` for the root CLI and every command, generated from shared command metadata.
- Update the bundled `guiho-s-xdocs` skill to prefer the installed native `xdocs` CLI instead of Bun package execution.
- Track future JSON output-format improvements in `TODO.md` and `docs/todo/improve-json-output-coverage.md`.

## 0.4.10

- Remove Node-based GitHub Actions and npm/node commands from CI and native-binary publish workflows; checkout, Bun setup, binary release upload, and release verification now run through shell, Bun, git, and `gh`.

## 0.4.9

- Fix GitHub Actions artifact names for scoped package tags by using run IDs, allowing the native binary publish workflow to upload artifacts and continue to GitHub Release asset publication.

## 0.4.8

- Harden the direct Linux/macOS Bash installer and Windows PowerShell installer for native xdocs binaries, including baseline-first x64 fallback, explicit default/modern variants, downloaded binary validation, PATH setup, and shadowing warnings.
- Verify the 12-asset native binary matrix during `bun run binaries` for Linux, macOS, and Windows arm64/x64 baseline/default/modern outputs.
- Upload native binaries as CI workflow artifacts and publish/verify all 12 GitHub Release assets before npm publishing on version-tag releases.
- Document native binary installation, PATH fallback commands, and the full release asset matrix in `README.md` and `DOCS.md`.

## 0.4.0-alpha.0

- Change the documentation model to one named `*.xdocs.md` descriptor per documented directory, with `XDOCS.md` reserved as the frontmatter-less repository index.
- Add first-class same-directory Markdown companion documents through the required `documents` metadata map, and validate descriptor/document alignment during scan.
- Reject nameless `.xdocs.md` descriptors, reject non-`.xdocs.md` descriptor extensions, and flag multiple descriptors in one directory.
- Update `scan`, `list`, `generate`, and `merge` output to surface both implementation files and companion Markdown documents.
- Add required `keywords` metadata to xdocs descriptors, surface descriptor keywords in scan/generate/merge output, and document companion Markdown `keywords` frontmatter.
- Refresh the bundled `guiho-s-xdocs` skill, prompt templates, README, architecture notes, AGENTS guidance, canonical `DOCS.md`, and package xdocs descriptors for the new model.

## 0.3.1

- Fix bare `xdocs` invocations so they install or refresh the global `guiho-s-xdocs` skill before printing help, even without `xdocs.config.toml`, and remove legacy `guiho-as-xdocs` installs for that target.
- Change the package-manager `xdocs` bin to a shipped Bun launcher (`scripts/xdocs-bin.ts`) that installs the native binary on first run when needed, matching GUIHO Mirror's `bun x` behavior.

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
