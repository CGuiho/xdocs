package xdocs

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/CGuiho/xdocs/internal/config"
)

func TestPathPolicyHonorsGitignorePatternsAndNegation(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "nested")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}
	rootIgnore := "ignored.md\ncache/\n**/discard.md\n"
	if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte(rootIgnore), 0o644); err != nil {
		t.Fatal(err)
	}
	nestedIgnore := "*.md\n!module.xdocs.md\n!keep.md\n"
	if err := os.WriteFile(filepath.Join(nested, ".gitignore"), []byte(nestedIgnore), 0o644); err != nil {
		t.Fatal(err)
	}
	policy, err := newPathPolicy(config.Config{CWD: root, Gitignore: true}, root)
	if err != nil {
		t.Fatal(err)
	}
	if err := policy.loadGitignore(nested); err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		path      string
		directory bool
		ignored   bool
	}{
		{filepath.Join(root, "ignored.md"), false, true},
		{filepath.Join(root, "cache"), true, true},
		{filepath.Join(root, "module", "discard.md"), false, true},
		{filepath.Join(nested, "notes.md"), false, true},
		{filepath.Join(nested, "module.xdocs.md"), false, false},
		{filepath.Join(nested, "keep.md"), false, false},
	}
	for _, test := range tests {
		if got := policy.ignored(test.path, test.directory); got != test.ignored {
			t.Errorf("ignored(%s) = %t, want %t", test.path, got, test.ignored)
		}
	}
}

func TestCompileGlobMatchesGitDoubleStarAndCaseRules(t *testing.T) {
	tests := []struct {
		pattern    string
		candidate  string
		ignoreCase bool
		matched    bool
	}{
		{pattern: "**/dist", candidate: "dist", matched: true},
		{pattern: "**/dist", candidate: "nested/dist", matched: true},
		{pattern: "a/**/b", candidate: "a/b", matched: true},
		{pattern: "a/**/b", candidate: "a/one/two/b", matched: true},
		{pattern: "ab**cd/file.md", candidate: "abXYZcd/file.md", matched: true},
		{pattern: "ab**cd/file.md", candidate: "ab/x/cd/file.md", matched: false},
		{pattern: "**/dist", candidate: "Nested/Dist", ignoreCase: true, matched: true},
		{pattern: "**/dist", candidate: "Nested/Dist", ignoreCase: false, matched: false},
	}
	for _, test := range tests {
		if got := compileGlob(test.pattern, test.ignoreCase).MatchString(test.candidate); got != test.matched {
			t.Errorf("compileGlob(%q, %t).MatchString(%q) = %t, want %t", test.pattern, test.ignoreCase, test.candidate, got, test.matched)
		}
	}
}

func TestPathPolicyMatchesFileAndDirectoryFrontmatterRules(t *testing.T) {
	root := t.TempDir()
	policy, err := newPathPolicy(config.Config{
		CWD: root,
		IgnoreRules: []config.IgnoreRule{
			{Pattern: "README.md", Kind: "file", Frontmatter: false},
			{Pattern: "docs/private", Kind: "directory", Frontmatter: false},
		},
	}, root)
	if err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		path     string
		required bool
	}{
		{filepath.Join(root, "README.md"), false},
		{filepath.Join(root, "module", "README.md"), false},
		{filepath.Join(root, "docs", "private", "notes.md"), false},
		{filepath.Join(root, "docs", "private", "nested", "notes.md"), false},
		{filepath.Join(root, "docs", "public", "notes.md"), true},
	}
	for _, test := range tests {
		if got := policy.frontmatterRequired(test.path); got != test.required {
			t.Errorf("frontmatterRequired(%s) = %t, want %t", test.path, got, test.required)
		}
	}
}

func TestPathPolicyDoesNotEnterIgnoredOrExcludedTarget(t *testing.T) {
	for _, test := range []struct {
		name       string
		rootIgnore string
		exclude    []string
	}{
		{name: "Git ignored", rootIgnore: "private/\n"},
		{name: "scan excluded", exclude: []string{"private"}},
	} {
		t.Run(test.name, func(t *testing.T) {
			root := t.TempDir()
			target := filepath.Join(root, "private")
			if err := os.MkdirAll(target, 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte(test.rootIgnore), 0o644); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(target, ".gitignore"), []byte("[\n"), 0o644); err != nil {
				t.Fatal(err)
			}
			policy, err := newPathPolicy(config.Config{CWD: root, Gitignore: true, Exclude: test.exclude}, target)
			if err != nil {
				t.Fatal(err)
			}
			if policy.loaded[filepath.Join(target, ".gitignore")] {
				t.Fatal("path policy entered an ignored target")
			}
		})
	}
}

