package update

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestVersionTagAndSemverOrdering(t *testing.T) {
	version, ok := VersionFromTag("xdocs/v0.8.0")
	if !ok || version != "0.8.0" {
		t.Fatalf("unexpected tag parse: %q %t", version, ok)
	}
	for _, tag := range []string{"@guiho/xdocs@0.8.0", "v0.8.0", "xdocs/0.8.0"} {
		if _, ok := VersionFromTag(tag); ok {
			t.Fatalf("legacy tag accepted: %s", tag)
		}
	}
	for _, tag := range []string{
		"xdocs/v1.0.0-01",
		"xdocs/v1.0.0-alpha..1",
		"xdocs/v1.0.0+bad!",
		"xdocs/v1.0.0+",
		"xdocs/v1.0",
		"xdocs/v01.0.0",
	} {
		if _, ok := VersionFromTag(tag); ok {
			t.Fatalf("invalid SemVer tag accepted: %s", tag)
		}
	}
	if Compare("0.8.0", "0.8.0-rc.1") <= 0 || Compare("0.8.0-rc.2", "0.8.0-rc.1") <= 0 {
		t.Fatal("semantic version ordering is incorrect")
	}
}

func TestReadNoticeUsesOnlyNewerValidatedCache(t *testing.T) {
	root := t.TempDir()
	t.Setenv("XDOCS_CACHE_DIR", root)
	if err := atomicJSON(root+"/cache.json", Cache{
		NewVersionAvailable: true, LatestVersion: "0.8.0", UpgradeCommand: "xdocs upgrade", LastCheck: time.Now().UTC().Format(time.RFC3339),
	}); err != nil {
		t.Fatal(err)
	}
	if notice := ReadNotice("0.7.2"); notice == "" {
		t.Fatal("expected upgrade notice")
	}
	if notice := ReadNotice("0.8.0"); notice != "" {
		t.Fatalf("unexpected current-version notice: %s", notice)
	}
	if err := atomicJSON(root+"/cache.json", Cache{
		NewVersionAvailable: true, LatestVersion: "0.9.0", LastCheck: time.Now().Add(-25 * time.Hour).UTC().Format(time.RFC3339),
	}); err != nil {
		t.Fatal(err)
	}
	if notice := ReadNotice("0.8.0"); notice != "" {
		t.Fatalf("stale cache produced a notice: %s", notice)
	}
	if err := os.WriteFile(root+"/cache.json", []byte(`{"newVersionAvailable":true,"latestVersion":"0.9.0","lastCheck":"2026-07-24T00:00:00Z"}garbage`), 0o644); err != nil {
		t.Fatal(err)
	}
	if notice := ReadNotice("0.8.0"); notice != "" {
		t.Fatalf("trailing cache garbage produced a notice: %s", notice)
	}
}

func TestLeaseCoalescesAndRecoversAfterThirtySeconds(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cache.json.lease")
	oldToken, acquired := acquireLease(path)
	if !acquired {
		t.Fatal("first lease acquisition failed")
	}
	if _, acquired := acquireLease(path); acquired {
		t.Fatal("active lease was acquired twice")
	}
	stale := time.Now().Add(-31 * time.Second)
	if err := os.Chtimes(path, stale, stale); err != nil {
		t.Fatal(err)
	}
	newToken, acquired := acquireLease(path)
	if !acquired {
		t.Fatal("stale lease was not reclaimed")
	}
	if releaseLease(path, oldToken) {
		t.Fatal("stale worker removed the newer lease")
	}
	content, err := os.ReadFile(path)
	if err != nil || !strings.Contains(string(content), newToken) {
		t.Fatalf("newer lease ownership was lost: %q %v", content, err)
	}
	if !releaseLease(path, newToken) {
		t.Fatal("current lease owner could not release its lease")
	}
}

func TestStaleLeaseTakeoverAllowsExactlyOneConcurrentOwner(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cache.json.lease")
	if _, acquired := acquireLease(path); !acquired {
		t.Fatal("initial lease acquisition failed")
	}
	stale := time.Now().Add(-31 * time.Second)
	if err := os.Chtimes(path, stale, stale); err != nil {
		t.Fatal(err)
	}
	const contenders = 16
	var wait sync.WaitGroup
	wait.Add(contenders)
	results := make(chan string, contenders)
	for range contenders {
		go func() {
			defer wait.Done()
			if token, acquired := acquireLease(path); acquired {
				results <- token
			}
		}()
	}
	wait.Wait()
	close(results)
	var winners []string
	for token := range results {
		winners = append(winners, token)
	}
	if len(winners) != 1 {
		t.Fatalf("expected exactly one stale-lease takeover winner, got %d", len(winners))
	}
	if !releaseLease(path, winners[0]) {
		t.Fatal("winning stale-lease owner could not release")
	}
}

func TestReleaseCatalogExhaustsPaginationAndDeduplicates(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requests++
		page := request.URL.Query().Get("page")
		var releases []githubRelease
		switch page {
		case "1":
			for patch := 0; patch < 100; patch++ {
				releases = append(releases, githubRelease{Tag: fmt.Sprintf("xdocs/v1.0.%d", patch)})
			}
		case "2":
			releases = []githubRelease{
				{Tag: "xdocs/v1.0.100"},
				{Tag: "xdocs/v1.0.100"},
			}
		default:
			t.Fatalf("unexpected page request: %s", page)
		}
		if err := json.NewEncoder(writer).Encode(releases); err != nil {
			t.Error(err)
		}
	}))
	defer server.Close()

	client := &Client{HTTP: server.Client(), API: server.URL}
	releases, err := client.fetch(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if requests != 2 {
		t.Fatalf("expected two release pages, got %d", requests)
	}
	if len(releases) != 101 {
		t.Fatalf("expected 101 deduplicated releases, got %d", len(releases))
	}
	if releases[0].Version != "1.0.100" {
		t.Fatalf("catalog is not SemVer-sorted: %#v", releases[0])
	}
}
