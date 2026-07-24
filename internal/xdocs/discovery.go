package xdocs

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/CGuiho/xdocs/internal/config"
)

const (
	descriptorSuffix = ".xdocs.md"
	rootFilename     = "XDOCS.md"
)

func ScanProject(cfg config.Config) (ScanResult, error) {
	result := ScanResult{
		XDocsFiles:        []File{},
		MarkdownDocuments: []MarkdownDocument{},
		UncoveredPaths:    []string{},
	}
	documentsByDirectory := map[string][]MarkdownDocument{}
	var directories []string

	err := filepath.WalkDir(cfg.CWD, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			if entry != nil && entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			if path != cfg.CWD && excluded(entry.Name(), cfg.Exclude) {
				return filepath.SkipDir
			}
			directories = append(directories, path)
			return nil
		}
		result.TotalFiles++
		switch {
		case IsDescriptor(path):
			result.XDocsFiles = append(result.XDocsFiles, ParseFile(path, cfg.CWD))
		case IsPlainMarkdown(path):
			document := MarkdownDocument{
				Path:         path,
				RelativePath: slashRelative(cfg.CWD, path),
				Directory:    filepath.Dir(path),
				Name:         filepath.Base(path),
			}
			result.MarkdownDocuments = append(result.MarkdownDocuments, document)
			documentsByDirectory[document.Directory] = append(documentsByDirectory[document.Directory], document)
		}
		return nil
	})
	if err != nil {
		return ScanResult{}, err
	}

	rootPath := filepath.Join(cfg.CWD, rootFilename)
	if content, readErr := os.ReadFile(rootPath); readErr == nil {
		result.XDocsFiles = append(result.XDocsFiles, File{
			Path: rootPath, RelativePath: rootFilename, Directory: cfg.CWD,
			Documents: []MarkdownDocument{}, Body: string(content), Valid: false, Errors: []string{},
		})
	}
	sort.Slice(result.XDocsFiles, func(i, j int) bool { return result.XDocsFiles[i].RelativePath < result.XDocsFiles[j].RelativePath })
	sort.Slice(result.MarkdownDocuments, func(i, j int) bool {
		return result.MarkdownDocuments[i].RelativePath < result.MarkdownDocuments[j].RelativePath
	})
	enrichFiles(result.XDocsFiles, documentsByDirectory)

	covered := map[string]bool{}
	if info, err := os.Stat(rootPath); err == nil && info.Mode().IsRegular() {
		covered[cfg.CWD] = true
	}
	for _, file := range result.XDocsFiles {
		if file.Valid {
			covered[file.Directory] = true
		}
	}
	for _, directory := range directories {
		if !covered[directory] {
			result.UncoveredPaths = append(result.UncoveredPaths, slashRelative(cfg.CWD, directory))
		}
	}
	result.TotalDirectories = len(directories)
	result.TotalMarkdownDocuments = len(result.MarkdownDocuments)
	result.CoveredDirectories = len(covered)
	result.UncoveredDirectories = len(result.UncoveredPaths)
	return result, nil
}

func IsDescriptor(path string) bool {
	return strings.HasSuffix(strings.ToLower(filepath.Base(path)), descriptorSuffix)
}

func IsPlainMarkdown(path string) bool {
	name := filepath.Base(path)
	lower := strings.ToLower(name)
	return strings.HasSuffix(lower, ".md") && !strings.EqualFold(name, rootFilename) && !IsDescriptor(path)
}

func excluded(name string, values []string) bool {
	if strings.HasPrefix(name, ".") {
		return true
	}
	for _, value := range values {
		if name == value {
			return true
		}
	}
	return false
}

func enrichFiles(files []File, documents map[string][]MarkdownDocument) {
	byDirectory := map[string][]int{}
	for index := range files {
		if !IsDescriptor(files[index].Path) {
			continue
		}
		byDirectory[files[index].Directory] = append(byDirectory[files[index].Directory], index)
	}
	for _, indexes := range byDirectory {
		if len(indexes) <= 1 {
			continue
		}
		for _, index := range indexes {
			files[index].Errors = append(files[index].Errors, `Multiple xdocs descriptors found in this directory. Keep exactly one named "*.xdocs.md" file per directory.`)
			files[index].Valid = false
		}
	}
	for index := range files {
		file := &files[index]
		if !IsDescriptor(file.Path) {
			continue
		}
		file.Documents = append([]MarkdownDocument(nil), documents[file.Directory]...)
		sort.Slice(file.Documents, func(i, j int) bool { return file.Documents[i].Name < file.Documents[j].Name })
		validateDocumentReferences(file)
		file.Valid = file.Metadata != nil && len(file.Errors) == 0
	}
}

func validateDocumentReferences(file *File) {
	if file.Metadata == nil {
		return
	}
	actual := map[string]bool{}
	for _, document := range file.Documents {
		actual[document.Name] = true
		if _, ok := file.Metadata.Documents[document.Name]; !ok {
			file.Errors = append(file.Errors, fmt.Sprintf(`Undocumented Markdown document: "%s" must be listed in the "documents" metadata map.`, document.Name))
		}
	}
	for name := range file.Metadata.Documents {
		if !validPlainMarkdownName(name) {
			file.Errors = append(file.Errors, fmt.Sprintf(`Invalid document entry: "%s" must be a sibling plain "*.md" filename, not an xdocs descriptor or path.`, name))
		} else if !actual[name] {
			file.Errors = append(file.Errors, fmt.Sprintf(`Missing Markdown document: "%s" is listed in metadata but does not exist beside the descriptor.`, name))
		}
	}
}

func validPlainMarkdownName(name string) bool {
	lower := strings.ToLower(name)
	return filepath.Base(name) == name && !strings.ContainsAny(name, `/\`) &&
		strings.HasSuffix(lower, ".md") && !strings.EqualFold(name, rootFilename) &&
		!strings.HasSuffix(lower, descriptorSuffix)
}

func inScope(path, target string) bool {
	relative, err := filepath.Rel(target, path)
	return err == nil && relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator))
}
