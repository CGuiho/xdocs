package cmd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTreeCommandKeepsInvalidDescriptorsVisibleAndReportsDiagnostics(t *testing.T) {
	root := t.TempDir()
	deep := filepath.Join(root, "one", "two", "three")
	if err := os.MkdirAll(deep, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "XDOCS.md"), []byte("# Root\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	valid := `---
subject: deep
description: Deep descriptor context.
parent: null
children: []
files: {}
documents: {}
tags: []
keywords: []
flags: []
---
`
	if err := os.WriteFile(filepath.Join(deep, "three.xdocs.md"), []byte(valid), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "one", "one.xdocs.md"), []byte("---\nsubject: [broken\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "one", "two", "two.xdocs.md"), []byte("---\nsubject: orphan\ndescription: Orphan\nparent: missing\nchildren: []\nfiles: {}\ndocuments: {}\ntags: []\nkeywords: []\nflags: []\n---\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	for _, format := range []string{"text", "markdown", "json"} {
		args := []string{"--cwd", root, "--format", format, "tree"}
		out, stderr, err := execute(t, args...)
		if err != nil {
			t.Fatalf("tree %s failed: %v\n%s", format, err, stderr)
		}
		if format == "json" {
			var value map[string]any
			if err := json.Unmarshal([]byte(out), &value); err != nil {
				t.Fatalf("tree JSON is invalid: %v\n%s", err, out)
			}
		}
		for _, path := range []string{"XDOCS.md", "one/one.xdocs.md", "one/two/two.xdocs.md", "one/two/three/three.xdocs.md"} {
			var count int
			switch format {
			case "json":
				count = treeJSONPathCount(t, out, path)
			case "markdown":
				count = strings.Count(out, "(`"+path+"`)")
			default:
				count = strings.Count(out, "["+path+"]")
			}
			if count != 1 {
				t.Fatalf("tree %s did not expose %s exactly once (count %d):\n%s", format, path, count, out)
			}
		}
		if !strings.Contains(stderr, "one.xdocs.md") || !strings.Contains(stderr, "orphan") {
			t.Fatalf("tree %s omitted default diagnostics:\n%s", format, stderr)
		}
	}
}

func treeJSONPathCount(t *testing.T, output, wanted string) int {
	t.Helper()
	var root map[string]any
	if err := json.Unmarshal([]byte(output), &root); err != nil {
		t.Fatalf("tree JSON is invalid: %v\n%s", err, output)
	}
	count := 0
	var visit func(map[string]any)
	visit = func(node map[string]any) {
		if path, ok := node["path"].(string); ok && path == wanted {
			count++
		}
		children, ok := node["children"].([]any)
		if !ok {
			return
		}
		for _, child := range children {
			childNode, ok := child.(map[string]any)
			if ok {
				visit(childNode)
			}
		}
	}
	visit(root)
	return count
}
