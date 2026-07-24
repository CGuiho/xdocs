package xdocs

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/CGuiho/xdocs/internal/config"
)

func TestScanTreeMetaContextAndDoctor(t *testing.T) {
	root := t.TempDir()
	module := filepath.Join(root, "module")
	if err := os.MkdirAll(module, 0o755); err != nil {
		t.Fatal(err)
	}
	descriptor := `---
subject: example-module
description: Example authentication module.
parent: null
children: []
files:
  service.go: Authentication service.
documents:
  guide.md: Authentication guide.
tags: [authentication]
keywords: [login, session]
flags: []
---
# Details
`
	companion := `---
name: Authentication Guide
purpose: Explain login.
description: Login and session guidance.
created: 2026-07-24
owner: example-module
flags: []
tags: [authentication]
keywords: [login]
---
# Guide
`
	if err := os.WriteFile(filepath.Join(module, "module.xdocs.md"), []byte(descriptor), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(module, "guide.md"), []byte(companion), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(module, "service.go"), []byte("package module\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{Schema: 1, CWD: root, Extensions: []string{".xdocs.md"}, AIMode: "auto", Exclude: []string{".git"}, Project: "example"}
	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(scan.XDocsFiles) != 1 || !scan.XDocsFiles[0].Valid {
		t.Fatalf("unexpected scan: %#v", scan)
	}
	if tree := RenderTree(BuildTree(scan.XDocsFiles)); !strings.Contains(tree, "example-module") {
		t.Fatalf("unexpected tree: %s", tree)
	}
	meta, err := ScanMetadata(cfg, MetaOptions{IncludeDocuments: true, Filters: Filters{Tag: "authentication"}})
	if err != nil {
		t.Fatal(err)
	}
	if len(meta.Descriptors) != 1 || len(meta.Descriptors[0].Documents) != 1 {
		t.Fatalf("unexpected metadata: %#v", meta)
	}
	if !meta.Descriptors[0].Documents[0].Valid {
		t.Fatalf("unquoted YAML date was not accepted: %#v", meta.Descriptors[0].Documents[0].Errors)
	}
	context, err := FindContext(cfg, "login session", ContextOptions{IncludeDocuments: true, IncludeFiles: true, Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if len(context.Entries) < 2 || context.Entries[0].Score <= 0 {
		t.Fatalf("unexpected context: %#v", context)
	}
	doctor, err := Doctor(cfg, DoctorOptions{IncludeDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	if !doctor.Valid {
		t.Fatalf("unexpected doctor issues: %#v", doctor.Issues)
	}
}

func TestDescriptorAndCompanionErrors(t *testing.T) {
	root := t.TempDir()
	content := `---
subject: broken
description: Broken descriptor.
parent: null
children: []
files: {}
documents:
  missing.md: Missing.
tags: []
keywords: []
flags: []
---
`
	if err := os.WriteFile(filepath.Join(root, "broken.xdocs.md"), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{Schema: 1, CWD: root, Extensions: []string{".xdocs.md"}, Exclude: []string{}, Project: "broken"}
	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if scan.XDocsFiles[0].Valid || !strings.Contains(strings.Join(scan.XDocsFiles[0].Errors, "\n"), "Missing Markdown document") {
		t.Fatalf("missing document was not reported: %#v", scan.XDocsFiles[0])
	}
}

func TestContextRejectsEmptyQuery(t *testing.T) {
	cfg := config.Config{CWD: t.TempDir(), Extensions: []string{".xdocs.md"}, Exclude: []string{}}
	if _, err := FindContext(cfg, " ", ContextOptions{}); err == nil {
		t.Fatal("expected empty query error")
	}
}

func TestDescriptorRequiresExplicitParent(t *testing.T) {
	raw := `subject: missing-parent
description: Missing parent field.
children: []
files: {}
documents: {}
tags: []
keywords: []
flags: []`
	if metadata, _, errors := parseMetadata(raw); metadata != nil || !strings.Contains(strings.Join(errors, "\n"), "frontmatter.parent") {
		t.Fatalf("missing parent was not rejected: %#v %#v", metadata, errors)
	}
}

func TestValidateTreeRejectsMismatchesCyclesAndMultipleRoots(t *testing.T) {
	parent := "root"
	cycleParent := "cycle-b"
	tests := []struct {
		name  string
		files []File
		want  string
	}{
		{
			name: "parent child mismatch",
			files: []File{
				{RelativePath: "root.xdocs.md", Metadata: &Metadata{Subject: "root", Children: []string{}}},
				{RelativePath: "child.xdocs.md", Metadata: &Metadata{Subject: "child", Parent: &parent, Children: []string{}}},
			},
			want: "Parent-child mismatch",
		},
		{
			name: "multiple roots",
			files: []File{
				{RelativePath: "one.xdocs.md", Metadata: &Metadata{Subject: "one", Children: []string{}}},
				{RelativePath: "two.xdocs.md", Metadata: &Metadata{Subject: "two", Children: []string{}}},
			},
			want: "exactly one root",
		},
		{
			name: "cycle",
			files: []File{
				{RelativePath: "a.xdocs.md", Metadata: &Metadata{Subject: "cycle-a", Parent: &cycleParent, Children: []string{"cycle-b"}}},
				{RelativePath: "b.xdocs.md", Metadata: &Metadata{Subject: "cycle-b", Parent: stringPointer("cycle-a"), Children: []string{"cycle-a"}}},
			},
			want: "cycle detected",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			validation := ValidateTree(test.files)
			if validation.Valid || !strings.Contains(strings.Join(validation.Errors, "\n"), test.want) {
				t.Fatalf("invalid topology accepted: %#v", validation)
			}
		})
	}
}

func stringPointer(value string) *string {
	return &value
}
