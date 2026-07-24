package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/CGuiho/xdocs/internal/upgrade"
)

func execute(t *testing.T, args ...string) (string, string, error) {
	t.Helper()
	t.Setenv("XDOCS_DISABLE_UPDATE_CHECK", "1")
	if os.Getenv("XDOCS_CACHE_DIR") == "" {
		t.Setenv("XDOCS_CACHE_DIR", t.TempDir())
	}
	var out, stderr bytes.Buffer
	root := NewRootCommand(Dependencies{
		In: bytes.NewBuffer(nil), Out: &out, Err: &stderr, Resources: agentTestResources(),
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
	out, stderr, err := execute(t, "--format", "json")
	if err != nil {
		t.Fatal(err)
	}
	var value any
	if err := json.Unmarshal([]byte(out), &value); err != nil {
		t.Fatalf("JSON stdout was contaminated: %v\n%s", err, out)
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
	if len(scan.XDocsFiles) != 2 || scan.XDocsFiles[0].Path != "XDOCS.md" {
		t.Fatalf("scan omitted root index or descriptor: %#v", scan.XDocsFiles)
	}
	if len(scan.XDocsFiles[1].DiscoveredDocuments) != 1 || scan.XDocsFiles[1].DiscoveredDocuments[0] != "module/guide.md" {
		t.Fatalf("scan discoveredDocuments shape drifted: %#v", scan.XDocsFiles[1])
	}
	if len(scan.MarkdownDocuments) != 1 || scan.MarkdownDocuments[0] != "module/guide.md" {
		t.Fatalf("scan markdownDocuments shape drifted: %#v", scan.MarkdownDocuments)
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

func TestContextRejectsNonPositiveLimit(t *testing.T) {
	if _, _, err := execute(t, "context", "example", "--limit", "0"); ExitCode(err) != 2 {
		t.Fatalf("expected usage failure for --limit 0, got %v (%d)", err, ExitCode(err))
	}
}

func TestNoArgumentVersionAndCatalog(t *testing.T) {
	out, _, err := execute(t)
	if err != nil || out != "Hello Windows - xdocs v0.8.0\n" {
		t.Fatalf("unexpected welcome: %q %v", out, err)
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
