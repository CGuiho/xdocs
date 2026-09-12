package xdocs

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/CGuiho/xdocs/internal/config"
)

func TestWriteReportPreflightsReservedAndUnsafeDestinations(t *testing.T) {
	root := t.TempDir()
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "existing.md"), []byte("before\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := WriteReport(cfg, "existing.md", []byte("after\n")); err != nil {
		t.Fatal(err)
	}
	content, err := os.ReadFile(filepath.Join(root, "existing.md"))
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "after\n" {
		t.Fatalf("report was not replaced atomically: %q", content)
	}

	descriptorPath := filepath.Join(root, "module.xdocs.md")
	original := []byte("existing descriptor\n")
	if err := os.WriteFile(descriptorPath, original, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := WriteReport(cfg, "module.xdocs.md", []byte("report\n")); err == nil {
		t.Fatal("descriptor report destination was accepted")
	}
	unchanged, err := os.ReadFile(descriptorPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(unchanged) != string(original) {
		t.Fatalf("rejected descriptor destination changed: %q", unchanged)
	}

	if err := WriteReport(cfg, "missing/report.md", []byte("report\n")); err == nil {
		t.Fatal("missing output parent was created implicitly")
	}
	if _, err := os.Stat(filepath.Join(root, "missing")); !os.IsNotExist(err) {
		t.Fatalf("unexpected output parent after rejection: %v", err)
	}

	if err := os.Mkdir(filepath.Join(root, "excluded"), 0o755); err != nil {
		t.Fatal(err)
	}
	cfg.Exclude = []string{"excluded"}
	if err := WriteReport(cfg, "excluded/report.md", []byte("report\n")); err == nil {
		t.Fatal("excluded output destination was accepted")
	}
}

func TestWriteReportRejectsGitignoredAndSymlinkDestinations(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink permissions vary on Windows")
	}
	root := t.TempDir()
	cfg, err := config.Defaults(root)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte("private/\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(root, "private"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := WriteReport(cfg, "private/report.md", []byte("report\n")); err == nil {
		t.Fatal("Git-ignored output destination was accepted")
	}

	outside := t.TempDir()
	if err := os.WriteFile(filepath.Join(outside, "report.md"), []byte("outside\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(root, "linked")); err != nil {
		t.Fatal(err)
	}
	err = WriteReport(cfg, "linked/report.md", []byte("report\n"))
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "symlink") {
		t.Fatalf("symlink output was not rejected clearly: %v", err)
	}
	content, err := os.ReadFile(filepath.Join(outside, "report.md"))
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "outside\n" {
		t.Fatalf("symlink target changed: %q", content)
	}
}