func TestScopedCommandsDoNotEnterScanExcludedTarget(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "vendor", "child")
	if err := os.MkdirAll(target, 0o755); err != nil {
		t.Fatal(err)
	}
	descriptor := `---
subject: excluded
description: Excluded descriptor.
parent: null
children: []
files: {}
documents: {}
tags: []
keywords: []
flags: []
---
`
	if err := os.WriteFile(filepath.Join(target, "vendor.xdocs.md"), []byte(descriptor), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{CWD: root, Gitignore: true, Exclude: []string{"vendor"}, Project: "example"}
	meta, err := ScanMetadata(cfg, MetaOptions{TargetPath: "vendor/child"})
	if err != nil {
		t.Fatal(err)
	}
	if len(meta.Descriptors) != 0 {
		t.Fatalf("scoped metadata entered scan-excluded target: %#v", meta.Descriptors)
	}
	context, err := FindContext(cfg, "excluded", ContextOptions{TargetPath: "vendor/child", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if len(context.Entries) != 0 {
		t.Fatalf("scoped context entered scan-excluded target: %#v", context.Entries)
	}
	doctor, err := Doctor(cfg, DoctorOptions{TargetPath: "vendor/child", IncludeDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	if !doctor.Valid || len(doctor.Issues) != 0 {
		t.Fatalf("scoped doctor entered scan-excluded target: %#v", doctor.Issues)
	}
}

func TestScopedCommandsRespectIgnoredAncestorsAndNestedRules(t *testing.T) {
	tests := []struct {
		name         string
		rootIgnore   string
		nestedIgnore string
		target       string
		wantCount    int
	}{
		{name: "ignored ancestor", rootIgnore: "ignored/\n", target: "ignored/visible", wantCount: 0},
		{name: "negated directory", rootIgnore: "ignored/*\n!ignored/visible/\n", target: "ignored/visible", wantCount: 1},
		{name: "nested ignore", rootIgnore: "ignored/*\n!ignored/visible/\n", nestedIgnore: "hidden/\n", target: "ignored/visible/hidden", wantCount: 0},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			root := t.TempDir()
			visible := filepath.Join(root, "ignored", "visible")
			hidden := filepath.Join(visible, "hidden")
			if err := os.MkdirAll(hidden, 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte(test.rootIgnore), 0o644); err != nil {
				t.Fatal(err)
			}
			if test.nestedIgnore != "" {
				if err := os.WriteFile(filepath.Join(visible, ".gitignore"), []byte(test.nestedIgnore), 0o644); err != nil {
					t.Fatal(err)
				}
			}
			descriptorDirectory := visible
			if strings.HasSuffix(test.target, "/hidden") {
				descriptorDirectory = hidden
			}
			descriptor := `---
subject: scoped
description: Scoped descriptor.
parent: null
children: []
files: {}
documents: {}
tags: []
keywords: [scoped]
flags: []
---
`
			if err := os.WriteFile(filepath.Join(descriptorDirectory, "scoped.xdocs.md"), []byte(descriptor), 0o644); err != nil {
				t.Fatal(err)
			}
			cfg, err := config.Defaults(root)
			if err != nil {
				t.Fatal(err)
			}
			meta, err := ScanMetadata(cfg, MetaOptions{TargetPath: test.target})
			if err != nil {
				t.Fatal(err)
			}
			if len(meta.Descriptors) != test.wantCount {
				t.Fatalf("scoped descriptors = %d, want %d: %#v", len(meta.Descriptors), test.wantCount, meta.Descriptors)
			}
			context, err := FindContext(cfg, "scoped", ContextOptions{TargetPath: test.target, Limit: 10})
			if err != nil {
				t.Fatal(err)
			}
			if len(context.Entries) != test.wantCount {
				t.Fatalf("scoped context entries = %d, want %d: %#v", len(context.Entries), test.wantCount, context.Entries)
			}
			doctor, err := Doctor(cfg, DoctorOptions{TargetPath: test.target, IncludeDocuments: true})
			if err != nil {
				t.Fatal(err)
			}
			if !doctor.Valid {
				t.Fatalf("scoped doctor failed: %#v", doctor.Issues)
			}
		})
	}
}

func TestIgnoredRootIndexDoesNotCoverRoot(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte("XDOCS.md\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "XDOCS.md"), []byte("# Ignored root\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(scan.XDocsFiles) != 0 || scan.CoveredDirectories != 0 || scan.UncoveredDirectories != 1 {
		t.Fatalf("ignored root index affected coverage: %#v", scan)
	}
}

func TestSurvivingRootIndexIsOrdinaryMarkdownDocument(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "XDOCS.md"), []byte("# Legacy root\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(scan.XDocsFiles) != 0 {
		t.Fatalf("legacy root index was still treated as an xdocs descriptor: %#v", scan.XDocsFiles)
	}
	if len(scan.MarkdownDocuments) != 1 || scan.MarkdownDocuments[0].RelativePath != "XDOCS.md" {
		t.Fatalf("legacy root index was not discovered as ordinary Markdown: %#v", scan.MarkdownDocuments)
	}
	if scan.CoveredDirectories != 0 || scan.UncoveredDirectories != 1 {
		t.Fatalf("plain legacy Markdown unexpectedly covered the root: %#v", scan)
	}
}

func TestScopedTargetIsNotIgnoredByItsOwnGitignore(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "module")
	if err := os.MkdirAll(target, 0o755); err != nil {
		t.Fatal(err)
	}
	ignore := "*\n!module.xdocs.md\n!README.md\n"
	if err := os.WriteFile(filepath.Join(target, ".gitignore"), []byte(ignore), 0o644); err != nil {
		t.Fatal(err)
	}
	descriptor := `---
subject: module
description: Scoped module.
parent: null
children: []
files: {}
documents:
  README.md: Scoped overview.
tags: []
keywords: [scoped]
flags: []
---
`
	if err := os.WriteFile(filepath.Join(target, "module.xdocs.md"), []byte(descriptor), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(target, "README.md"), []byte("# Scoped overview\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(scan.XDocsFiles) != 1 || len(scan.XDocsFiles[0].Documents) != 1 {
		t.Fatalf("root traversal did not honor local negation: %#v", scan)
	}
	meta, err := ScanMetadata(cfg, MetaOptions{TargetPath: "module", IncludeDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(meta.Descriptors) != 1 || len(meta.Descriptors[0].Documents) != 1 {
		t.Fatalf("scoped traversal diverged from root traversal: %#v", meta)
	}
}

func TestGitIgnoredMetadataIsExcludedAndFrontmatterOptOutStaysTracked(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte("ignored.md\nignored.txt\nignored-dir/\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	descriptor := `---
subject: example
description: Example root module.
parent: null
children: []
files:
  ignored.txt: Git-ignored implementation.
documents:
  ignored.md: Git-ignored guide.
  README.md: Public overview without xdocs frontmatter.
  visible.md: Metadata-managed guide.
tags: []
keywords: [example]
flags: []
---
`
	if err := os.WriteFile(filepath.Join(root, "root.xdocs.md"), []byte(descriptor), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "ignored.md"), []byte("# Ignored\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "ignored.txt"), []byte("ignored\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(root, "ignored-dir"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "ignored-dir", "nested.md"), []byte("# Ignored directory\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "README.md"), []byte("# Public overview\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	visible := `---
name: Visible Guide
purpose: Explain the visible guide.
description: Searchable visible guide.
created: 2026-08-02
owner: example
flags: []
tags: []
keywords: [visible]
---
# Visible
`
	if err := os.WriteFile(filepath.Join(root, "visible.md"), []byte(visible), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	cfg.Project = "example"

	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(scan.XDocsFiles) != 1 || !scan.XDocsFiles[0].Valid {
		t.Fatalf("unexpected scan: %#v", scan)
	}
	if scan.TotalMarkdownDocuments != 2 {
		t.Fatalf("markdown documents = %d, want 2: %#v", scan.TotalMarkdownDocuments, scan.MarkdownDocuments)
	}
	if _, exists := scan.XDocsFiles[0].Metadata.Documents["ignored.md"]; exists {
		t.Fatalf("Git-ignored document remained in metadata: %#v", scan.XDocsFiles[0].Metadata.Documents)
	}
	if _, exists := scan.XDocsFiles[0].Metadata.Files["ignored.txt"]; exists {
		t.Fatalf("Git-ignored file remained in metadata: %#v", scan.XDocsFiles[0].Metadata.Files)
	}

	meta, err := ScanMetadata(cfg, MetaOptions{IncludeDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(meta.Errors) != 0 || len(meta.Descriptors) != 1 || len(meta.Descriptors[0].Documents) != 2 {
		t.Fatalf("unexpected metadata: %#v", meta)
	}
	documents := map[string]MetaDocument{}
	for _, document := range meta.Descriptors[0].Documents {
		documents[document.Name] = document
	}
	readme := documents["README.md"]
	if !readme.Valid || readme.FrontmatterRequired || readme.Owner != "example" || len(readme.Errors) != 0 {
		t.Fatalf("frontmatter opt-out was not retained as a valid tracked document: %#v", readme)
	}
	if !documents["visible.md"].FrontmatterRequired || !documents["visible.md"].Valid {
		t.Fatalf("ordinary companion frontmatter was not validated: %#v", documents["visible.md"])
	}

	context, err := FindContext(cfg, "public overview", ContextOptions{IncludeDocuments: true, Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	foundREADME := false
	for _, entry := range context.Entries {
		if entry.Path == "README.md" {
			foundREADME = true
		}
	}
	if !foundREADME {
		t.Fatalf("frontmatter opt-out document was not searchable: %#v", context.Entries)
	}
	doctor, err := Doctor(cfg, DoctorOptions{IncludeDocuments: true, WarningsAsErrors: true})
	if err != nil {
		t.Fatal(err)
	}
	if !doctor.Valid {
		t.Fatalf("frontmatter opt-out produced doctor issues: %s", strings.Join(doctorMessages(doctor), "\n"))
	}
}

func TestGenerateFallbackFiltersIgnoredAndExcludedEntries(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "notes")
	for _, directory := range []string{target, filepath.Join(target, "ignored-dir"), filepath.Join(target, "vendor")} {
		if err := os.MkdirAll(directory, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(target, ".gitignore"), []byte("secret.md\nignored-dir/\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"visible.md", "secret.md"} {
		if err := os.WriteFile(filepath.Join(target, name), []byte(name), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	cfg := config.Config{
		CWD: root, Gitignore: true, Exclude: []string{"vendor"}, Project: "example",
	}
	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	generated, err := Generate(cfg, scan, "notes")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(generated, "visible.md") {
		t.Fatalf("generate omitted visible entry: %s", generated)
	}
	for _, unwanted := range []string{"secret.md", "ignored-dir", "vendor", ".gitignore"} {
		if strings.Contains(generated, unwanted) {
			t.Fatalf("generate leaked %q: %s", unwanted, generated)
		}
	}
}

func TestInvalidDescriptorRawFrontmatterDoesNotLeakIgnoredReferences(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte("ignored.md\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	descriptor := `---
description: Invalid because subject is missing.
parent: null
children: []
files: {}
documents:
  ignored.md: Git-ignored guide.
  visible.md: Visible guide.
tags: []
keywords: []
flags: []
---
`
	if err := os.WriteFile(filepath.Join(root, "invalid.xdocs.md"), []byte(descriptor), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{CWD: root, Gitignore: true, Exclude: []string{}, Project: "example"}
	result, err := ScanMetadata(cfg, MetaOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Descriptors) != 1 || result.Descriptors[0].Metadata != nil {
		t.Fatalf("expected one invalid descriptor: %#v", result.Descriptors)
	}
	encoded, err := json.Marshal(result.Descriptors[0].Frontmatter)
	if err != nil {
		t.Fatal(err)
	}
	output := string(encoded)
	if strings.Contains(output, "ignored.md") || !strings.Contains(output, "visible.md") {
		t.Fatalf("raw invalid frontmatter was not safely filtered (%T): %s", result.Descriptors[0].Frontmatter["documents"], output)
	}
}

func TestGenerateDoesNotListIgnoredTarget(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "private")
	if err := os.MkdirAll(target, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte("private/\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(target, "secret.md"), []byte("secret"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{CWD: root, Gitignore: true, Exclude: []string{}, Project: "example"}
	scan, err := ScanProject(cfg)
	if err != nil {
		t.Fatal(err)
	}
	generated, err := Generate(cfg, scan, "private")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(generated, "Target is ignored by xdocs.") || strings.Contains(generated, "secret.md") {
		t.Fatalf("generate leaked ignored target contents: %s", generated)
	}
}

func doctorMessages(result DoctorResult) []string {
	messages := make([]string, 0, len(result.Issues))
	for _, issue := range result.Issues {
		messages = append(messages, issue.Message)
	}
	return messages
}
