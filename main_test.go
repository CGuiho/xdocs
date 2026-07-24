package main

import (
	"io/fs"
	"strings"
	"testing"

	"go.yaml.in/yaml/v3"
)

func TestEmbeddedSkillMatchesFirstGoReleaseVersion(t *testing.T) {
	content, err := fs.ReadFile(agentResources, "skills/guiho-s-xdocs/SKILL.md")
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.SplitN(strings.ReplaceAll(string(content), "\r\n", "\n"), "\n---\n", 2)
	if len(parts) != 2 || !strings.HasPrefix(parts[0], "---\n") {
		t.Fatal("embedded skill is missing YAML frontmatter")
	}
	var metadata struct {
		Version  string `yaml:"version"`
		Metadata struct {
			Version string `yaml:"version"`
		} `yaml:"metadata"`
	}
	if err := yaml.Unmarshal([]byte(strings.TrimPrefix(parts[0], "---\n")), &metadata); err != nil {
		t.Fatal(err)
	}
	if metadata.Version != "0.8.0" || metadata.Metadata.Version != "0.8.0" {
		t.Fatalf("embedded skill version mismatch: %#v", metadata)
	}
}
