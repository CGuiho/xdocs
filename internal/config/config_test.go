package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadUsesExplicitProjectGlobalPrecedence(t *testing.T) {
	project := t.TempDir()
	global := t.TempDir()
	t.Setenv("USERPROFILE", global)
	t.Setenv("HOME", global)

	if err := os.WriteFile(filepath.Join(project, Filename), []byte(DefaultContent(project)), 0o644); err != nil {
		t.Fatal(err)
	}
	explicit := filepath.Join(t.TempDir(), Filename)
	content := strings.Replace(DefaultContent(project), `mode: auto`, `mode: prompt`, 1)
	if err := os.WriteFile(explicit, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(project, explicit, true)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Path != explicit || cfg.AIMode != "prompt" {
		t.Fatalf("explicit configuration did not win: %#v", cfg)
	}
}

func TestAIModeDefaultsToAuto(t *testing.T) {
	root := t.TempDir()

	defaults, err := Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	if defaults.AIMode != "auto" {
		t.Fatalf("in-memory default AI mode = %q, want auto", defaults.AIMode)
	}
	if !strings.Contains(DefaultContent(root), "ai:\n  mode: auto\n") {
		t.Fatalf("generated configuration does not use auto mode:\n%s", DefaultContent(root))
	}

	path := filepath.Join(root, Filename)
	if err := os.WriteFile(path, []byte("schema: 1\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(root, "", true)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.AIMode != "auto" {
		t.Fatalf("omitted ai.mode = %q, want auto", cfg.AIMode)
	}
}

func TestIgnoreDefaultsAndGeneratedConfiguration(t *testing.T) {
	root := t.TempDir()
	defaults, err := Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	if !defaults.Gitignore {
		t.Fatal("in-memory defaults disabled .gitignore")
	}
	want := []string{"AGENTS.md", "README.md", "CLAUDE.md"}
	if len(defaults.IgnoreRules) != len(want) {
		t.Fatalf("default ignore rules = %#v", defaults.IgnoreRules)
	}
	for index, pattern := range want {
		rule := defaults.IgnoreRules[index]
		if rule.Pattern != pattern || rule.Kind != "file" || rule.Frontmatter {
			t.Fatalf("default ignore rule %d = %#v", index, rule)
		}
	}
	content := DefaultContent(root)
	for _, expected := range []string{"ignore:\n  gitignore: true\n", "pattern: AGENTS.md", "frontmatter: false"} {
		if !strings.Contains(content, expected) {
			t.Fatalf("generated configuration missing %q:\n%s", expected, content)
		}
	}

	path := filepath.Join(root, Filename)
	if err := os.WriteFile(path, []byte("schema: 1\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(root, "", true)
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.Gitignore || len(cfg.IgnoreRules) != 3 {
		t.Fatalf("omitted ignore section lost defaults: %#v", cfg)
	}
}

func TestIgnoreSupportsExplicitDisableAndRules(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, Filename)
	content := `schema: 1
ignore:
  gitignore: false
  rules:
    - pattern: docs/private/
      kind: directory
      frontmatter: false
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(root, "", true)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Gitignore || len(cfg.IgnoreRules) != 1 || cfg.IgnoreRules[0].Kind != "directory" || cfg.IgnoreRules[0].Pattern != "docs/private" {
		t.Fatalf("explicit ignore configuration was not retained: %#v", cfg)
	}

	if err := os.WriteFile(path, []byte("schema: 1\nignore:\n  rules: []\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err = Load(root, "", true)
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.Gitignore || len(cfg.IgnoreRules) != 0 {
		t.Fatalf("explicit empty ignore rules were replaced with defaults: %#v", cfg)
	}
}

func TestIgnoreRejectsInvalidRules(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, Filename)
	tests := []string{
		"pattern: ''\n      kind: file\n      frontmatter: false",
		"pattern: /README.md\n      kind: file\n      frontmatter: false",
		"pattern: docs\\README.md\n      kind: file\n      frontmatter: false",
		"pattern: docs//README.md\n      kind: file\n      frontmatter: false",
		"pattern: ./README.md\n      kind: file\n      frontmatter: false",
		"pattern: docs/./private\n      kind: directory\n      frontmatter: false",
		"pattern: ./\n      kind: directory\n      frontmatter: false",
		"pattern: ../README.md\n      kind: file\n      frontmatter: false",
		"pattern: docs/[abc\n      kind: directory\n      frontmatter: false",
		"pattern: README.md/\n      kind: file\n      frontmatter: false",
		"pattern: README.md\n      kind: document\n      frontmatter: false",
		"pattern: README.md\n      kind: file",
		"pattern: README.md\n      kind: file\n      frontmatter: true",
	}
	for _, rule := range tests {
		content := "schema: 1\nignore:\n  rules:\n    - " + rule + "\n"
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
		if _, err := Load(root, "", true); err == nil {
			t.Fatalf("invalid ignore rule accepted:\n%s", content)
		}
	}
}

func TestAIModeSupportsAutoAndPrompt(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, Filename)
	for _, mode := range []string{"auto", "prompt"} {
		if err := os.WriteFile(path, []byte("schema: 1\nai:\n  mode: "+mode+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		cfg, err := Load(root, "", true)
		if err != nil {
			t.Fatalf("supported ai.mode %q was rejected: %v", mode, err)
		}
		if cfg.AIMode != mode {
			t.Fatalf("loaded ai.mode = %q, want %q", cfg.AIMode, mode)
		}
	}
}

func TestLoadRejectsUnknownAndSemanticFields(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, Filename)
	if err := os.WriteFile(path, []byte("schema: 1\nunknown: true\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := Load(root, "", true); err == nil {
		t.Fatal("expected unknown field rejection")
	}
	if err := os.WriteFile(path, []byte("schema: 1\nai:\n  mode: sometimes\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := Load(root, "", true); err == nil {
		t.Fatal("expected semantic validation error")
	}
}

func TestLoadRejectsMultipleDocuments(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, Filename), []byte("schema: 1\n---\nschema: 1\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := Load(root, "", true); err == nil {
		t.Fatal("expected multiple document rejection")
	}
}

func TestLoadDistinguishesMissingSectionsFromExplicitEmptyValues(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, Filename)
	if err := os.WriteFile(path, []byte("schema: 1\nscan:\n  exclude: []\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(root, "", true)
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.Exclude) != 0 {
		t.Fatalf("explicit empty exclusions were replaced with defaults: %#v", cfg.Exclude)
	}
	for _, invalid := range []string{
		"schema: 1\nextensions:\n  supported: []\n",
		"schema: 1\nproject:\n  name: '  '\n",
		"schema: 1\nai: {}\n",
	} {
		if err := os.WriteFile(path, []byte(invalid), 0o644); err != nil {
			t.Fatal(err)
		}
		if _, err := Load(root, "", true); err == nil {
			t.Fatalf("invalid explicit configuration accepted:\n%s", invalid)
		}
	}
}

func TestLoadDistinguishesMissingSchemaFromExplicitZero(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, Filename)
	for _, valid := range []string{"project:\n  name: example\n", "schema: 1\n"} {
		if err := os.WriteFile(path, []byte(valid), 0o644); err != nil {
			t.Fatal(err)
		}
		if _, err := Load(root, "", true); err != nil {
			t.Fatalf("valid schema form rejected:\n%s\n%v", valid, err)
		}
	}
	for _, invalid := range []string{"schema: 0\n", "schema: 2\n", "schema: -1\n", "schema: null\n", "schema: one\n"} {
		if err := os.WriteFile(path, []byte(invalid), 0o644); err != nil {
			t.Fatal(err)
		}
		if _, err := Load(root, "", true); err == nil {
			t.Fatalf("invalid schema accepted:\n%s", invalid)
		}
	}
}

func TestResolveRejectsNonRegularHigherPrecedenceConfiguration(t *testing.T) {
	project := t.TempDir()
	global := t.TempDir()
	t.Setenv("USERPROFILE", global)
	t.Setenv("HOME", global)
	if err := os.Mkdir(filepath.Join(project, Filename), 0o755); err != nil {
		t.Fatal(err)
	}
	globalPath := filepath.Join(global, ".guiho", "xdocs")
	if err := os.MkdirAll(globalPath, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(globalPath, Filename), []byte(DefaultContent(project)), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := Load(project, "", false); err == nil {
		t.Fatal("non-regular project configuration silently fell through to global configuration")
	}
	if _, _, err := Resolve(project, filepath.Join(project, Filename)); err == nil {
		t.Fatal("explicit directory was accepted as a configuration file")
	}
}
