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
	content := strings.Replace(DefaultContent(project), `mode: prompt`, `mode: auto`, 1)
	if err := os.WriteFile(explicit, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(project, explicit, true)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Path != explicit || cfg.AIMode != "auto" {
		t.Fatalf("explicit configuration did not win: %#v", cfg)
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
