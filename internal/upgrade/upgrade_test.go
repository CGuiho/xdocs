package upgrade

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/CGuiho/xdocs/internal/update"
)

func TestReleaseTargetMatrixNames(t *testing.T) {
	targets := []string{
		"xdocs-linux-amd64", "xdocs-linux-arm64", "xdocs-linux-armv7", "xdocs-linux-armv6",
		"xdocs-darwin-amd64", "xdocs-darwin-arm64",
		"xdocs-windows-amd64", "xdocs-windows-arm64",
	}
	for _, target := range targets {
		asset := AssetName(target)
		if target[:13] == "xdocs-windows" && asset[len(asset)-4:] != ".exe" {
			t.Fatalf("Windows target lacks .exe: %s", asset)
		}
	}
}

func TestCompletionJournalRoundTripAndClear(t *testing.T) {
	root := t.TempDir()
	t.Setenv("XDOCS_CACHE_DIR", root)
	path, err := CompletionPath()
	if err != nil {
		t.Fatal(err)
	}
	expected := Completion{
		TargetVersion:  "0.8.0",
		Outcome:        "failed",
		Verification:   "xdocs v0.7.2",
		Rollback:       "succeeded",
		Recovery:       "reinstall",
		FailureMessage: "version mismatch",
	}
	if err := WriteCompletion(path, expected); err != nil {
		t.Fatal(err)
	}
	actual, found, err := ReadAndClearCompletion()
	if err != nil || !found {
		t.Fatalf("read completion: found=%v err=%v", found, err)
	}
	if actual.TargetVersion != expected.TargetVersion || actual.Outcome != expected.Outcome ||
		actual.Rollback != expected.Rollback || actual.FailureMessage != expected.FailureMessage {
		t.Fatalf("unexpected completion: %#v", actual)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("completion journal was not cleared: %v", err)
	}
	message := FormatCompletion(actual)
	for _, value := range []string{"0.8.0", "version mismatch", "succeeded", "reinstall"} {
		if !strings.Contains(message, value) {
			t.Fatalf("completion message %q lacks %q", message, value)
		}
	}
}

