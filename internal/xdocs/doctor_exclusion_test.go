package xdocs

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/CGuiho/xdocs/internal/config"
)

// Regression coverage for CGuiho/xdocs#20: standalone Markdown files at the
// repository root matched by ignore.rules or scan.exclude must not be
// flagged by doctor as undocumented, while non-excluded files still are.

func writeExclusionFile(t *testing.T, root, name, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(filepath.Join(root, name)), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, name), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func writeExclusionDescriptor(t *testing.T, root, documents string) {
	t.Helper()
	documentsField := "documents: {}\n"
	if documents != "" {
		documentsField = "documents:\n" + documents
	}
	descriptor := `---
subject: example
description: Exclusion regression fixture.
parent: null
children: []
files: {}
` + documentsField + `tags: []
keywords: [example]
flags: []
---
`
	writeExclusionFile(t, root, "demo.xdocs.md", descriptor)
}

func TestDoctorExemptsRootFilesMatchingIgnoreRules(t *testing.T) {
	root := t.TempDir()
	writeExclusionDescriptor(t, root, "")
	for _, name := range []string{"AGENTS.md", "CHANGELOG.md", "README.md"} {
		writeExclusionFile(t, root, name, "# "+name+"\n")
	}
	cfg := config.Config{
		CWD: root, Gitignore: true, Exclude: []string{"node_modules", ".git", "dist", "build", "library", "bin", "bundle", "vendor", "docs"},
		Project: "example",
		IgnoreRules: []config.IgnoreRule{
			{Pattern: "AGENTS.md", Kind: "file", Frontmatter: false},
			{Pattern: "CHANGELOG.md", Kind: "file", Frontmatter: false},
			{Pattern: "README.md", Kind: "file", Frontmatter: false},
		},
	}

	// Exemption is not exclusion: the files stay discovered and tracked,
	// they are only excused from the documents-map requirement.
	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if scan.TotalMarkdownDocuments != 3 {
		t.Fatalf("ignore-rule documents must stay discovered, got %d: %#v", scan.TotalMarkdownDocuments, scan.MarkdownDocuments)
	}
	if len(scan.XDocsFiles) != 1 || !scan.XDocsFiles[0].Valid || len(scan.XDocsFiles[0].Errors) != 0 {
		t.Fatalf("descriptor was not valid under ignore-rule exemption: %#v", scan.XDocsFiles)
	}

	doctor, err := Doctor(cfg, DoctorOptions{WarningsAsErrors: true})
	if err != nil {
		t.Fatal(err)
	}
	if !doctor.Valid || len(doctor.Issues) != 0 {
		t.Fatalf("doctor flagged ignore-rule files: %#v", doctorMessages(doctor))
	}
}

func TestDoctorHonorsScanExcludeFilePatterns(t *testing.T) {
	tests := []struct {
		name       string
		exclude    []string
		files      []string
		wantDocs   int
		wantDoctor bool
	}{
		{name: "bare filenames", exclude: []string{"AGENTS.md", "CHANGELOG.md", "README.md", "docs"}, files: []string{"AGENTS.md", "CHANGELOG.md", "README.md", "docs/demo-prompt.md"}, wantDocs: 0, wantDoctor: true},
		{name: "doublestar globs", exclude: []string{"**/AGENTS.md", "**/CHANGELOG.md", "**/README.md", "docs"}, files: []string{"AGENTS.md", "CHANGELOG.md", "README.md", "docs/demo-prompt.md"}, wantDocs: 0, wantDoctor: true},
		{name: "nested file glob only", exclude: []string{"**/README.md"}, files: []string{"nested/README.md"}, wantDocs: 0, wantDoctor: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			root := t.TempDir()
			writeExclusionDescriptor(t, root, "")
			for _, name := range test.files {
				writeExclusionFile(t, root, name, "# "+name+"\n")
			}
			cfg := config.Config{CWD: root, Gitignore: true, Exclude: test.exclude, Project: "example"}

			scan, err := ScanProject(cfg)
			if err != nil {
				t.Fatal(err)
			}
			if scan.TotalMarkdownDocuments != test.wantDocs {
				t.Fatalf("scan-excluded files were discovered: got %d documents, want %d: %#v", scan.TotalMarkdownDocuments, test.wantDocs, scan.MarkdownDocuments)
			}
			doctor, err := Doctor(cfg, DoctorOptions{WarningsAsErrors: true})
			if err != nil {
				t.Fatal(err)
			}
			if doctor.Valid != test.wantDoctor {
				t.Fatalf("doctor.Valid = %t, want %t: %#v", doctor.Valid, test.wantDoctor, doctorMessages(doctor))
			}
		})
	}
}

