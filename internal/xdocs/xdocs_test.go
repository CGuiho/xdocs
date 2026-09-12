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
	cfg := config.Config{Schema: 1, CWD: root, Extensions: []string{".xdocs.md"}, AIMode: "auto", Exclude: []string{".git"}, Project: "example", Documentation: config.DocumentationConfig{
		Directories: []string{"."}, Frontmatter: []config.DocumentationRule{{Pattern: "**/*.md", Kind: "file"}},
	}}
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

func TestExistingFrontmatterAuditFindsMalformedHeadersWithoutRequiringHeaders(t *testing.T) {
	root := t.TempDir()
	descriptor := `---
subject: example
description: Example.
parent: null
children: []
files: {}
documents:
  notes.md: Notes.
  broken.md: Broken notes.
tags: []
keywords: []
flags: []
---
`
	if err := os.WriteFile(filepath.Join(root, "example.xdocs.md"), []byte(descriptor), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "notes.md"), []byte("# Notes\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "broken.md"), []byte("---\nname: [unterminated\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	withoutAudit, err := ScanMetadata(cfg, MetaOptions{IncludeDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(withoutAudit.Errors) != 0 {
		t.Fatalf("ordinary Markdown unexpectedly required frontmatter: %#v", withoutAudit.Errors)
	}
	withAudit, err := ScanMetadata(cfg, MetaOptions{IncludeDocuments: true, ExistingFrontmatter: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(withAudit.Errors) == 0 || !strings.Contains(strings.Join(withAudit.Errors, "\n"), "broken.md") {
		t.Fatalf("existing-header audit missed malformed frontmatter: %#v", withAudit)
	}
}

func TestExistingFrontmatterAuditIncludesUnlistedAndDescriptorlessDocuments(t *testing.T) {
	root := t.TempDir()
	files := map[string]string{
		"unlisted.md": "---\nname: [unterminated\n",
		"valid.md":    "---\nsource: historical\nowner: historical-owner\n---\nbody\n",
		"missing.md":  "# No header\n",
	}
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(root, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	result, err := ScanMetadata(cfg, MetaOptions{ExistingFrontmatter: true})
	if err != nil {
		t.Fatal(err)
	}
	if !result.IncludeDocuments || !result.ExistingFrontmatter {
		t.Fatalf("existing-header audit did not imply document reads: %#v", result)
	}
	if len(result.Documents) != len(files) {
		t.Fatalf("audited documents = %d, want %d: %#v", len(result.Documents), len(files), result.Documents)
	}
	byPath := map[string]MetaDocument{}
	for _, document := range result.Documents {
		byPath[document.RelativePath] = document
	}
	if byPath["missing.md"].Valid == false {
		t.Fatalf("missing header was not valid in read-only audit: %#v", byPath["missing.md"])
	}
	if byPath["valid.md"].Valid == false || byPath["valid.md"].Frontmatter["source"] != "historical" {
		t.Fatalf("valid generic header was not audited: %#v", byPath["valid.md"])
	}
	if byPath["unlisted.md"].Valid || len(byPath["unlisted.md"].Errors) == 0 {
		t.Fatalf("malformed descriptorless header was not reported: %#v", byPath["unlisted.md"])
	}
	if !strings.Contains(strings.Join(result.Errors, "\n"), "unlisted.md") {
		t.Fatalf("audit errors omitted descriptorless malformed path: %#v", result.Errors)
	}
	filtered, err := ScanMetadata(cfg, MetaOptions{ExistingFrontmatter: true, Filters: Filters{Owner: "historical-owner"}})
	if err != nil {
		t.Fatal(err)
	}
	if len(filtered.Documents) != 1 || filtered.Documents[0].RelativePath != "valid.md" {
		t.Fatalf("standalone audit owner filter ignored raw owner: %#v", filtered.Documents)
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

func TestFrontmatterDelimitersMustOccupyWholeLines(t *testing.T) {
	for _, content := range []string{
		"---suffix\nsubject: example\n---\n",
		"---\nsubject: example\n---suffix\n",
		"---\nsubject: example\n",
		" \n---\nsubject: example\n---\n",
		"\ufeff---\nsubject: example\n---\n",
	} {
		if _, _, ok := ExtractFrontmatter(content); ok {
			t.Fatalf("malformed frontmatter delimiter accepted: %q", content)
		}
	}
	frontmatter, body, ok := ExtractFrontmatter("---\nsubject: example\n---\nbody\n")
	if !ok || frontmatter != "subject: example" || body != "body" {
		t.Fatalf("valid frontmatter was not extracted exactly: %q %q %t", frontmatter, body, ok)
	}
}

func TestDescriptorRejectsScalarCoercionAndWrongCollections(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "module.xdocs.md")
	content := `---
subject: 123
description: true
parent: 42
children: [7]
files:
  service.go: false
documents: []
tags: [true]
keywords: [9]
flags: {}
---
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	file := ParseFile(path, root)
	if file.Valid || !strings.Contains(strings.Join(file.Errors, "\n"), "frontmatter.subject") {
		t.Fatalf("scalar descriptor fields were accepted: %#v", file)
	}
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	meta, err := ScanMetadata(cfg, MetaOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if len(meta.Descriptors) != 1 || meta.Descriptors[0].Valid {
		t.Fatalf("metadata scan accepted wrong descriptor types: %#v", meta.Descriptors)
	}
	doctor, err := Doctor(cfg, DoctorOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if doctor.Valid || doctor.Summary.Errors == 0 {
		t.Fatalf("doctor missed wrong descriptor types: %#v", doctor)
	}
	content = `---
<<: &metadata
  subject: 123
  description: true
  parent: null
  children: []
  files: {}
  documents: {}
  tags: []
  keywords: []
  flags: []
---
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	file = ParseFile(path, root)
	if file.Valid || !strings.Contains(strings.Join(file.Errors, "\n"), "anchors") {
		t.Fatalf("descriptor YAML merge bypassed strict validation: %#v", file)
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
