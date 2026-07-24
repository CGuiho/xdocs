package xdocs

import (
	"path/filepath"
	"sort"
	"strings"

	"github.com/CGuiho/xdocs/internal/apperror"
	"github.com/CGuiho/xdocs/internal/config"
)

type weightedField struct {
	label  string
	value  string
	weight int
}

func FindContext(cfg config.Config, query string, options ContextOptions) (ContextResult, error) {
	tokens := tokenize(query)
	if len(tokens) == 0 {
		return ContextResult{}, apperror.New(apperror.Usage, "xdocs context requires a non-empty query")
	}
	if options.Limit < 1 {
		return ContextResult{}, apperror.New(apperror.Usage, "xdocs context --limit must be a positive integer")
	}
	meta, err := ScanMetadata(cfg, MetaOptions{
		TargetPath:       options.TargetPath,
		IncludeDocuments: options.IncludeDocuments,
		Filters:          options.Filters,
	})
	if err != nil {
		return ContextResult{}, err
	}
	result := ContextResult{
		Root:             meta.Root,
		TargetPath:       meta.TargetPath,
		Query:            query,
		Tokens:           tokens,
		IncludeDocuments: options.IncludeDocuments,
		IncludeFiles:     options.IncludeFiles,
		Filters:          options.Filters,
		Entries:          []ContextEntry{},
	}
	for _, descriptor := range meta.Descriptors {
		if descriptor.Metadata == nil {
			continue
		}
		score, reasons := scoreFields(tokens, []weightedField{
			{"subject", descriptor.Metadata.Subject, 8},
			{"description", descriptor.Metadata.Description, 4},
			{"tags", strings.Join(descriptor.Metadata.Tags, " "), 6},
			{"keywords", strings.Join(descriptor.Metadata.Keywords, " "), 7},
			{"files", mapText(descriptor.Metadata.Files), 2},
			{"documents", mapText(descriptor.Metadata.Documents), 2},
		})
		if score > 0 {
			result.Entries = append(result.Entries, ContextEntry{
				Kind: "descriptor", Path: descriptor.RelativePath, Source: descriptor.RelativePath,
				Owner: descriptor.Metadata.Subject, Score: score, Reasons: reasons,
				Description: descriptor.Metadata.Description,
			})
		}
		if options.IncludeFiles {
			for name, description := range descriptor.Metadata.Files {
				score, reasons := scoreFields(tokens, []weightedField{
					{"file", name, 7}, {"description", description, 4},
					{"owner", descriptor.Metadata.Subject, 2},
					{"descriptor keywords", strings.Join(descriptor.Metadata.Keywords, " "), 2},
				})
				if score > 0 {
					result.Entries = append(result.Entries, ContextEntry{
						Kind: "file", Path: filepath.ToSlash(filepath.Join(filepath.Dir(descriptor.RelativePath), name)),
						Source: descriptor.RelativePath, Owner: descriptor.Metadata.Subject,
						Score: score, Reasons: reasons, Description: description,
					})
				}
			}
		}
		if options.IncludeDocuments {
			for _, document := range descriptor.Documents {
				tags, _ := stringSlice(document.Frontmatter["tags"])
				keywords, _ := stringSlice(document.Frontmatter["keywords"])
				description := stringValue(document.Frontmatter, "description")
				if description == "" {
					description = descriptor.Metadata.Documents[document.Name]
				}
				score, reasons := scoreFields(tokens, []weightedField{
					{"document", document.Name, 7}, {"description", description, 4},
					{"purpose", stringValue(document.Frontmatter, "purpose"), 5},
					{"owner", document.Owner, 3}, {"tags", strings.Join(tags, " "), 6},
					{"keywords", strings.Join(keywords, " "), 7},
				})
				if score > 0 {
					result.Entries = append(result.Entries, ContextEntry{
						Kind: "document", Path: document.RelativePath, Source: descriptor.RelativePath,
						Owner: document.Owner, Score: score, Reasons: reasons, Description: description,
					})
				}
			}
		}
	}
	sort.Slice(result.Entries, func(i, j int) bool {
		if result.Entries[i].Score != result.Entries[j].Score {
			return result.Entries[i].Score > result.Entries[j].Score
		}
		return result.Entries[i].Path < result.Entries[j].Path
	})
	if len(result.Entries) > options.Limit {
		result.Entries = result.Entries[:options.Limit]
	}
	return result, nil
}

func tokenize(query string) []string {
	seen := map[string]bool{}
	var tokens []string
	for _, token := range strings.FieldsFunc(strings.ToLower(query), func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}) {
		if len(token) >= 2 && !seen[token] {
			seen[token] = true
			tokens = append(tokens, token)
		}
	}
	return tokens
}

func scoreFields(tokens []string, fields []weightedField) (int, []string) {
	score := 0
	reasons := []string{}
	seen := map[string]bool{}
	for _, token := range tokens {
		for _, field := range fields {
			value := strings.ToLower(field.value)
			if !strings.Contains(value, token) {
				continue
			}
			weight := field.weight
			for _, word := range strings.FieldsFunc(value, func(r rune) bool {
				return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
			}) {
				if word == token {
					weight *= 2
					break
				}
			}
			score += weight
			reason := field.label + ": " + token
			if !seen[reason] {
				reasons = append(reasons, reason)
				seen[reason] = true
			}
		}
	}
	return score, reasons
}

func mapText(values map[string]string) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	var parts []string
	for _, key := range keys {
		parts = append(parts, key+" "+values[key])
	}
	return strings.Join(parts, " ")
}
