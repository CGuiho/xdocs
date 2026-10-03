package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/CGuiho/xdocs/internal/config"
	"github.com/CGuiho/xdocs/internal/upgrade"
)

func execute(t *testing.T, args ...string) (string, string, error) {
	t.Helper()
	return executeWithRoots(t, t.TempDir(), t.TempDir(), args...)
}

func executeWithRoots(t *testing.T, cwd, home string, args ...string) (string, string, error) {
	t.Helper()
	t.Setenv("XDOCS_DISABLE_UPDATE_CHECK", "1")
	if os.Getenv("XDOCS_CACHE_DIR") == "" {
		t.Setenv("XDOCS_CACHE_DIR", t.TempDir())
	}
	var out, stderr bytes.Buffer
	root := NewRootCommand(Dependencies{
		In: bytes.NewBuffer(nil), Out: &out, Err: &stderr, Resources: agentTestResources(),
		WorkingDirectory: cwd, HomeDirectory: home,
	}, BuildInfo{Version: "0.8.0", Target: "xdocs-windows-amd64"})
	root.SetArgs(args)
	err := root.Execute()
	if err == errHelpRendered {
		err = nil
	}
	return out.String(), stderr.String(), err
}

func TestPriorUpgradeCompletionIsSurfacedOnStderrAndCleared(t *testing.T) {
	cache := t.TempDir()
	t.Setenv("XDOCS_CACHE_DIR", cache)
	path, err := upgrade.CompletionPath()
	if err != nil {
		t.Fatal(err)
	}
	if err := upgrade.WriteCompletion(path, upgrade.Completion{
		TargetVersion: "0.8.0",
		Outcome:       "succeeded",
		Verification:  "xdocs v0.8.0",
		Rollback:      "not required",
	}); err != nil {
		t.Fatal(err)
	}
	out, stderr, err := execute(t)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(out, "completed successfully") {
		t.Fatalf("upgrade completion contaminated stdout: %s", out)
	}
	if !strings.Contains(stderr, "completed successfully") {
		t.Fatalf("upgrade completion not surfaced on stderr: %q", stderr)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("upgrade completion was not cleared: %v", err)
	}
}

func TestPrePlanUpgradeFailureEmitsOneJSONRecoveryDocument(t *testing.T) {
	t.Setenv("XDOCS_DISABLE_UPDATE_CHECK", "1")
	t.Setenv("XDOCS_CACHE_DIR", t.TempDir())
	var out, stderr bytes.Buffer
	root := NewRootCommand(Dependencies{
		In: bytes.NewBuffer(nil), Out: &out, Err: &stderr, Resources: agentTestResources(),
	}, BuildInfo{Version: "0.8.0", Target: "invalid-build-target"})
	root.SetArgs([]string{"--format", "json", "upgrade", "--dry-run"})
	err := root.Execute()
	if err == nil {
		t.Fatal("invalid build target unexpectedly succeeded")
	}
	var result upgrade.Result
	if decodeErr := json.Unmarshal(out.Bytes(), &result); decodeErr != nil {
		t.Fatalf("upgrade failure did not emit one JSON document: %v\n%s", decodeErr, out.String())
	}
	if result.Outcome != "failed" || result.Recovery == "" || !strings.Contains(result.Recovery, "0.8.0") {
		t.Fatalf("upgrade failure lost recovery: %#v", result)
	}
}

