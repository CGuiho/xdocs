package main

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

var tagPattern = regexp.MustCompile(`^xdocs/v([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)$`)

func main() {
	if len(os.Args) != 4 {
		fatal("usage: go run ./devops/extract-release-notes <tag> <changelog> <output>")
	}
	match := tagPattern.FindStringSubmatch(os.Args[1])
	if match == nil {
		fatal("invalid XDocs Go release tag: " + os.Args[1])
	}
	content, err := os.ReadFile(os.Args[2])
	if err != nil {
		fatal(err.Error())
	}
	notes, err := extractVersionSection(string(content), match[1])
	if err != nil {
		fatal(err.Error())
	}
	if err := os.WriteFile(os.Args[3], []byte(notes), 0o644); err != nil {
		fatal(err.Error())
	}
}

func extractVersionSection(content, version string) (string, error) {
	headingPrefix := "## " + version
	lines := strings.Split(strings.ReplaceAll(string(content), "\r\n", "\n"), "\n")
	start := -1
	for index, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == headingPrefix || strings.HasPrefix(trimmed, headingPrefix+" - ") {
			if start != -1 {
				return "", fmt.Errorf("duplicate changelog section: %s", headingPrefix)
			}
			start = index
		}
	}
	if start == -1 {
		return "", fmt.Errorf("missing changelog section: %s", headingPrefix)
	}
	end := len(lines)
	for index := start + 1; index < len(lines); index++ {
		if strings.HasPrefix(lines[index], "## ") {
			end = index
			break
		}
	}
	body := strings.TrimSpace(strings.Join(lines[start+1:end], "\n"))
	if body == "" {
		return "", fmt.Errorf("empty changelog section: %s", headingPrefix)
	}
	notes := strings.TrimSpace(strings.Join(lines[start:end], "\n")) + "\n"
	return notes, nil
}

func fatal(message string) {
	fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
