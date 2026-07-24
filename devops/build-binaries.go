package main

import (
	"archive/zip"
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/CGuiho/xdocs/internal/release"
	"go.yaml.in/yaml/v3"
)

func main() {
	version := flag.String("version", "", "Semantic version embedded in every binary")
	commit := flag.String("commit", "unknown", "Source commit embedded in every binary")
	buildDate := flag.String("build-date", time.Now().UTC().Format(time.RFC3339), "Stable RFC3339 build timestamp")
	output := flag.String("output", "dist", "Artifact output directory")
	flag.Parse()

	if *version == "" {
		fatalf("--version is required")
	}
	if err := release.Validate(); err != nil {
		fatalf("release matrix: %v", err)
	}
	outputPath, err := validateOutputDirectory(*output)
	if err != nil {
		fatalf("validate --output: %v", err)
	}
	stamp, err := time.Parse(time.RFC3339, *buildDate)
	if err != nil {
		fatalf("parse --build-date: %v", err)
	}
	if err := os.RemoveAll(outputPath); err != nil {
		fatalf("clean %s: %v", outputPath, err)
	}
	if err := os.MkdirAll(outputPath, 0o755); err != nil {
		fatalf("create %s: %v", outputPath, err)
	}

	assets := make([]string, 0, 10)
	for _, target := range release.Targets {
		outputPath := filepath.Join(outputPath, target.Name)
		buildTarget := strings.TrimSuffix(target.Name, ".exe")
		ldflags := strings.Join([]string{
			"-s", "-w",
			"-X", "main.version=" + strings.TrimPrefix(*version, "v"),
			"-X", "main.commit=" + *commit,
			"-X", "main.buildDate=" + *buildDate,
			"-X", "main.buildTarget=" + buildTarget,
		}, " ")
		command := exec.Command("go", "build", "-trimpath", "-buildvcs=true", "-ldflags", ldflags, "-o", outputPath, ".")
		command.Stdout = os.Stdout
		command.Stderr = os.Stderr
		command.Env = buildEnvironment(target)
		fmt.Printf("building %s\n", target.Name)
		if err := command.Run(); err != nil {
			fatalf("build %s: %v", target.Name, err)
		}
		assets = append(assets, outputPath)
	}

	skillAsset := filepath.Join(outputPath, "guiho-s-xdocs.zip")
	skillSource := filepath.Join("skills", "guiho-s-xdocs")
	if err := validateSkillVersion(filepath.Join(skillSource, "SKILL.md"), strings.TrimPrefix(*version, "v")); err != nil {
		fatalf("validate skill version: %v", err)
	}
	if err := zipDirectory(skillSource, skillAsset, stamp); err != nil {
		fatalf("create skill archive: %v", err)
	}
	assets = append(assets, skillAsset)

	instructionAsset := filepath.Join(outputPath, "guiho-i-xdocs.md")
	if err := copyFile(filepath.Join("prompts", "guiho-i-xdocs.md"), instructionAsset); err != nil {
		fatalf("copy instruction asset: %v", err)
	}
	assets = append(assets, instructionAsset)

	sort.Strings(assets)
	if err := writeChecksums(filepath.Join(outputPath, "checksums.txt"), assets); err != nil {
		fatalf("write checksums: %v", err)
	}
	entries, err := os.ReadDir(outputPath)
	if err != nil {
		fatalf("read output: %v", err)
	}
	if len(entries) != 11 {
		fatalf("release must contain 11 artifacts, got %d", len(entries))
	}
	fmt.Println("release matrix complete: 8 binaries and 3 supporting artifacts")
}