func TestJSONCommandsEmitOneDocumentAndPreserveScanShape(t *testing.T) {
	root := t.TempDir()
	module := filepath.Join(root, "module")
	if err := os.MkdirAll(module, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "XDOCS.md"), []byte("# Root\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	descriptor := `---
subject: example
description: Example module.
parent: null
children: []
files: {}
documents:
  guide.md: Guide.
tags: []
keywords: [example]
flags: []
---
`
	if err := os.WriteFile(filepath.Join(module, "module.xdocs.md"), []byte(descriptor), 0o644); err != nil {
		t.Fatal(err)
	}
	companion := `---
name: Guide
purpose: Explain example.
description: Example guide.
created: 2026-07-24
owner: example
flags: []
tags: []
keywords: [example]
---
`
	if err := os.WriteFile(filepath.Join(module, "guide.md"), []byte(companion), 0o644); err != nil {
		t.Fatal(err)
	}

	out, _, err := execute(t, "--cwd", root, "--format", "json", "scan")
	if err != nil {
		t.Fatal(err)
	}
	var scan struct {
		XDocsFiles []struct {
			Path                string   `json:"path"`
			DiscoveredDocuments []string `json:"discoveredDocuments"`
		} `json:"xdocsFiles"`
		MarkdownDocuments []string `json:"markdownDocuments"`
	}
	if err := json.Unmarshal([]byte(out), &scan); err != nil {
		t.Fatalf("scan did not emit one JSON document: %v\n%s", err, out)
	}
	if len(scan.XDocsFiles) != 1 || scan.XDocsFiles[0].Path != "module/module.xdocs.md" {
		t.Fatalf("scan omitted named descriptor: %#v", scan.XDocsFiles)
	}
	if len(scan.XDocsFiles[0].DiscoveredDocuments) != 1 || scan.XDocsFiles[0].DiscoveredDocuments[0] != "module/guide.md" {
		t.Fatalf("scan discoveredDocuments shape drifted: %#v", scan.XDocsFiles[0])
	}
	if len(scan.MarkdownDocuments) != 2 || scan.MarkdownDocuments[0] != "XDOCS.md" || scan.MarkdownDocuments[1] != "module/guide.md" {
		t.Fatalf("scan markdownDocuments shape drifted: %#v", scan.MarkdownDocuments)
	}
	if content, err := os.ReadFile(filepath.Join(root, "XDOCS.md")); err != nil || string(content) != "# Root\n" {
		t.Fatalf("scan changed the legacy root index: content=%q err=%v", content, err)
	}

	for _, args := range [][]string{
		{"--cwd", root, "--format", "json", "generate"},
		{"--cwd", root, "--format", "json", "merge"},
		{"--cwd", root, "--format", "json", "meta", "--documents"},
		{"--cwd", root, "--format", "json", "context", "example", "--documents"},
		{"--cwd", root, "--format", "json", "agent", "prompt", "show", "write"},
		{"--cwd", t.TempDir(), "--format", "json", "init", "--local"},
	} {
		out, _, err := execute(t, args...)
		if err != nil {
			t.Fatalf("%v failed: %v", args, err)
		}
		var value any
		if err := json.Unmarshal([]byte(out), &value); err != nil {
			t.Fatalf("%v did not emit exactly one JSON document: %v\n%s", args, err, out)
		}
	}
}

func TestInitCreatesAutoModeConfiguration(t *testing.T) {
	root := t.TempDir()
	out, _, err := execute(t, "--cwd", root, "init", "--local")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(out, "XDOCS.md") {
		t.Fatalf("xdocs init text output still reports the legacy root index: %s", out)
	}
	cfg, err := config.Load(root, "", true)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.AIMode != "auto" {
		t.Fatalf("xdocs init created ai.mode %q, want auto", cfg.AIMode)
	}
	if !cfg.Gitignore || len(cfg.IgnoreRules) != 3 {
		t.Fatalf("xdocs init created incomplete ignore defaults: %#v", cfg)
	}
	if _, err := os.Stat(filepath.Join(root, "XDOCS.md")); !os.IsNotExist(err) {
		t.Fatalf("xdocs init created the legacy root index: %v", err)
	}
}

func TestInitOutputOmitsLegacyRootIndex(t *testing.T) {
	root := t.TempDir()
	out, _, err := execute(t, "--cwd", root, "--format", "json", "init", "--local")
	if err != nil {
		t.Fatal(err)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatal(err)
	}
	if _, exists := result["root"]; exists || strings.Contains(out, "XDOCS.md") {
		t.Fatalf("init output still reports the legacy root index: %s", out)
	}
}

func TestUserFacingInvocationsPreserveLegacyRootIndex(t *testing.T) {
	for _, args := range [][]string{
		{},
		{"--help"},
		{"--help-tree"},
		{"--help-tree-depth", "1"},
		{"--help-docs"},
		{"--version"},
		{"scan"},
	} {
		root := t.TempDir()
		if err := os.WriteFile(filepath.Join(root, "XDOCS.md"), []byte("# legacy\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		if _, _, err := executeWithRoots(t, root, t.TempDir(), args...); err != nil {
			t.Fatalf("%v failed: %v", args, err)
		}
		if content, err := os.ReadFile(filepath.Join(root, "XDOCS.md")); err != nil || string(content) != "# legacy\n" {
			t.Fatalf("%v changed the legacy root index: content=%q err=%v", args, content, err)
		}
	}
}

func TestHelpPreservesLegacyIndexInProcessAndEffectiveCwd(t *testing.T) {
	processCWD := t.TempDir()
	target := t.TempDir()
	if err := os.WriteFile(filepath.Join(processCWD, "XDOCS.md"), []byte("process"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(target, "XDOCS.md"), []byte("target"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, _, err := executeWithRoots(t, processCWD, t.TempDir(), "--cwd", target, "--help"); err != nil {
		t.Fatal(err)
	}
	if content, err := os.ReadFile(filepath.Join(target, "XDOCS.md")); err != nil || string(content) != "target" {
		t.Fatalf("effective --cwd legacy root index changed: content=%q err=%v", content, err)
	}
	if _, err := os.Stat(filepath.Join(processCWD, "XDOCS.md")); err != nil {
		t.Fatalf("process cwd legacy root index was unexpectedly changed: %v", err)
	}
}

func TestHelpIsIdempotentWhenLegacyIndexAbsent(t *testing.T) {
	root := t.TempDir()
	for range 2 {
		if _, _, err := executeWithRoots(t, root, t.TempDir(), "--help"); err != nil {
			t.Fatal(err)
		}
	}
}

func TestHelpPreservesLegacySymlinkAndTarget(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "target.md")
	link := filepath.Join(root, "XDOCS.md")
	if err := os.WriteFile(target, []byte("target"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(target, link); err != nil {
		t.Skipf("symbolic links unavailable: %v", err)
	}
	if _, _, err := executeWithRoots(t, root, t.TempDir(), "--help"); err != nil {
		t.Fatal(err)
	}
	if actual, err := os.Readlink(link); err != nil || actual != target {
		t.Fatalf("legacy symlink changed: target=%q err=%v", actual, err)
	}
	if _, err := os.Stat(target); err != nil {
		t.Fatalf("symlink target was unexpectedly removed: %v", err)
	}
}

func TestLegacyNamedDirectoryDoesNotBlockReadOnlyCommands(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "XDOCS.md")
	if err := os.Mkdir(path, 0o755); err != nil {
		t.Fatal(err)
	}
	_, _, err := executeWithRoots(t, root, t.TempDir(), "scan")
	if err != nil {
		t.Fatalf("read-only scan failed for a legacy-named directory: %v", err)
	}
	if info, statErr := os.Stat(path); statErr != nil || !info.IsDir() {
		t.Fatalf("directory named XDOCS.md was changed: info=%v err=%v", info, statErr)
	}
	_, _, err = executeWithRoots(t, root, t.TempDir(), "--help")
	if err != nil {
		t.Fatalf("help with directory legacy failed: %v", err)
	}
	if info, statErr := os.Stat(path); statErr != nil || !info.IsDir() {
		t.Fatalf("help changed directory named XDOCS.md: info=%v err=%v", info, statErr)
	}
}

func TestMetaReportsTrackedDocumentWithoutRequiredFrontmatter(t *testing.T) {
	root := t.TempDir()
	descriptor := `---
subject: example
description: Example module.
parent: null
children: []
files: {}
documents:
  ignored.md: Git-ignored guide.
  README.md: Public overview.
tags: []
keywords: []
flags: []
---
`
	if err := os.WriteFile(filepath.Join(root, "example.xdocs.md"), []byte(descriptor), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "README.md"), []byte("# Public overview\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "ignored.md"), []byte("# Ignored\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte("ignored.md\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, config.Filename), []byte(config.DefaultContent(root)), 0o644); err != nil {
		t.Fatal(err)
	}
	out, _, err := execute(t, "--cwd", root, "--format", "json", "meta", "--documents", "--strict")
	if err != nil {
		t.Fatal(err)
	}
	var result struct {
		Descriptors []struct {
			Frontmatter map[string]any `json:"frontmatter"`
			Metadata    struct {
				Documents map[string]string `json:"documents"`
			} `json:"metadata"`
			Documents []struct {
				Name                string `json:"name"`
				FrontmatterRequired bool   `json:"frontmatterRequired"`
				Valid               bool   `json:"valid"`
			} `json:"documents"`
		} `json:"descriptors"`
	}
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatal(err)
	}
	if len(result.Descriptors) != 1 || len(result.Descriptors[0].Documents) != 1 {
		t.Fatalf("unexpected metadata result: %#v", result)
	}
	document := result.Descriptors[0].Documents[0]
	if document.Name != "README.md" || document.FrontmatterRequired || !document.Valid {
		t.Fatalf("frontmatter opt-out was not exposed in JSON: %#v", document)
	}
	if _, exists := result.Descriptors[0].Metadata.Documents["ignored.md"]; exists {
		t.Fatalf("ignored document leaked through typed JSON metadata: %#v", result.Descriptors[0].Metadata.Documents)
	}
	rawDocuments, ok := result.Descriptors[0].Frontmatter["documents"].(map[string]any)
	if !ok {
		t.Fatalf("raw JSON frontmatter documents have an unexpected shape: %#v", result.Descriptors[0].Frontmatter)
	}
	if _, exists := rawDocuments["ignored.md"]; exists {
		t.Fatalf("ignored document leaked through raw JSON frontmatter: %#v", rawDocuments)
	}
}

func TestContextRejectsNonPositiveLimit(t *testing.T) {
	if _, _, err := execute(t, "context", "example", "--limit", "0"); ExitCode(err) != 2 {
		t.Fatalf("expected usage failure for --limit 0, got %v (%d)", err, ExitCode(err))
	}
}

func TestNoArgumentVersionAndCatalog(t *testing.T) {
	out, _, err := execute(t)
	if err != nil {
		t.Fatalf("welcome failed: %v", err)
	}
	for _, required := range []string{
		"████╗", "Structured documentation for codebases and AI agents",
		"GUIHO", "Cristóvão GUIHO",
		"organization", "platform", "x64", "version", "v0.8.0",
		"Run xdocs --help to see available commands.",
	} {
		if !strings.Contains(out, required) {
			t.Fatalf("welcome output omits %q:\n%s", required, out)
		}
	}
	if !strings.HasPrefix(out, "\n\n") {
		t.Fatalf("welcome output does not start with two blank lines: %q", out)
	}
	if !strings.HasSuffix(out, "\n\n") {
		t.Fatalf("welcome output does not end with two blank lines: %q", out)
	}
	if strings.Contains(out, "Hello Windows") || strings.Contains(out, "\x1b[") {
		t.Fatalf("welcome output should be beautiful borderless without legacy text or ANSI in non-terminal mode: %q", out)
	}
	out, _, err = execute(t, "--version")
	if err != nil || out != "xdocs v0.8.0\n" {
		t.Fatalf("unexpected version: %q %v", out, err)
	}
	out, _, err = execute(t, "--help-tree-depth", "1")
	if err != nil {
		t.Fatal(err)
	}
	for _, required := range []string{"agent", "context", "doctor", "upgrade", "uninstall"} {
		if !strings.Contains(out, required) {
			t.Fatalf("catalog missing %s:\n%s", required, out)
		}
	}
	for _, forbidden := range []string{"completion", "\n├── help  "} {
		if strings.Contains(out, forbidden) {
			t.Fatalf("catalog exposed %s:\n%s", forbidden, out)
		}
	}
}

func TestExplicitAgentActionsMaintainSkillsAndInstructionsIdempotently(t *testing.T) {
	cwd := t.TempDir()
	home := t.TempDir()
	agentsPath := filepath.Join(cwd, "AGENTS.md")
	claudePath := filepath.Join(cwd, "CLAUDE.md")
	if err := os.WriteFile(agentsPath, []byte("# Existing agents\n"), 0o640); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(claudePath, []byte("# Existing claude\r\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	_, _, err := executeWithRoots(t, cwd, home, "agent", "skill", "install")
	if err != nil {
		t.Fatal(err)
	}
	_, stderr, err := executeWithRoots(t, cwd, home, "agent", "instruction", "apply")
	if err != nil || stderr != "" {
		t.Fatalf("unexpected explicit instruction result: stderr=%q err=%v", stderr, err)
	}

	managedPaths := []string{agentsPath, claudePath}
	for _, relative := range []string{
		".agents/skills/guiho-s-xdocs/SKILL.md",
		".claude/skills/guiho-s-xdocs/SKILL.md",
	} {
		path := filepath.Join(home, filepath.FromSlash(relative))
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(content), "name: guiho-s-xdocs") {
			t.Fatalf("unexpected installed skill at %s: %s", path, content)
		}
		managedPaths = append(managedPaths, path)
	}
	agentsContent, _ := os.ReadFile(agentsPath)
	if !strings.HasPrefix(string(agentsContent), "# Existing agents\n") ||
		strings.Contains(string(agentsContent), "`XDOCS.md` indexes") ||
		!strings.Contains(string(agentsContent), "`xdocs.yaml`") ||
		!strings.Contains(string(agentsContent), "legacy `XDOCS.md`") ||
		!strings.Contains(string(agentsContent), "`xdocs scan`") {
		t.Fatalf("AGENTS.md was not reconciled correctly:\n%s", agentsContent)
	}
	claudeContent, _ := os.ReadFile(claudePath)
	withoutCRLF := strings.ReplaceAll(string(claudeContent), "\r\n", "")
	if !strings.HasPrefix(string(claudeContent), "# Existing claude\r\n") || strings.Contains(withoutCRLF, "\n") {
		t.Fatalf("CLAUDE.md line endings or external content changed: %q", claudeContent)
	}

	oldTime := time.Unix(946684800, 0)
	for _, path := range managedPaths {
		if err := os.Chtimes(path, oldTime, oldTime); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := executeWithRoots(t, cwd, home, "agent", "skill", "install"); err != nil {
		t.Fatal(err)
	}
	if _, _, err := executeWithRoots(t, cwd, home, "agent", "instruction", "apply"); err != nil {
		t.Fatal(err)
	}
	for _, path := range managedPaths {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if !info.ModTime().Equal(oldTime) {
			t.Fatalf("repeated explicit setup needlessly rewrote %s: %s", path, info.ModTime())
		}
	}
}

func TestExplicitInstructionApplyCreatesAgentsWhenNoInstructionFileExists(t *testing.T) {
	cwd := t.TempDir()
	home := t.TempDir()
	if _, _, err := executeWithRoots(t, cwd, home, "agent", "instruction", "apply"); err != nil {
		t.Fatal(err)
	}
	content, err := os.ReadFile(filepath.Join(cwd, "AGENTS.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(content), "<!-- BEGIN XDOCS") || !strings.Contains(string(content), "`*.xdocs.md` descriptors") {
		t.Fatalf("fallback AGENTS.md is incomplete:\n%s", content)
	}
	if _, err := os.Stat(filepath.Join(cwd, "CLAUDE.md")); !os.IsNotExist(err) {
		t.Fatalf("unexpected CLAUDE.md creation: %v", err)
	}
}

func TestPlainInvocationPreservesMalformedInstructionsWithoutGlobalMutation(t *testing.T) {
	cwd := t.TempDir()
	home := t.TempDir()
	path := filepath.Join(cwd, "AGENTS.md")
	original := "# Existing\n\n<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->\nunterminated\n"
	if err := os.WriteFile(path, []byte(original), 0o644); err != nil {
		t.Fatal(err)
	}
	out, _, err := executeWithRoots(t, cwd, home)
	if err != nil || out == "" {
		t.Fatalf("read-only welcome was blocked by instruction markers: out=%q err=%v", out, err)
	}
	current, _ := os.ReadFile(path)
	if string(current) != original {
		t.Fatalf("malformed instruction file changed: %q", current)
	}
	if _, err := os.Stat(filepath.Join(home, ".agents")); !os.IsNotExist(err) {
		t.Fatalf("global skill mutation occurred before marker refusal: %v", err)
	}
}

func TestWelcomeAndDataCommandsDoNotRunBootstrap(t *testing.T) {
	for _, args := range [][]string{
		{},
		{"--version"},
		{"--help"},
		{"agent", "prompt", "list", "--names"},
		{"scan"},
		{"uninstall", "--dry-run"},
	} {
		cwd := t.TempDir()
		home := t.TempDir()
		if _, _, err := executeWithRoots(t, cwd, home, args...); err != nil {
			t.Fatalf("%v failed: %v", args, err)
		}
		if _, err := os.Stat(filepath.Join(home, ".agents")); !os.IsNotExist(err) {
			t.Fatalf("%v unexpectedly bootstrapped a global skill: %v", args, err)
		}
		if _, err := os.Stat(filepath.Join(cwd, "AGENTS.md")); !os.IsNotExist(err) {
			t.Fatalf("%v unexpectedly created AGENTS.md: %v", args, err)
		}
	}
}

func TestHelpTreeDepthAndUnknownAliases(t *testing.T) {
	if _, _, err := execute(t, "--help-tree-depth", "0"); ExitCode(err) != 2 {
		t.Fatalf("expected usage exit, got %v (%d)", err, ExitCode(err))
	}
	if _, _, err := execute(t, "-c", "xdocs.yaml"); ExitCode(err) != 2 {
		t.Fatalf("forbidden short alias did not fail as usage: %v", err)
	}
	out, _, err := execute(t, "agent", "prompt", "list", "--names")
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"agents", "generate", "update", "write"} {
		if !strings.Contains(out, name) {
			t.Fatalf("missing prompt %s: %s", name, out)
		}
	}
}

func TestRootHelpDocumentsExplicitSetupBoundary(t *testing.T) {
	out, _, err := execute(t, "--help")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "preserve project and agent files") ||
		!strings.Contains(out, "explicit init and agent actions") ||
		!strings.Contains(out, "runtime update housekeeping only") {
		t.Fatalf("root help omits the explicit setup boundary:\n%s", out)
	}
}

func TestMarkdownHelpRendersDeterministicLiveSubtree(t *testing.T) {
	full, _, err := execute(t, "--help-docs")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(full, "## xdocs agent skill install") {
		t.Fatalf("root Markdown help omitted nested command:\n%s", full)
	}
	scoped, _, err := execute(t, "agent", "--help-docs", "--help-tree-depth", "1")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(scoped, "## xdocs doctor") || strings.Contains(scoped, "## xdocs agent skill install") {
		t.Fatalf("scoped depth leaked siblings or grandchildren:\n%s", scoped)
	}
	again, _, err := execute(t, "--help-docs")
	if err != nil || again != full {
		t.Fatalf("Markdown help is not deterministic: %v", err)
	}
}