func TestDoctorStillFlagsNonExcludedUndocumentedMarkdown(t *testing.T) {
	root := t.TempDir()
	writeExclusionDescriptor(t, root, "")
	writeExclusionFile(t, root, "notes.md", "# Notes\n")
	writeExclusionFile(t, root, "README.md", "# Public overview\n")
	cfg := config.Config{
		CWD: root, Gitignore: true, Exclude: []string{"docs"}, Project: "example",
		IgnoreRules: []config.IgnoreRule{{Pattern: "README.md", Kind: "file", Frontmatter: false}},
	}

	doctor, err := Doctor(cfg, DoctorOptions{WarningsAsErrors: true})
	if err != nil {
		t.Fatal(err)
	}
	if doctor.Valid {
		t.Fatal("doctor accepted a non-excluded undocumented Markdown file")
	}
	messages := strings.Join(doctorMessages(doctor), "\n")
	if !strings.Contains(messages, `"notes.md"`) {
		t.Fatalf("doctor did not flag notes.md: %#v", doctorMessages(doctor))
	}
	if strings.Contains(messages, `"README.md"`) {
		t.Fatalf("doctor flagged the ignore-rule README.md: %#v", doctorMessages(doctor))
	}
}

func TestDoctorDirectoryExclusionStillWorks(t *testing.T) {
	root := t.TempDir()
	writeExclusionDescriptor(t, root, "")
	writeExclusionFile(t, root, "docs/demo-prompt.md", "# Prompt\n")
	cfg := config.Config{CWD: root, Gitignore: true, Exclude: []string{"docs"}, Project: "example"}

	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if scan.TotalMarkdownDocuments != 0 {
		t.Fatalf("directory exclusion leaked into discovery: %#v", scan.MarkdownDocuments)
	}
	doctor, err := Doctor(cfg, DoctorOptions{WarningsAsErrors: true})
	if err != nil {
		t.Fatal(err)
	}
	if !doctor.Valid || len(doctor.Issues) != 0 {
		t.Fatalf("doctor flagged contents of an excluded directory: %#v", doctorMessages(doctor))
	}
}

func TestScanExcludedListedDocumentIsStrippedWithoutMissingError(t *testing.T) {
	root := t.TempDir()
	writeExclusionDescriptor(t, root, "  notes.md: Scan-excluded notes.\n")
	writeExclusionFile(t, root, "notes.md", "# Notes\n")
	cfg := config.Config{CWD: root, Gitignore: true, Exclude: []string{"notes.md"}, Project: "example"}

	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(scan.XDocsFiles) != 1 || len(scan.XDocsFiles[0].Metadata.Documents) != 0 {
		t.Fatalf("scan-excluded document stayed in metadata: %#v", scan.XDocsFiles)
	}
	doctor, err := Doctor(cfg, DoctorOptions{WarningsAsErrors: true})
	if err != nil {
		t.Fatal(err)
	}
	if !doctor.Valid || len(doctor.Issues) != 0 {
		t.Fatalf("doctor reported a stripped scan-excluded document: %#v", doctorMessages(doctor))
	}
}

func TestListedIgnoreRuleDocumentStaysTracked(t *testing.T) {
	root := t.TempDir()
	writeExclusionDescriptor(t, root, "  README.md: Public overview without xdocs frontmatter.\n")
	writeExclusionFile(t, root, "README.md", "# Public overview\n")
	cfg := config.Config{
		CWD: root, Gitignore: true, Exclude: []string{}, Project: "example",
		IgnoreRules: []config.IgnoreRule{{Pattern: "README.md", Kind: "file", Frontmatter: false}},
	}

	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(scan.XDocsFiles) != 1 || !scan.XDocsFiles[0].Valid {
		t.Fatalf("listed ignore-rule document broke scan validity: %#v", scan.XDocsFiles)
	}
	if _, exists := scan.XDocsFiles[0].Metadata.Documents["README.md"]; !exists {
		t.Fatalf("listed ignore-rule document was stripped from metadata: %#v", scan.XDocsFiles[0].Metadata.Documents)
	}
	meta, err := ScanMetadata(cfg, MetaOptions{IncludeDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(meta.Errors) != 0 || len(meta.Descriptors) != 1 || len(meta.Descriptors[0].Documents) != 1 {
		t.Fatalf("listed ignore-rule document was not tracked in metadata: %#v", meta)
	}
	doctor, err := Doctor(cfg, DoctorOptions{WarningsAsErrors: true})
	if err != nil {
		t.Fatal(err)
	}
	if !doctor.Valid || len(doctor.Issues) != 0 {
		t.Fatalf("doctor flagged a listed ignore-rule document: %#v", doctorMessages(doctor))
	}
}
