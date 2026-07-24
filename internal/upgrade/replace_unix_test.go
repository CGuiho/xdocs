//go:build !windows

package upgrade

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeExecutable(t *testing.T, path, version string) {
	t.Helper()
	content := "#!/bin/sh\nprintf '%s\\n' 'xdocs v" + version + "'\n"
	if err := os.WriteFile(path, []byte(content), 0o755); err != nil {
		t.Fatal(err)
	}
}

func TestUnixReplacementVerifiesAndCommits(t *testing.T) {
	root := t.TempDir()
	current := filepath.Join(root, "xdocs")
	candidate := filepath.Join(root, "candidate")
	backup := filepath.Join(root, "backup")
	writeExecutable(t, current, "0.7.2")
	writeExecutable(t, candidate, "0.8.0")
	scheduled, err := replaceExecutable(Plan{
		ExecutablePath: current,
		TemporaryPath:  candidate,
		BackupPath:     backup,
	}, "0.8.0")
	if err != nil || scheduled {
		t.Fatalf("unexpected replacement result: scheduled=%v err=%v", scheduled, err)
	}
	content, err := os.ReadFile(current)
	if err != nil || !strings.Contains(string(content), "0.8.0") {
		t.Fatalf("candidate was not committed: %q %v", content, err)
	}
	if _, err := os.Stat(backup); !os.IsNotExist(err) {
		t.Fatalf("successful replacement retained backup: %v", err)
	}
}

func TestUnixReplacementRestoresOldExecutableAfterVerificationFailure(t *testing.T) {
	root := t.TempDir()
	current := filepath.Join(root, "xdocs")
	candidate := filepath.Join(root, "candidate")
	backup := filepath.Join(root, "backup")
	writeExecutable(t, current, "0.7.2")
	writeExecutable(t, candidate, "9.9.9")
	if _, err := replaceExecutable(Plan{
		ExecutablePath: current,
		TemporaryPath:  candidate,
		BackupPath:     backup,
	}, "0.8.0"); err == nil {
		t.Fatal("wrong-version candidate was accepted")
	}
	content, err := os.ReadFile(current)
	if err != nil || !strings.Contains(string(content), "0.7.2") {
		t.Fatalf("old executable was not restored: %q %v", content, err)
	}
}
