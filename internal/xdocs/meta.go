package xdocs

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/CGuiho/xdocs/internal/apperror"
	"github.com/CGuiho/xdocs/internal/config"
)

func ScanMetadata(cfg config.Config, options MetaOptions) (MetaResult, error) {
	target := cfg.CWD
	if options.TargetPath != "" {
		target = options.TargetPath
		if !filepath.IsAbs(target) {
			target = filepath.Join(cfg.CWD, target)
		}
	}
	target, _ = filepath.Abs(target)
	info, err := os.Stat(target)
	if err != nil {
		return MetaResult{}, apperror.New(apperror.Usage, fmt.Sprintf("metadata target does not exist: %s", slashRelative(cfg.CWD, target)))
	}
	if !info.IsDir() {
		return MetaResult{}, apperror.New(apperror.Usage, fmt.Sprintf("metadata target must be a directory: %s", slashRelative(cfg.CWD, target)))
	}

	result := MetaResult{
		Root:             cfg.CWD,
		TargetPath:       displayTarget(cfg.CWD, target),
		IncludeDocuments: options.IncludeDocuments,
		Strict:           options.Strict,
		Filters:          options.Filters,
		Descriptors:      []MetaDescriptor{},
		Errors:           []string{},
	}
	documents := map[string][]MarkdownDocument{}
	err = filepath.WalkDir(target, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			if entry != nil && entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			if path != target && excluded(entry.Name(), cfg.Exclude) {
				return filepath.SkipDir
			}
			return nil
		}
		if IsDescriptor(path) {
			result.Descriptors = append(result.Descriptors, parseMetaDescriptor(path, cfg.CWD))
		} else if IsPlainMarkdown(path) {
			document := MarkdownDocument{Path: path, RelativePath: slashRelative(cfg.CWD, path), Directory: filepath.Dir(path), Name: filepath.Base(path)}
			documents[document.Directory] = append(documents[document.Directory], document)
		}
		return nil
	})
	if err != nil {
		return MetaResult{}, err
	}
	sort.Slice(result.Descriptors, func(i, j int) bool { return result.Descriptors[i].RelativePath < result.Descriptors[j].RelativePath })
	enrichMeta(result.Descriptors, documents, options.IncludeDocuments, cfg.CWD)
	result.Descriptors = filterDescriptors(result.Descriptors, options.Filters, options.IncludeDocuments)
	for _, descriptor := range result.Descriptors {
		for _, message := range descriptor.Errors {
			result.Errors = append(result.Errors, descriptor.RelativePath+": "+message)
		}
		for _, document := range descriptor.Documents {
			for _, message := range document.Errors {
				result.Errors = append(result.Errors, document.RelativePath+": "+message)
			}
		}
	}
	return result, nil
}

func parseMetaDescriptor(path, root string) MetaDescriptor {
	result := MetaDescriptor{
		Path:         path,
		RelativePath: slashRelative(root, path),
		Directory:    filepath.Dir(path),
		Documents:    []MetaDocument{},
		Errors:       []string{},
	}
	raw, ok, err := ReadFrontmatter(path)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Read frontmatter: %v", err))
		return result
	}
	if !ok {
		result.Errors = append(result.Errors, "Missing YAML frontmatter.")
		return result
	}
	metadata, frontmatter, errors := parseMetadata(raw)
	result.Metadata = metadata
	result.Frontmatter = frontmatter
	result.Errors = append(result.Errors, errors...)
	if metadata != nil {
		result.Subject = metadata.Subject
	} else {
		result.Subject = stringValue(frontmatter, "subject")
	}
	result.Valid = metadata != nil && len(result.Errors) == 0
	return result
}