func TestCompletionJournalRejectsMalformedRecordAndClearsIt(t *testing.T) {
	root := t.TempDir()
	t.Setenv("XDOCS_CACHE_DIR", root)
	path, _ := CompletionPath()
	if err := os.WriteFile(path, []byte(`{"schemaVersion":1,"outcome":"maybe"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, found, err := ReadAndClearCompletion(); err == nil || found {
		t.Fatalf("malformed completion accepted: found=%v err=%v", found, err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("malformed completion was not cleared: %v", err)
	}
}

func TestCompletionJournalRejectsTrailingGarbage(t *testing.T) {
	root := t.TempDir()
	t.Setenv("XDOCS_CACHE_DIR", root)
	path, _ := CompletionPath()
	content := `{"schemaVersion":1,"targetVersion":"0.8.0","outcome":"succeeded","verification":"xdocs v0.8.0","rollback":"not required","recovery":"","completedAt":"2026-07-24T00:00:00Z"}garbage`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, found, err := ReadAndClearCompletion(); err == nil || found {
		t.Fatalf("trailing completion garbage accepted: found=%v err=%v", found, err)
	}
}

func TestUpgradeLockIsExclusiveAndOwnerSafe(t *testing.T) {
	path := filepath.Join(t.TempDir(), "xdocs-upgrade.lock")
	if err := acquireUpgradeLock(path, "first"); err != nil {
		t.Fatal(err)
	}
	if err := acquireUpgradeLock(path, "second"); err == nil {
		t.Fatal("concurrent upgrade lock was accepted")
	}
	if releaseUpgradeLock(path, "second") {
		t.Fatal("non-owner released the upgrade lock")
	}
	if !ownsUpgradeLock(path, "first") || !releaseUpgradeLock(path, "first") {
		t.Fatal("upgrade lock owner could not release its lock")
	}
}

func TestStaleUpgradeLockTakeoverAllowsExactlyOneConcurrentOwner(t *testing.T) {
	path := filepath.Join(t.TempDir(), "xdocs-upgrade.lock")
	if err := acquireUpgradeLock(path, "stale"); err != nil {
		t.Fatal(err)
	}
	stale := time.Now().Add(-upgradeLockMaxAge - time.Second)
	if err := os.Chtimes(path, stale, stale); err != nil {
		t.Fatal(err)
	}
	const contenders = 16
	var wait sync.WaitGroup
	wait.Add(contenders)
	winners := make(chan string, contenders)
	for index := range contenders {
		token := fmt.Sprintf("winner-%d", index)
		go func() {
			defer wait.Done()
			if err := acquireUpgradeLock(path, token); err == nil {
				winners <- token
			}
		}()
	}
	wait.Wait()
	close(winners)
	var tokens []string
	for token := range winners {
		tokens = append(tokens, token)
	}
	if len(tokens) != 1 {
		t.Fatalf("expected exactly one stale upgrade-lock winner, got %d", len(tokens))
	}
	if !releaseUpgradeLock(path, tokens[0]) {
		t.Fatal("stale upgrade-lock winner could not release")
	}
}

func TestUpgradeFailuresPreservePinnedRecoveryAndCleanTransaction(t *testing.T) {
	candidate := []byte("candidate executable")
	hash := sha256.Sum256(candidate)
	correctChecksum := hex.EncodeToString(hash[:])
	for _, test := range []struct {
		name              string
		checksum          string
		replaceError      error
		expectReplacement bool
	}{
		{name: "checksum mismatch", checksum: strings.Repeat("0", 64)},
		{name: "replacement failure", checksum: correctChecksum, replaceError: errors.New("injected replacement failure"), expectReplacement: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			var baseURL string
			server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
				switch request.URL.Path {
				case "/releases":
					fmt.Fprintf(writer, `[{"tag_name":"xdocs/v0.8.0","html_url":"%s/release","assets":[{"name":"xdocs-linux-amd64","browser_download_url":"%s/binary","size":%d}]}]`, baseURL, baseURL, len(candidate))
				case "/binary":
					_, _ = writer.Write(candidate)
				case "/checksums.txt":
					fmt.Fprintf(writer, "%s  xdocs-linux-amd64\n", test.checksum)
				default:
					http.NotFound(writer, request)
				}
			}))
			defer server.Close()
			baseURL = server.URL
			executable := filepath.Join(t.TempDir(), "xdocs")
			if err := os.WriteFile(executable, []byte("current"), 0o755); err != nil {
				t.Fatal(err)
			}
			replaced := false
			service := &Service{
				Releases: &update.Client{HTTP: server.Client(), API: server.URL + "/releases"},
				HTTP:     server.Client(),
				Executable: func() (string, error) {
					return executable, nil
				},
				Replace: func(plan Plan, expected string) (bool, error) {
					replaced = true
					if expected != "0.8.0" {
						t.Fatalf("unexpected replacement version: %s", expected)
					}
					if _, err := os.Stat(plan.TemporaryPath); err != nil {
						t.Fatalf("candidate missing during replacement: %v", err)
					}
					return false, test.replaceError
				},
				RuntimeGOOS: "linux",
			}
			result, err := service.Upgrade("0.7.2", "xdocs-linux-amd64", "", false, nil)
			if err == nil || result.Outcome != "failed" || result.Recovery == "" ||
				!strings.Contains(result.Recovery, "0.8.0") || result.Failure == "" {
				t.Fatalf("failure result lost recovery: %#v %v", result, err)
			}
			if replaced != test.expectReplacement {
				t.Fatalf("replacement called=%v, expected %v", replaced, test.expectReplacement)
			}
			if _, err := os.Stat(result.Plan.TemporaryPath); !os.IsNotExist(err) {
				t.Fatalf("candidate was not cleaned: %v", err)
			}
			if _, err := os.Stat(result.Plan.LockPath); !os.IsNotExist(err) {
				t.Fatalf("upgrade lock was not cleaned: %v", err)
			}
		})
	}
}

func TestUpgradeDryRunAndDowngradeDoNotDownloadOrReplace(t *testing.T) {
	var assetRequests int
	var baseURL string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/releases":
			fmt.Fprintf(writer, `[{"tag_name":"xdocs/v0.8.0","html_url":"%s/release","assets":[{"name":"xdocs-linux-amd64","browser_download_url":"%s/binary","size":1}]}]`, baseURL, baseURL)
		default:
			assetRequests++
			http.Error(writer, "unexpected asset request", http.StatusInternalServerError)
		}
	}))
	defer server.Close()
	baseURL = server.URL
	executable := filepath.Join(t.TempDir(), "xdocs")
	if err := os.WriteFile(executable, []byte("current"), 0o755); err != nil {
		t.Fatal(err)
	}
	service := &Service{
		Releases: &update.Client{HTTP: server.Client(), API: server.URL + "/releases"},
		HTTP:     server.Client(),
		Executable: func() (string, error) {
			return executable, nil
		},
		Replace: func(Plan, string) (bool, error) {
			t.Fatal("replacement called for non-mutating outcome")
			return false, nil
		},
		RuntimeGOOS: "linux",
	}
	dryRun, err := service.Upgrade("0.7.2", "xdocs-linux-amd64", "", true, nil)
	if err != nil || dryRun.Outcome != "dry-run" || dryRun.Recovery == "" {
		t.Fatalf("unexpected dry-run: %#v %v", dryRun, err)
	}
	downgrade, err := service.Upgrade("0.9.0", "xdocs-linux-amd64", "0.8.0", false, nil)
	if err == nil || downgrade.Outcome != "failed" || downgrade.Recovery == "" {
		t.Fatalf("unexpected downgrade: %#v %v", downgrade, err)
	}
	if assetRequests != 0 {
		t.Fatalf("non-mutating outcomes downloaded %d assets", assetRequests)
	}
}

func TestScheduledReplacementRetainsCandidateAndLockForHelper(t *testing.T) {
	candidate := []byte("scheduled candidate")
	hash := sha256.Sum256(candidate)
	checksum := hex.EncodeToString(hash[:])
	var baseURL string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/releases":
			fmt.Fprintf(writer, `[{"tag_name":"xdocs/v0.8.0","html_url":"%s/release","assets":[{"name":"xdocs-windows-amd64.exe","browser_download_url":"%s/binary","size":%d}]}]`, baseURL, baseURL, len(candidate))
		case "/binary":
			_, _ = writer.Write(candidate)
		case "/checksums.txt":
			fmt.Fprintf(writer, "%s  xdocs-windows-amd64.exe\n", checksum)
		default:
			http.NotFound(writer, request)
		}
	}))
	defer server.Close()
	baseURL = server.URL
	executable := filepath.Join(t.TempDir(), "xdocs.exe")
	if err := os.WriteFile(executable, []byte("current"), 0o755); err != nil {
		t.Fatal(err)
	}
	service := &Service{
		Releases: &update.Client{HTTP: server.Client(), API: server.URL + "/releases"},
		HTTP:     server.Client(),
		Executable: func() (string, error) {
			return executable, nil
		},
		Replace: func(plan Plan, expected string) (bool, error) {
			return true, nil
		},
		RuntimeGOOS: "windows",
	}
	result, err := service.Upgrade("0.7.2", "xdocs-windows-amd64", "", false, nil)
	if err != nil || !result.Scheduled || result.Outcome != "scheduled" {
		t.Fatalf("unexpected scheduled result: %#v %v", result, err)
	}
	if _, err := os.Stat(result.Plan.TemporaryPath); err != nil {
		t.Fatalf("scheduled candidate was removed before helper takeover: %v", err)
	}
	if !ownsUpgradeLock(result.Plan.LockPath, result.Plan.LockToken) {
		t.Fatal("scheduled upgrade lock was released before helper takeover")
	}
	_ = os.Remove(result.Plan.TemporaryPath)
	if !releaseUpgradeLock(result.Plan.LockPath, result.Plan.LockToken) {
		t.Fatal("test could not release transferred upgrade lock")
	}
}
