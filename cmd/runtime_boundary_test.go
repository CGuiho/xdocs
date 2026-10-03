package cmd

import (
	"bytes"
	"io/fs"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/CGuiho/xdocs/internal/upgrade"
)

type boundaryEntry struct {
	Mode    fs.FileMode
	Content string
	ModTime int64
}

// Snapshot the real filesystem, including empty directories, symlinks, bytes,
// permissions and regular-file mtimes. Directory mtimes are omitted because
// an explicitly allowed descriptor edit can legitimately change its parent.
func boundarySnapshot(t *testing.T, root string) map[string]boundaryEntry {
	t.Helper()
	entries := map[string]boundaryEntry{}
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		value := boundaryEntry{Mode: info.Mode()}
		if info.Mode().IsRegular() {
			content, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			value.Content = string(content)
			value.ModTime = info.ModTime().UnixNano()
		} else if info.Mode()&os.ModeSymlink != 0 {
			value.Content, err = os.Readlink(path)
			if err != nil {
				return err
			}
		}
		entries[filepath.ToSlash(relative)] = value
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return entries
}

func boundaryDelta(before, after map[string]boundaryEntry) []string {
	changed := []string{}
	for path, value := range before {
		if current, exists := after[path]; !exists || current != value {
			changed = append(changed, path)
		}
	}
	for path := range after {
		if _, exists := before[path]; !exists {
			changed = append(changed, path)
		}
	}
	sort.Strings(changed)
	return changed
}

func writeBoundaryFile(t *testing.T, root, relative, content string) {
	t.Helper()
	path := filepath.Join(root, filepath.FromSlash(relative))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o640); err != nil {
		t.Fatal(err)
	}
}

func boundaryFixture(t *testing.T) (string, string) {
	t.Helper()
	project, home := t.TempDir(), t.TempDir()
	for relative, content := range map[string]string{
		"XDOCS.md":                   "# Legacy user-owned index\r\nKeep these bytes.\r\n",
		"AGENTS.md":                  "# Agent context\n<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->\nunterminated user context\n",
		"CLAUDE.md":                  "# Instructions\r\n",
		"README.md":                  "# User introduction\n",
		"notes.md":                   "---\ncustom: preserve\n---\n# Notes\n",
		"xdocs.yaml":                 "schema: 1\nai:\n  mode: auto\ndocumentation:\n  directories: [docs]\n  frontmatter: []\nignore:\n  gitignore: true\nscan:\n  exclude: [.git, excluded]\n",
		".gitignore":                 "ignored/\n",
		"ignored/private.xdocs.md":   "---\ninvalid: [\n",
		"excluded/excluded.xdocs.md": "---\ninvalid: [\n",
		"docs/guide.md":              "# Guide\n",
		"fixture.xdocs.md":           "---\nsubject: fixture\ndescription: Boundary fixture.\nparent: null\nchildren: [fixture-docs]\nfiles:\n  xdocs.yaml: Explicit policy.\ndocuments:\n  XDOCS.md: Protected ordinary legacy document.\n  AGENTS.md: Agent context.\n  CLAUDE.md: Instructions.\n  README.md: Introduction.\n  notes.md: Notes.\ntags: []\nkeywords: [fixture]\nflags: []\n---\n# Fixture\n",
		"docs/docs.xdocs.md":         "---\nsubject: fixture-docs\ndescription: Fixture guides.\nparent: fixture\nchildren: []\nfiles: {}\ndocuments:\n  guide.md: Plain guide.\ntags: []\nkeywords: [fixture]\nflags: []\n---\n# Docs\n",
	} {
		writeBoundaryFile(t, project, relative, content)
	}
	for _, relative := range []string{
		".agents/skills/guiho-s-xdocs/SKILL.md",
		".claude/skills/guiho-s-xdocs/SKILL.md",
		".agents/skills/unrelated/SKILL.md",
		".guiho/xdocs/xdocs.yaml",
		".guiho/xdocs/cache.json",
	} {
		writeBoundaryFile(t, home, relative, "existing user-owned bytes\n")
	}
	t.Setenv("HOME", home)
	t.Setenv("USERPROFILE", home)
	t.Setenv("XDOCS_CACHE_DIR", filepath.Join(home, ".guiho", "xdocs"))
	t.Setenv("XDOCS_DISABLE_UPDATE_CHECK", "")
	t.Setenv("XDOCS_UPDATE_WORKER", "")
	completionPath, err := upgrade.CompletionPath()
	if err != nil {
		t.Fatal(err)
	}
	if err := upgrade.WriteCompletion(completionPath, upgrade.Completion{
		TargetVersion: "0.12.0", Outcome: "succeeded", Verification: "fixture",
	}); err != nil {
		t.Fatal(err)
	}
	// A regression entering SpawnWorker must be observable without spawning the
	// Go test executable recursively. A future-dated existing lease prevents
	// spawn; the guard acquisition still creates a detectable filesystem delta.
	lease := filepath.Join(home, ".guiho", "xdocs", "cache.json.lease")
	writeBoundaryFile(t, home, ".guiho/xdocs/cache.json.lease", "fixture-token\n0\n")
	future := time.Now().Add(24 * time.Hour)
	if err := os.Chtimes(lease, future, future); err != nil {
		t.Fatal(err)
	}
	return project, home
}

