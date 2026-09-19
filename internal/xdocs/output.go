package xdocs

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/CGuiho/xdocs/internal/config"
)

// WriteReport writes exactly one explicitly requested report destination. It
// performs every path and policy check before creating or truncating a file.
// Generated reports are intentionally never accepted as descriptor files.
func WriteReport(cfg config.Config, destination string, content []byte) error {
	target, existing, err := preflightReportPath(cfg, destination)
	if err != nil {
		return err
	}
	if err := validateReportContent(cfg, target, content); err != nil {
		return err
	}
	mode := os.FileMode(0o644)
	if existing != nil {
		mode = existing.Mode().Perm()
	}
	parent := filepath.Dir(target)
	temporary, err := os.CreateTemp(parent, ".xdocs-output-*")
	if err != nil {
		return fmt.Errorf("create atomic output in %s: %w", filepath.ToSlash(parent), err)
	}
	temporaryPath := temporary.Name()
	removeTemporary := true
	defer func() {
		if removeTemporary {
			_ = os.Remove(temporaryPath)
		}
	}()
	if err := temporary.Chmod(mode); err != nil {
		_ = temporary.Close()
		return fmt.Errorf("set output permissions: %w", err)
	}
	if _, err := temporary.Write(content); err != nil {
		_ = temporary.Close()
		return fmt.Errorf("write output: %w", err)
	}
	if err := temporary.Sync(); err != nil {
		_ = temporary.Close()
		return fmt.Errorf("sync output: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close output: %w", err)
	}
	if err := os.Rename(temporaryPath, target); err != nil {
		return fmt.Errorf("atomically replace output %s: %w", filepath.ToSlash(target), err)
	}
	removeTemporary = false
	return nil
}

func validateReportContent(cfg config.Config, target string, content []byte) error {
	raw, _, ok, present := ExtractFrontmatterDetailed(string(content))
	if !present {
		return nil
	}
	if !ok {
		return fmt.Errorf("refusing to write malformed report frontmatter: missing a closing delimiter")
	}
	policy, err := newPathPolicy(cfg, filepath.Dir(target))
	if err != nil {
		return err
	}
	if !policy.frontmatterRequired(target) {
		return fmt.Errorf("refusing to write Markdown frontmatter without explicit documentation.frontmatter authorization: %s", filepath.ToSlash(slashRelative(cfg.CWD, target)))
	}
	frontmatter, err := decodeFrontmatterObject(raw)
	if err != nil {
		return fmt.Errorf("refusing to write invalid report frontmatter: %w", err)
	}
	if frontmatter == nil {
		return fmt.Errorf("refusing to write report frontmatter: expected a YAML object")
	}
	if errors := validateCompanionFrontmatter(frontmatter, ""); len(errors) > 0 {
		return fmt.Errorf("refusing to write invalid companion frontmatter: %s", strings.Join(errors, "; "))
	}
	return nil
}

func preflightReportPath(cfg config.Config, destination string) (string, os.FileInfo, error) {
	if strings.TrimSpace(destination) == "" {
		return "", nil, fmt.Errorf("output destination must be a non-empty file path")
	}
	target := destination
	if !filepath.IsAbs(target) {
		target = filepath.Join(cfg.CWD, target)
	}
	target, err := filepath.Abs(target)
	if err != nil {
		return "", nil, fmt.Errorf("resolve output destination: %w", err)
	}
	relative, err := filepath.Rel(cfg.CWD, target)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) || filepath.IsAbs(relative) {
		return "", nil, fmt.Errorf("output destination must remain inside the project: %s", filepath.ToSlash(target))
	}
	base := filepath.Base(target)
	// A legacy XDOCS.md is not a descriptor, but reports must never recreate
	// the removed root-index artifact through the report destination.
	if IsDescriptorCandidate(target) || strings.EqualFold(base, "XDOCS.md") {
		return "", nil, fmt.Errorf("refusing to write a generated report to reserved descriptor destination %s; descriptor files require complete validated metadata", filepath.ToSlash(relative))
	}
	if scanExcludedPath(cfg.CWD, target, cfg.Exclude) {
		return "", nil, fmt.Errorf("output destination is excluded by scan policy: %s", filepath.ToSlash(relative))
	}
	parent := filepath.Dir(target)
	if err := ensureNoSymlinkPath(cfg.CWD, parent, false); err != nil {
		return "", nil, err
	}
	policy, err := newPathPolicy(cfg, parent)
	if err != nil {
		return "", nil, err
	}
	if policy.ignored(parent, true) || policy.ignored(target, false) {
		return "", nil, fmt.Errorf("output destination is excluded by .gitignore: %s", filepath.ToSlash(relative))
	}
	parentInfo, err := os.Stat(parent)
	if err != nil {
		return "", nil, fmt.Errorf("output parent directory does not exist: %s", filepath.ToSlash(parent))
	}
	if !parentInfo.IsDir() {
		return "", nil, fmt.Errorf("output parent is not a directory: %s", filepath.ToSlash(parent))
	}
	var existing os.FileInfo
	info, err := os.Lstat(target)
	if err == nil {
		if info.Mode()&os.ModeSymlink != 0 {
			return "", nil, fmt.Errorf("refusing to write through symlink output: %s", filepath.ToSlash(relative))
		}
		if !info.Mode().IsRegular() {
			return "", nil, fmt.Errorf("output destination is not a regular file: %s", filepath.ToSlash(relative))
		}
		existing = info
	} else if !os.IsNotExist(err) {
		return "", nil, fmt.Errorf("inspect output destination: %w", err)
	}
	return target, existing, nil
}

func ensureNoSymlinkPath(root, target string, allowMissingLeaf bool) error {
	root, err := filepath.Abs(root)
	if err != nil {
		return fmt.Errorf("resolve project root: %w", err)
	}
	target, err = filepath.Abs(target)
	if err != nil {
		return fmt.Errorf("resolve output path: %w", err)
	}
	relative, err := filepath.Rel(root, target)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return fmt.Errorf("output path escapes project root: %s", filepath.ToSlash(target))
	}
	current := root
	parts := []string{}
	if relative != "." && relative != "" {
		parts = strings.Split(relative, string(filepath.Separator))
	}
	for index, part := range parts {
		current = filepath.Join(current, part)
		info, statErr := os.Lstat(current)
		if os.IsNotExist(statErr) {
			if allowMissingLeaf && index == len(parts)-1 {
				return nil
			}
			return fmt.Errorf("output parent directory does not exist: %s", filepath.ToSlash(current))
		}
		if statErr != nil {
			return fmt.Errorf("inspect output path: %w", statErr)
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("refusing to traverse symlink output path: %s", filepath.ToSlash(current))
		}
		if index < len(parts)-1 && !info.IsDir() {
			return fmt.Errorf("output path component is not a directory: %s", filepath.ToSlash(current))
		}
	}
	return nil
}
