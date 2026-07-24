package agent

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func testResources() fs.FS {
	return fstest.MapFS{
		"skills/guiho-s-xdocs/SKILL.md": {Data: []byte("---\nname: guiho-s-xdocs\ndescription: XDocs skill.\nmetadata:\n  version: 0.8.0\n---\n# Skill\n")},
		"prompts/write.md":              {Data: []byte("---\nname: write\ndescription: Write docs.\n---\nWrite.")},
		"prompts/update.md":             {Data: []byte("---\nname: update\ndescription: Update docs.\n---\nUpdate.")},
		"prompts/agents.md":             {Data: []byte("---\nname: agents\ndescription: Update agents.\n---\nAgents.")},
		"prompts/generate.md":           {Data: []byte("---\nname: generate\ndescription: Generate docs.\n---\nGenerate.")},
	}
}

func TestInstallAndUninstallBothLocalTargets(t *testing.T) {
	root := t.TempDir()
	service := New(testResources())
	results, err := service.Install("local", root)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 2 {
		t.Fatalf("expected two targets, got %d", len(results))
	}
	for _, relative := range []string{".agents/skills/guiho-s-xdocs/SKILL.md", ".claude/skills/guiho-s-xdocs/SKILL.md"} {
		if _, err := os.Stat(filepath.Join(root, filepath.FromSlash(relative))); err != nil {
			t.Fatal(err)
		}
	}
	removed, err := service.Uninstall("local", root)
	if err != nil || len(removed) != 2 {
		t.Fatalf("unexpected uninstall: %v %#v", err, removed)
	}
}

func TestInstallTransactionallyReplacesExistingDirectoryWithoutSkillFile(t *testing.T) {
	root := t.TempDir()
	destination := filepath.Join(root, ".agents", "skills", SkillName)
	if err := os.MkdirAll(destination, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(destination, "orphan.txt"), []byte("old"), 0o644); err != nil {
		t.Fatal(err)
	}
	results, err := New(testResources()).Install("local", root)
	if err != nil {
		t.Fatal(err)
	}
	if !results[0].Updated || results[0].Installed {
		t.Fatalf("existing directory was not reported as updated: %#v", results[0])
	}
	if _, err := os.Stat(filepath.Join(destination, "SKILL.md")); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(destination, "orphan.txt")); !os.IsNotExist(err) {
		t.Fatalf("orphaned prior content survived replacement: %v", err)
	}
}

func TestInstructionsAreIdempotentAndPreserveContent(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "AGENTS.md")
	if err := os.WriteFile(path, []byte("# Existing\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	first, err := ApplyInstructions(root)
	if err != nil {
		t.Fatal(err)
	}
	second, err := ApplyInstructions(root)
	if err != nil {
		t.Fatal(err)
	}
	if !first[0].Changed || second[0].Changed {
		t.Fatalf("instruction operation was not idempotent: %#v %#v", first, second)
	}
	content, _ := os.ReadFile(path)
	if string(content[:10]) != "# Existing" {
		t.Fatalf("existing content was not preserved: %s", content)
	}
}

func TestPromptCatalogIsEmbedded(t *testing.T) {
	prompts, err := New(testResources()).Prompts()
	if err != nil {
		t.Fatal(err)
	}
	if len(prompts) != 4 {
		t.Fatalf("expected four prompts, got %d", len(prompts))
	}
}

func TestSkillInstallStagesBothTargetsBeforeMutation(t *testing.T) {
	root := t.TempDir()
	agentsSkill := filepath.Join(root, ".agents", "skills", SkillName)
	if err := os.MkdirAll(agentsSkill, 0o755); err != nil {
		t.Fatal(err)
	}
	old := []byte("old-skill")
	if err := os.WriteFile(filepath.Join(agentsSkill, "SKILL.md"), old, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, ".claude"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".claude", "skills"), []byte("blocking-file"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := New(testResources()).Install("local", root); err == nil {
		t.Fatal("expected second-target staging failure")
	}
	current, err := os.ReadFile(filepath.Join(agentsSkill, "SKILL.md"))
	if err != nil || string(current) != string(old) {
		t.Fatalf("first target changed before both stages succeeded: %q %v", current, err)
	}
}

func TestInstructionReconciliationPreservesUnmanagedBytesAndCRLF(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "AGENTS.md")
	oldBlock := strings.ReplaceAll(instructionBegin+"\nold\n"+instructionEnd, "\n", "\r\n")
	prefix := "\r\n  unmanaged prefix  \r\n"
	suffix := "\r\n  unmanaged suffix  \r\n\r\n"
	original := prefix + oldBlock + suffix
	if err := os.WriteFile(path, []byte(original), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := ApplyInstructions(root); err != nil {
		t.Fatal(err)
	}
	updated, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	text := string(updated)
	if !strings.HasPrefix(text, prefix) || !strings.HasSuffix(text, suffix) {
		t.Fatalf("unmanaged bytes changed:\n%q", text)
	}
	if strings.Count(text, instructionBegin) != 1 || strings.Contains(text, "\nold\n") {
		t.Fatalf("instruction block was not replaced exactly once:\n%s", text)
	}
}

func TestRollbackFailurePreservesRecoverableBackup(t *testing.T) {
	root := t.TempDir()
	destination := filepath.Join(root, "skill")
	backup := filepath.Join(root, "skill-backup")
	if err := os.MkdirAll(destination, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(backup, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(backup, "SKILL.md"), []byte("recoverable"), 0o644); err != nil {
		t.Fatal(err)
	}
	stages := []skillStage{{
		destination:         destination,
		backup:              backup,
		destinationBackedUp: true,
	}}
	if err := rollbackSkillStages(stages); err == nil {
		t.Fatal("expected injected rollback restore failure")
	}
	content, err := os.ReadFile(filepath.Join(backup, "SKILL.md"))
	if err != nil || string(content) != "recoverable" {
		t.Fatalf("rollback failure destroyed recoverable backup: %q %v", content, err)
	}
}
