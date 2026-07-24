package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.yaml.in/yaml/v3"
)

func workflow(t *testing.T, name string) string {
	t.Helper()
	content, err := os.ReadFile(filepath.Join("..", ".github", "workflows", name))
	if err != nil {
		t.Fatal(err)
	}
	return string(content)
}

func assertWorkflowYAML(t *testing.T, content string) {
	t.Helper()
	var document yaml.Node
	if err := yaml.Unmarshal([]byte(content), &document); err != nil {
		t.Fatalf("invalid GitHub Actions YAML: %v", err)
	}
	if len(document.Content) != 1 || document.Content[0].Kind != yaml.MappingNode {
		t.Fatal("workflow must be one YAML mapping document")
	}
}

func TestPublishWorkflowUsesGitVersionAndNoApprovalGate(t *testing.T) {
	content := workflow(t, "publish.yml")
	assertWorkflowYAML(t, content)
	for _, required := range []string{
		"tags:\n      - 'xdocs/v*'",
		"GITHUB_REF_NAME#xdocs/v",
		"Build exact eleven-artifact release",
		"Verify exact eleven GitHub release assets",
		"gh release delete-asset",
		"--notes-file",
		"${GITHUB_SHA}/devops/install.sh",
		"Verify exact-version public Windows installer",
		"${{ github.sha }}/devops/install.ps1",
	} {
		if !strings.Contains(content, required) {
			t.Fatalf("publish workflow is missing %q", required)
		}
	}
	for _, forbidden := range []string{
		"\n    environment:",
		"package.json",
		"bun ",
		"npm ",
		"fourteen",
		"CHANGELOG.md --notes",
	} {
		if strings.Contains(content, forbidden) {
			t.Fatalf("publish workflow contains forbidden legacy contract %q", forbidden)
		}
	}
}

func TestCIUsesGoAndExactElevenAssetGate(t *testing.T) {
	content := workflow(t, "ci.yml")
	assertWorkflowYAML(t, content)
	for _, required := range []string{
		"actions/setup-go@v5",
		"go test ./...",
		"go vet ./...",
		"Build exact eleven-artifact release matrix",
		"test \"$(find dist -maxdepth 1 -type f | wc -l)\" -eq 11",
		"SKILL_VERSION=",
		"grep -q '<!-- BEGIN XDOCS' AGENTS.md",
	} {
		if !strings.Contains(content, required) {
			t.Fatalf("CI workflow is missing %q", required)
		}
	}
	for _, forbidden := range []string{"setup-bun", "bun test", "npm ", "fourteen", "0.0.0-dev"} {
		if strings.Contains(content, forbidden) {
			t.Fatalf("CI workflow contains forbidden legacy contract %q", forbidden)
		}
	}
}
