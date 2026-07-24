package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestValidateSkillVersionRequiresBothVersionFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), "SKILL.md")
	valid := "---\nversion: \"0.8.0\"\nmetadata:\n  version: \"0.8.0\"\n---\n# Skill\n"
	if err := os.WriteFile(path, []byte(valid), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := validateSkillVersion(path, "0.8.0"); err != nil {
		t.Fatal(err)
	}
	invalid := "---\nversion: \"0.8.0\"\nmetadata:\n  version: \"0.7.2\"\n---\n# Skill\n"
	if err := os.WriteFile(path, []byte(invalid), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := validateSkillVersion(path, "0.8.0"); err == nil {
		t.Fatal("stale embedded skill metadata was accepted")
	}
}

func TestValidateOutputDirectoryRejectsDestructiveTargets(t *testing.T) {
	working, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	root := filepath.VolumeName(working) + string(filepath.Separator)
	for _, value := range []string{"", ".", working, filepath.Dir(working), root} {
		if _, err := validateOutputDirectory(value); err == nil {
			t.Fatalf("destructive output target accepted: %q", value)
		}
	}
	valid := filepath.Join(t.TempDir(), "release")
	resolved, err := validateOutputDirectory(valid)
	if err != nil || resolved != valid {
		t.Fatalf("safe output target rejected: %q %v", resolved, err)
	}
}
