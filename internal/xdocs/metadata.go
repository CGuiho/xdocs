package xdocs

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"go.yaml.in/yaml/v3"
)

const frontmatterMaxBytes = 256 * 1024

var datePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

func ParseFile(path, root string) File {
	content, err := os.ReadFile(path)
	result := File{
		Path:         path,
		RelativePath: slashRelative(root, path),
		Directory:    filepath.Dir(path),
		Documents:    []MarkdownDocument{},
		Errors:       []string{},
	}
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Read descriptor: %v", err))
		return result
	}
	if strings.EqualFold(filepath.Base(path), ".xdocs.md") {
		result.Errors = append(result.Errors, `Invalid xdocs descriptor filename. Use a named file such as "authentication.xdocs.md"; ".xdocs.md" is only the extension.`)
	} else if strings.HasSuffix(strings.ToLower(filepath.Base(path)), ".docs.md") {
		result.Errors = append(result.Errors, `Invalid xdocs descriptor filename. Use a named file such as "authentication.xdocs.md"; ".docs.md" is not a supported descriptor.`)
	}
	frontmatter, body, ok, present := ExtractFrontmatterDetailed(string(content))
	result.Body = body
	if !ok {
		if present {
			result.Errors = append(result.Errors, "Malformed YAML frontmatter: missing a closing delimiter.")
		} else {
			result.Errors = append(result.Errors, "Missing YAML frontmatter.")
		}
		return result
	}
	metadata, _, errors := parseMetadata(frontmatter)
	result.Errors = append(result.Errors, errors...)
	result.Metadata = metadata
	result.Valid = metadata != nil && len(result.Errors) == 0
	return result
}

func ExtractFrontmatter(content string) (string, string, bool) {
	frontmatter, body, ok, _ := ExtractFrontmatterDetailed(content)
	return frontmatter, body, ok
}

func ExtractFrontmatterDetailed(content string) (string, string, bool, bool) {
	trimmed := strings.TrimLeft(content, " \t\r\n")
	if !strings.HasPrefix(trimmed, "---") {
		return "", content, false, false
	}
	present := true
	remaining := trimmed[3:]
	if strings.HasPrefix(remaining, "\r\n") {
		remaining = remaining[2:]
	} else if strings.HasPrefix(remaining, "\n") {
		remaining = remaining[1:]
	} else {
		return "", content, false, present
	}
	index := -1
	closingLength := 0
	for offset := 0; offset < len(remaining); {
		lineEnd := strings.IndexByte(remaining[offset:], '\n')
		line := remaining[offset:]
		if lineEnd >= 0 {
			line = remaining[offset : offset+lineEnd]
		}
		line = strings.TrimSuffix(line, "\r")
		if line == "---" {
			index = offset
			closingLength = len(line)
			break
		}
		if lineEnd < 0 {
			break
		}
		offset += lineEnd + 1
	}
	if index < 0 {
		return "", content, false, present
	}
	frontmatter := strings.TrimSpace(remaining[:index])
	bodyStart := index + closingLength
	if bodyStart < len(remaining) && remaining[bodyStart] == '\r' {
		bodyStart++
	}
	if bodyStart < len(remaining) && remaining[bodyStart] == '\n' {
		bodyStart++
	}
	return frontmatter, strings.TrimSpace(remaining[bodyStart:]), true, present
}

func ReadFrontmatter(path string) (string, bool, error) {
	frontmatter, ok, _, err := readFrontmatterDetailed(path)
	return frontmatter, ok, err
}

func readFrontmatterDetailed(path string) (string, bool, bool, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", false, false, err
	}
	defer file.Close()
	content, err := io.ReadAll(io.LimitReader(file, frontmatterMaxBytes))
	if err != nil {
		return "", false, false, err
	}
	frontmatter, _, ok, present := ExtractFrontmatterDetailed(string(content))
	return frontmatter, ok, present, nil
}

func parseMetadata(raw string) (*Metadata, Frontmatter, []string) {
	var object Frontmatter
	if err := yaml.Unmarshal([]byte(raw), &object); err != nil {
		return nil, nil, []string{fmt.Sprintf("Invalid YAML frontmatter: %v", err)}
	}
	if object == nil {
		return nil, nil, []string{"Frontmatter must be a YAML object."}
	}
	if _, present := object["parent"]; !present {
		return nil, object, []string{`frontmatter.parent: expected a parent subject string or null`}
	}
	var metadata Metadata
	decoder := yaml.NewDecoder(bytes.NewBufferString(raw))
	decoder.KnownFields(true)
	if err := decoder.Decode(&metadata); err != nil {
		return nil, object, []string{fmt.Sprintf("Invalid YAML frontmatter: %v", err)}
	}
	errors := validateMetadata(metadata)
	if len(errors) > 0 {
		return nil, object, errors
	}
	return &metadata, object, nil
}

