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
	if !strings.HasPrefix(content, "---") {
		// A frontmatter opener is only valid at byte zero. Keep a leading
		// opener distinguishable from an ordinary Markdown body so writers and
		// read-only audits reject the ambiguous form instead of accepting it.
		trimmed := strings.TrimLeft(content, " \t\r\n")
		if strings.HasPrefix(trimmed, "---") || strings.HasPrefix(content, "\ufeff---") {
			return "", content, false, true
		}
		return "", content, false, false
	}
	present := true
	remaining := content[3:]
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
	object, node, err := decodeFrontmatter(raw)
	if err != nil {
		return nil, nil, []string{fmt.Sprintf("Invalid YAML frontmatter: %v", err)}
	}
	if object == nil {
		return nil, nil, []string{"Frontmatter must be a YAML object."}
	}
	if err := rejectMetadataAliases(node); err != nil {
		return nil, object, []string{err.Error()}
	}
	if errors := validateMetadataNode(node); len(errors) > 0 {
		return nil, object, errors
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

func validateMetadataNode(root *yaml.Node) []string {
	if root == nil || root.Kind != yaml.MappingNode {
		return []string{"Frontmatter must be a YAML object."}
	}
	fields := map[string]*yaml.Node{}
	for index := 0; index+1 < len(root.Content); index += 2 {
		key, value := root.Content[index], root.Content[index+1]
		if key.Kind == yaml.ScalarNode && key.Tag == "!!str" {
			fields[key.Value] = value
		}
	}
	var errors []string
	for index := 0; index+1 < len(root.Content); index += 2 {
		key := root.Content[index]
		if key.Kind != yaml.ScalarNode || key.Tag != "!!str" {
			errors = append(errors, "frontmatter: field names must be strings")
		}
	}
	for _, field := range []string{"subject", "description", "status"} {
		if value, ok := fields[field]; ok && !yamlStringNode(value) {
			errors = append(errors, fmt.Sprintf("frontmatter.%s: expected a string", field))
		}
	}
	if value, ok := fields["parent"]; ok && !yamlStringNode(value) && !yamlNullNode(value) {
		errors = append(errors, "frontmatter.parent: expected a parent subject string or null")
	}
	for _, field := range []string{"children", "tags", "keywords", "flags"} {
		if value, ok := fields[field]; ok && !yamlStringSequenceNode(value) {
			errors = append(errors, fmt.Sprintf("frontmatter.%s: expected an array of strings", field))
		}
	}
	for _, field := range []string{"files", "documents"} {
		if value, ok := fields[field]; ok && !yamlStringMapNode(value) {
			errors = append(errors, fmt.Sprintf("frontmatter.%s: expected a string map", field))
		}
	}
	return errors
}

func rejectMetadataAliases(node *yaml.Node) error {
	if node == nil {
		return nil
	}
	if node.Anchor != "" || node.Alias != nil || node.Tag == "!!merge" {
		return fmt.Errorf("frontmatter must not use YAML anchors, aliases, or merge keys")
	}
	for _, child := range node.Content {
		if err := rejectMetadataAliases(child); err != nil {
			return err
		}
	}
	return nil
}

func yamlStringNode(node *yaml.Node) bool {
	return node != nil && node.Kind == yaml.ScalarNode && node.Tag == "!!str"
}

func yamlNullNode(node *yaml.Node) bool {
	return node != nil && node.Kind == yaml.ScalarNode && node.Tag == "!!null"
}

func yamlStringSequenceNode(node *yaml.Node) bool {
	if node == nil || node.Kind != yaml.SequenceNode {
		return false
	}
	for _, item := range node.Content {
		if !yamlStringNode(item) {
			return false
		}
	}
	return true
}

func yamlStringMapNode(node *yaml.Node) bool {
	if node == nil || node.Kind != yaml.MappingNode {
		return false
	}
	for index := 0; index+1 < len(node.Content); index += 2 {
		if !yamlStringNode(node.Content[index]) || !yamlStringNode(node.Content[index+1]) {
			return false
		}
	}
	return true
}

func decodeFrontmatterObject(raw string) (Frontmatter, error) {
	object, _, err := decodeFrontmatter(raw)
	return object, err
}

func decodeFrontmatter(raw string) (Frontmatter, *yaml.Node, error) {
	decoder := yaml.NewDecoder(bytes.NewBufferString(raw))
	var document yaml.Node
	if err := decoder.Decode(&document); err != nil {
		return nil, nil, err
	}
	var trailing yaml.Node
	if err := decoder.Decode(&trailing); err != io.EOF {
		if err == nil {
			return nil, nil, fmt.Errorf("frontmatter must contain exactly one YAML document")
		}
		return nil, nil, err
	}
	if len(document.Content) == 0 {
		return nil, nil, nil
	}
	root := document.Content[0]
	var object Frontmatter
	if err := root.Decode(&object); err != nil {
		return nil, root, err
	}
	return object, root, nil
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
	frontmatter, err := decodeFrontmatterObject(raw)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Invalid YAML frontmatter: %v", err))
		return result
	}
	result.Frontmatter = frontmatter
	if !frontmatterRequired {
		result.Owner = stringValue(frontmatter, "owner")
	}
	if !frontmatterRequired {
		if frontmatter == nil {
			result.Errors = append(result.Errors, "Frontmatter must be a YAML object.")
			return result
		}
		result.Valid = true
		return result
	}
	result.Owner = stringValue(frontmatter, "owner")
	result.Errors = append(result.Errors, validateCompanionFrontmatter(frontmatter, expectedOwner)...)
	result.Valid = len(result.Errors) == 0
	return result
}

func validateCompanionFrontmatter(frontmatter Frontmatter, expectedOwner string) []string {
	var errors []string
	for _, field := range []string{"name", "purpose", "description", "created", "owner"} {
		if strings.TrimSpace(stringValue(frontmatter, field)) == "" {
			errors = append(errors, fmt.Sprintf(`Missing or invalid "%s" field. Expected a non-empty string.`, field))
		}
	}
	for _, field := range []string{"flags", "tags", "keywords"} {
		if _, ok := stringSlice(frontmatter[field]); !ok {
			errors = append(errors, fmt.Sprintf(`Missing or invalid "%s" field. Expected an array of strings.`, field))
		}
	}
	if created := stringValue(frontmatter, "created"); created != "" && !datePattern.MatchString(created) {
		errors = append(errors, `Invalid "created" field. Expected YYYY-MM-DD.`)
	}
	if expectedOwner != "" && stringValue(frontmatter, "owner") != "" && stringValue(frontmatter, "owner") != expectedOwner {
		errors = append(errors, fmt.Sprintf(`Invalid "owner" field. Expected "%s".`, expectedOwner))
	}
	return errors
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
