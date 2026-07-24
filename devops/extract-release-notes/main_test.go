package main

import (
	"strings"
	"testing"
)

func TestGoReleaseTagPattern(t *testing.T) {
	for _, tag := range []string{"xdocs/v0.8.0", "xdocs/v0.9.0-rc.1"} {
		if !tagPattern.MatchString(tag) {
			t.Fatalf("valid tag rejected: %s", tag)
		}
	}
	for _, tag := range []string{"@guiho/xdocs@0.8.0", "v0.8.0", "xdocs/0.8.0"} {
		if tagPattern.MatchString(tag) {
			t.Fatalf("legacy tag accepted: %s", tag)
		}
	}
}

func TestExtractVersionSectionWithReleaseDate(t *testing.T) {
	changelog := "# Changelog\n\n## 0.8.0 - 2026-07-24\n\n- Go rewrite.\n\n## 0.7.2 - 2026-07-23\n\n- Legacy.\n"
	notes, err := extractVersionSection(changelog, "0.8.0")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(notes, "Go rewrite") || strings.Contains(notes, "Legacy") {
		t.Fatalf("unexpected exact-version notes:\n%s", notes)
	}
}

func TestExtractVersionSectionRejectsMissingDuplicateAndEmpty(t *testing.T) {
	cases := []string{
		"## 0.7.2\n\n- old\n",
		"## 0.8.0\n\n- one\n\n## 0.8.0 - 2026-07-24\n\n- two\n",
		"## 0.8.0\n\n## 0.7.2\n\n- old\n",
	}
	for _, changelog := range cases {
		if _, err := extractVersionSection(changelog, "0.8.0"); err == nil {
			t.Fatalf("invalid changelog accepted:\n%s", changelog)
		}
	}
}