func validateMetadata(metadata Metadata) []string {
	var errors []string
	if strings.TrimSpace(metadata.Subject) == "" {
		errors = append(errors, `frontmatter.subject: expected a non-empty string`)
	}
	if strings.TrimSpace(metadata.Description) == "" {
		errors = append(errors, `frontmatter.description: expected a non-empty string`)
	}
	if metadata.Children == nil {
		errors = append(errors, `frontmatter.children: expected an array of strings`)
	}
	if metadata.Files == nil {
		errors = append(errors, `frontmatter.files: expected a string map`)
	}
	if metadata.Documents == nil {
		errors = append(errors, `frontmatter.documents: expected a string map`)
	}
	if metadata.Tags == nil {
		errors = append(errors, `frontmatter.tags: expected an array of strings`)
	}
	if metadata.Keywords == nil {
		errors = append(errors, `frontmatter.keywords: expected an array of strings`)
	}
	if metadata.Flags == nil {
		errors = append(errors, `frontmatter.flags: expected an array of strings`)
	}
	return errors
}

func parseDocument(path, root, expectedOwner string, frontmatterRequired, inspectExisting bool) MetaDocument {
	result := MetaDocument{
		Path: path, RelativePath: slashRelative(root, path), Directory: filepath.Dir(path),
		Name: filepath.Base(path), Owner: expectedOwner, FrontmatterRequired: frontmatterRequired,
		Errors: []string{},
	}
	if !frontmatterRequired && !inspectExisting {
		result.Valid = true
		return result
	}
	raw, ok, present, err := readFrontmatterDetailed(path)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Read frontmatter: %v", err))
		return result
	}
	if !ok {
		if present {
			result.Errors = append(result.Errors, "Malformed YAML frontmatter: missing a closing delimiter.")
			return result
		}
		if !frontmatterRequired {
			result.Valid = true
			return result
		}
		result.Errors = append(result.Errors, "Missing YAML frontmatter.")
		return result
	}
	var frontmatter Frontmatter
	if err := yaml.Unmarshal([]byte(raw), &frontmatter); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Invalid YAML frontmatter: %v", err))
		return result
	}
	result.Frontmatter = frontmatter
	if !frontmatterRequired {
		if frontmatter == nil {
			result.Errors = append(result.Errors, "Frontmatter must be a YAML object.")
			return result
		}
		result.Valid = true
		return result
	}
	result.Owner = stringValue(frontmatter, "owner")
	for _, field := range []string{"name", "purpose", "description", "created", "owner"} {
		if stringValue(frontmatter, field) == "" {
			result.Errors = append(result.Errors, fmt.Sprintf(`Missing or invalid "%s" field. Expected a non-empty string.`, field))
		}
	}
	for _, field := range []string{"flags", "tags", "keywords"} {
		if _, ok := stringSlice(frontmatter[field]); !ok {
			result.Errors = append(result.Errors, fmt.Sprintf(`Missing or invalid "%s" field. Expected an array of strings.`, field))
		}
	}
	if created := stringValue(frontmatter, "created"); created != "" && !datePattern.MatchString(created) {
		result.Errors = append(result.Errors, `Invalid "created" field. Expected YYYY-MM-DD.`)
	}
	if expectedOwner != "" && result.Owner != "" && result.Owner != expectedOwner {
		result.Errors = append(result.Errors, fmt.Sprintf(`Invalid "owner" field. Expected "%s".`, expectedOwner))
	}
	result.Valid = len(result.Errors) == 0
	return result
}

func stringValue(frontmatter Frontmatter, key string) string {
	switch value := frontmatter[key].(type) {
	case string:
		return value
	case time.Time:
		if value.Hour() == 0 && value.Minute() == 0 && value.Second() == 0 && value.Nanosecond() == 0 {
			return value.Format("2006-01-02")
		}
	}
	return ""
}

func stringSlice(value any) ([]string, bool) {
	switch items := value.(type) {
	case []string:
		return items, true
	case []any:
		result := make([]string, 0, len(items))
		for _, item := range items {
			text, ok := item.(string)
			if !ok {
				return nil, false
			}
			result = append(result, text)
		}
		return result, true
	default:
		return nil, false
	}
}

func slashRelative(root, path string) string {
	relative, err := filepath.Rel(root, path)
	if err != nil {
		return filepath.ToSlash(path)
	}
	return filepath.ToSlash(relative)
}