func enrichMeta(descriptors []MetaDescriptor, documents map[string][]MarkdownDocument, includeDocuments bool, root string) {
	byDirectory := map[string][]int{}
	for index := range descriptors {
		byDirectory[descriptors[index].Directory] = append(byDirectory[descriptors[index].Directory], index)
	}
	for _, indexes := range byDirectory {
		if len(indexes) <= 1 {
			continue
		}
		for _, index := range indexes {
			descriptors[index].Errors = append(descriptors[index].Errors, `Multiple xdocs descriptors found in this directory. Keep exactly one named "*.xdocs.md" file per directory.`)
		}
	}
	for index := range descriptors {
		descriptor := &descriptors[index]
		if descriptor.Metadata == nil {
			continue
		}
		actual := map[string]MarkdownDocument{}
		for _, document := range documents[descriptor.Directory] {
			actual[document.Name] = document
			if _, ok := descriptor.Metadata.Documents[document.Name]; !ok {
				descriptor.Errors = append(descriptor.Errors, fmt.Sprintf(`Undocumented Markdown document: "%s" must be listed in the "documents" metadata map.`, document.Name))
			}
		}
		for name := range descriptor.Metadata.Documents {
			if !validPlainMarkdownName(name) {
				descriptor.Errors = append(descriptor.Errors, fmt.Sprintf(`Invalid document entry: "%s" must be a sibling plain "*.md" filename, not an xdocs descriptor or path.`, name))
				continue
			}
			document, ok := actual[name]
			if !ok {
				descriptor.Errors = append(descriptor.Errors, fmt.Sprintf(`Missing Markdown document: "%s" is listed in metadata but does not exist beside the descriptor.`, name))
				continue
			}
			if includeDocuments {
				descriptor.Documents = append(descriptor.Documents, parseDocument(document.Path, root, descriptor.Metadata.Subject))
			}
		}
		sort.Slice(descriptor.Documents, func(i, j int) bool {
			return descriptor.Documents[i].RelativePath < descriptor.Documents[j].RelativePath
		})
		descriptor.Valid = descriptor.Metadata != nil && len(descriptor.Errors) == 0
	}
}

func filterDescriptors(descriptors []MetaDescriptor, filters Filters, includeDocuments bool) []MetaDescriptor {
	if filters.Owner == "" && filters.Tag == "" && filters.Keyword == "" {
		return descriptors
	}
	var result []MetaDescriptor
	for _, descriptor := range descriptors {
		matchedDocuments := []MetaDocument{}
		if includeDocuments {
			for _, document := range descriptor.Documents {
				if documentMatches(document, filters) {
					matchedDocuments = append(matchedDocuments, document)
				}
			}
		}
		descriptor.Documents = matchedDocuments
		if descriptorMatches(descriptor, filters) || len(matchedDocuments) > 0 {
			result = append(result, descriptor)
		}
	}
	return result
}

func descriptorMatches(descriptor MetaDescriptor, filters Filters) bool {
	if filters.Owner != "" && !strings.EqualFold(descriptor.Subject, filters.Owner) {
		return false
	}
	if descriptor.Metadata == nil {
		return filters.Owner == "" && filters.Tag == "" && filters.Keyword == ""
	}
	if filters.Tag != "" && !containsFold(descriptor.Metadata.Tags, filters.Tag) {
		return false
	}
	if filters.Keyword != "" && !containsFold(descriptor.Metadata.Keywords, filters.Keyword) {
		return false
	}
	return true
}

func documentMatches(document MetaDocument, filters Filters) bool {
	if filters.Owner != "" && !strings.EqualFold(document.Owner, filters.Owner) {
		return false
	}
	tags, _ := stringSlice(document.Frontmatter["tags"])
	keywords, _ := stringSlice(document.Frontmatter["keywords"])
	return (filters.Tag == "" || containsFold(tags, filters.Tag)) &&
		(filters.Keyword == "" || containsFold(keywords, filters.Keyword))
}

func containsFold(values []string, expected string) bool {
	for _, value := range values {
		if strings.EqualFold(value, expected) {
			return true
		}
	}
	return false
}

func displayTarget(root, path string) string {
	relative := slashRelative(root, path)
	if relative == "." || relative == "" {
		return "."
	}
	return relative
}