func executeBoundary(t *testing.T, project, home string, args ...string) (string, string, error) {
	t.Helper()
	var out, stderr bytes.Buffer
	root := NewRootCommand(Dependencies{
		In: bytes.NewBuffer(nil), Out: &out, Err: &stderr, Resources: agentTestResources(),
		WorkingDirectory: project, HomeDirectory: home,
	}, BuildInfo{Version: "0.12.0"})
	root.SetArgs(args)
	err := root.Execute()
	if err == errHelpRendered {
		err = nil
	}
	return out.String(), stderr.String(), err
}

func TestRoutineCommandsPreserveProjectAndGlobalFilesystem(t *testing.T) {
	for _, args := range [][]string{
		{"meta", "--documents", "--strict", "--format", "json"},
		{"meta", "--existing-frontmatter", "--strict"},
		{"tree", "--format", "json"},
		{"doctor", "--format", "json"},
		{"scan"}, {"list"}, {"context", "fixture", "--documents", "--files"},
		{"generate"}, {"merge"},
		{"--help"}, {"--help-tree"}, {"--help-docs"}, {"--version"},
		{"meta", "--help"}, {"agent", "instruction", "show"},
		{"agent", "skill", "list"}, {"agent", "prompt", "list"},
		{"--format", "json"},
	} {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			project, home := boundaryFixture(t)
			beforeProject, beforeHome := boundarySnapshot(t, project), boundarySnapshot(t, home)
			out, _, err := executeBoundary(t, project, home, args...)
			if err != nil || out == "" {
				t.Errorf("command failed: err=%v stdout=%q", err, out)
			}
			for name, delta := range map[string][]string{
				"project": boundaryDelta(beforeProject, boundarySnapshot(t, project)),
				"home":    boundaryDelta(beforeHome, boundarySnapshot(t, home)),
			} {
				if len(delta) != 0 {
					t.Errorf("routine command changed %s paths: %v", name, delta)
				}
			}
		})
	}
}

func TestRoutineFailuresAndRejectedReportPreserveFilesystem(t *testing.T) {
	for _, args := range [][]string{
		{"doctor"}, {"meta", "--strict"},
		{"tree", "--output", "fixture.xdocs.md"},
		{"generate", "--output", "XDOCS.md"},
		{"merge", "--output", "../outside.md"},
		{"tree", "--output", "ignored/report.md"},
		{"tree", "--output", "excluded/report.md"},
		{"meta", "--config", "absent.yaml"}, {"--unknown"},
	} {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			project, home := boundaryFixture(t)
			if args[0] == "doctor" || (args[0] == "meta" && args[1] == "--strict") {
				writeBoundaryFile(t, project, "fixture.xdocs.md", "---\nsubject: [broken\n")
			}
			beforeProject, beforeHome := boundarySnapshot(t, project), boundarySnapshot(t, home)
			_, _, err := executeBoundary(t, project, home, args...)
			if err == nil {
				t.Fatal("invalid command/metadata unexpectedly succeeded")
			}
			if delta := boundaryDelta(beforeProject, boundarySnapshot(t, project)); len(delta) != 0 {
				t.Errorf("failure changed project paths: %v", delta)
			}
			if delta := boundaryDelta(beforeHome, boundarySnapshot(t, home)); len(delta) != 0 {
				t.Errorf("failure changed home paths: %v", delta)
			}
		})
	}
}

func TestAuthorizedDescriptorMaintenanceHasOnlyNamedSuffixDelta(t *testing.T) {
	project, home := boundaryFixture(t)
	beforeProject, beforeHome := boundarySnapshot(t, project), boundarySnapshot(t, home)
	path := filepath.Join(project, "docs", "docs.xdocs.md")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	// The agent owns this exact manual descriptor update under the literal docs
	// grant. The CLI provides validation, not an automatic metadata writer.
	writeBoundaryFile(t, project, "docs/docs.xdocs.md", strings.Replace(string(content), "Fixture guides.", "Updated fixture guides.", 1))
	for _, args := range [][]string{{"meta", "docs", "--documents", "--strict"}, {"tree"}, {"doctor", "docs"}} {
		if _, _, err := executeBoundary(t, project, home, args...); err != nil {
			t.Fatal(err)
		}
	}
	if delta := boundaryDelta(beforeProject, boundarySnapshot(t, project)); !reflect.DeepEqual(delta, []string{"docs/docs.xdocs.md"}) {
		t.Fatalf("descriptor maintenance escaped its exact suffix scope: %v", delta)
	}
	if delta := boundaryDelta(beforeHome, boundarySnapshot(t, home)); len(delta) != 0 {
		t.Fatalf("descriptor validation changed global files: %v", delta)
	}
}

func TestFilesystemOracleDetectsOldDeletionAndJournalHousekeeping(t *testing.T) {
	project, home := boundaryFixture(t)
	beforeProject, beforeHome := boundarySnapshot(t, project), boundarySnapshot(t, home)
	if err := os.Remove(filepath.Join(project, "XDOCS.md")); err != nil {
		t.Fatal(err)
	}
	if delta := boundaryDelta(beforeProject, boundarySnapshot(t, project)); !reflect.DeepEqual(delta, []string{"XDOCS.md"}) {
		t.Fatalf("oracle failed to detect legacy deletion: %v", delta)
	}
	if _, found, err := upgrade.ReadAndClearCompletion(); err != nil || !found {
		t.Fatalf("old housekeeping fixture failed: found=%t err=%v", found, err)
	}
	if delta := boundaryDelta(beforeHome, boundarySnapshot(t, home)); !reflect.DeepEqual(delta, []string{".guiho/xdocs/upgrade-result.json"}) {
		t.Fatalf("oracle failed to detect real journal deletion: %v", delta)
	}
}