func validateOutputDirectory(value string) (string, error) {
	if strings.TrimSpace(value) == "" {
		return "", fmt.Errorf("output directory must not be empty")
	}
	output, err := filepath.Abs(filepath.Clean(value))
	if err != nil {
		return "", err
	}
	working, err := os.Getwd()
	if err != nil {
		return "", err
	}
	working, err = filepath.Abs(working)
	if err != nil {
		return "", err
	}
	if output == working {
		return "", fmt.Errorf("output directory must not be the repository root")
	}
	if filepath.Dir(output) == output {
		return "", fmt.Errorf("output directory must not be a filesystem root")
	}
	relative, err := filepath.Rel(output, working)
	if err == nil && relative != "." && relative != ".." &&
		!strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("output directory must not contain the repository root")
	}
	return output, nil
}

func validateSkillVersion(path, expected string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	normalized := strings.ReplaceAll(string(content), "\r\n", "\n")
	if !strings.HasPrefix(normalized, "---\n") {
		return fmt.Errorf("%s is missing YAML frontmatter", path)
	}
	end := strings.Index(normalized[4:], "\n---\n")
	if end < 0 {
		return fmt.Errorf("%s has unterminated YAML frontmatter", path)
	}
	var metadata struct {
		Version  string `yaml:"version"`
		Metadata struct {
			Version string `yaml:"version"`
		} `yaml:"metadata"`
	}
	if err := yaml.Unmarshal([]byte(normalized[4:4+end]), &metadata); err != nil {
		return err
	}
	if metadata.Version != expected || metadata.Metadata.Version != expected {
		return fmt.Errorf("skill versions %q and %q must both equal release version %q", metadata.Version, metadata.Metadata.Version, expected)
	}
	return nil
}

func buildEnvironment(target release.Target) []string {
	blocked := map[string]bool{"GOOS": true, "GOARCH": true, "GOAMD64": true, "GOARM64": true, "GOARM": true, "CGO_ENABLED": true}
	environment := make([]string, 0, len(os.Environ())+4)
	for _, item := range os.Environ() {
		key, _, found := strings.Cut(item, "=")
		if found && !blocked[key] {
			environment = append(environment, item)
		}
	}
	return append(environment, "GOOS="+target.GOOS, "GOARCH="+target.GOARCH, "CGO_ENABLED=0", target.Tuning)
}

func zipDirectory(source, destination string, stamp time.Time) error {
	output, err := os.Create(destination)
	if err != nil {
		return err
	}
	archive := zip.NewWriter(output)
	var files []string
	if err := filepath.WalkDir(source, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if !entry.IsDir() {
			files = append(files, path)
		}
		return nil
	}); err != nil {
		output.Close()
		return err
	}
	sort.Strings(files)
	for _, path := range files {
		info, err := os.Stat(path)
		if err != nil {
			return err
		}
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(filepath.Dir(source), path)
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(relative)
		header.Method = zip.Deflate
		header.Modified = stamp
		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}
		input, err := os.Open(path)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(writer, input)
		closeErr := input.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
	}
	if err := archive.Close(); err != nil {
		output.Close()
		return err
	}
	return output.Close()
}

func copyFile(source, destination string) error {
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()
	output, err := os.Create(destination)
	if err != nil {
		return err
	}
	if _, err := io.Copy(output, input); err != nil {
		output.Close()
		return err
	}
	return output.Close()
}

func writeChecksums(path string, assets []string) error {
	output, err := os.Create(path)
	if err != nil {
		return err
	}
	writer := bufio.NewWriter(output)
	for _, asset := range assets {
		input, err := os.Open(asset)
		if err != nil {
			output.Close()
			return err
		}
		hash := sha256.New()
		_, copyErr := io.Copy(hash, input)
		closeErr := input.Close()
		if copyErr != nil {
			output.Close()
			return copyErr
		}
		if closeErr != nil {
			output.Close()
			return closeErr
		}
		if _, err := fmt.Fprintf(writer, "%s  %s\n", hex.EncodeToString(hash.Sum(nil)), filepath.Base(asset)); err != nil {
			output.Close()
			return err
		}
	}
	if err := writer.Flush(); err != nil {
		output.Close()
		return err
	}
	return output.Close()
}

func fatalf(format string, values ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", values...)
	os.Exit(1)
}
