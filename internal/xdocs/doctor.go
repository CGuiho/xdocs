package xdocs

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/CGuiho/xdocs/internal/config"
)

func Doctor(cfg config.Config, options DoctorOptions) (DoctorResult, error) {
	target := cfg.CWD
	if options.TargetPath != "" {
		target = options.TargetPath
		if !filepath.IsAbs(target) {
			target = filepath.Join(cfg.CWD, target)
		}
	}
	target, _ = filepath.Abs(target)
	scan, err := ScanProject(cfg)
	if err != nil {
		return DoctorResult{}, err
	}
	meta, err := ScanMetadata(cfg, MetaOptions{
		TargetPath:       options.TargetPath,
		IncludeDocuments: options.IncludeDocuments,
	})
	if err != nil {
		return DoctorResult{}, err
	}
	issues := []DoctorIssue{}
	for _, file := range scan.XDocsFiles {
		if !inScope(file.Path, target) {
			continue
		}
		path := file.RelativePath
		for _, message := range file.Errors {
			issues = append(issues, DoctorIssue{Severity: "error", Code: "descriptor-invalid", Path: &path, Message: message})
		}
	}
	for _, descriptor := range meta.Descriptors {
		path := descriptor.RelativePath
		for _, message := range descriptor.Errors {
			issues = append(issues, DoctorIssue{Severity: "error", Code: "metadata-invalid", Path: &path, Message: message})
		}
		for _, document := range descriptor.Documents {
			documentPath := document.RelativePath
			severity := "warning"
			if options.WarningsAsErrors {
				severity = "error"
			}
			for _, message := range document.Errors {
				issues = append(issues, DoctorIssue{Severity: severity, Code: "document-metadata", Path: &documentPath, Message: message})
			}
		}
		if descriptor.Metadata == nil {
			continue
		}
		for name := range descriptor.Metadata.Files {
			if filepath.Base(name) != name || strings.ContainsAny(name, `/\`) {
				issues = append(issues, DoctorIssue{Severity: "error", Code: "file-entry-invalid", Path: &path, Message: fmt.Sprintf(`Invalid file entry: "%s" must be a sibling filename, not a path.`, name)})
				continue
			}
			if info, err := os.Stat(filepath.Join(descriptor.Directory, name)); err != nil || !info.Mode().IsRegular() {
				issues = append(issues, DoctorIssue{Severity: "error", Code: "file-missing", Path: &path, Message: fmt.Sprintf(`Missing documented file: "%s" is listed in metadata but does not exist beside the descriptor.`, name)})
			}
		}
	}
	validation := ValidateTree(scan.XDocsFiles)
	for _, message := range validation.Errors {
		issues = append(issues, DoctorIssue{Severity: "error", Code: "tree-invalid", Message: message})
	}
	for _, message := range validation.Warnings {
		severity := "warning"
		if options.WarningsAsErrors {
			severity = "error"
		}
		issues = append(issues, DoctorIssue{Severity: severity, Code: "tree-warning", Message: message})
	}
	issues = dedupeIssues(issues)
	summary := DoctorSummary{}
	for _, issue := range issues {
		if issue.Severity == "error" {
			summary.Errors++
		} else {
			summary.Warnings++
		}
	}
	return DoctorResult{
		Root: cfg.CWD, TargetPath: displayTarget(cfg.CWD, target),
		Valid: summary.Errors == 0, Summary: summary, Issues: issues,
	}, nil
}

func dedupeIssues(issues []DoctorIssue) []DoctorIssue {
	seen := map[string]bool{}
	result := []DoctorIssue{}
	for _, issue := range issues {
		path := ""
		if issue.Path != nil {
			path = *issue.Path
		}
		key := issue.Severity + "\x00" + issue.Code + "\x00" + path + "\x00" + issue.Message
		if !seen[key] {
			seen[key] = true
			result = append(result, issue)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Severity != result[j].Severity {
			return result[i].Severity == "error"
		}
		left, right := result[i].Message, result[j].Message
		if result[i].Path != nil {
			left = *result[i].Path + left
		}
		if result[j].Path != nil {
			right = *result[j].Path + right
		}
		return left < right
	})
	return result
}
