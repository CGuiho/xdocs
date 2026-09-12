package config

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/CGuiho/xdocs/internal/apperror"
	"go.yaml.in/yaml/v3"
)

const Filename = "xdocs.yaml"

const defaultAIMode = "auto"

var (
	defaultExtensions  = []string{".xdocs.md"}
	defaultExclude     = []string{"node_modules", ".git", "dist", "build", "library", "bin", "bundle", "vendor"}
	defaultIgnoreRules = []IgnoreRule{
		{Pattern: "AGENTS.md", Kind: "file", Frontmatter: false},
		{Pattern: "README.md", Kind: "file", Frontmatter: false},
		{Pattern: "CLAUDE.md", Kind: "file", Frontmatter: false},
	}
)

type rawConfig struct {
	Schema        yaml.Node      `yaml:"schema"`
	Extensions    *extensions    `yaml:"extensions"`
	AI            *ai            `yaml:"ai"`
	Documentation *documentation `yaml:"documentation"`
	Ignore        *ignore        `yaml:"ignore"`
	Scan          *scan          `yaml:"scan"`
	Project       *project       `yaml:"project"`
}

type extensions struct {
	Supported []string `yaml:"supported"`
}

type ai struct {
	Mode string `yaml:"mode"`
}

type documentation struct {
	Directories []string            `yaml:"directories"`
	Frontmatter []documentationRule `yaml:"frontmatter"`
}

type documentationRule struct {
	Pattern string `yaml:"pattern"`
	Kind    string `yaml:"kind"`
}

type ignore struct {
	Gitignore *bool         `yaml:"gitignore"`
	Rules     *[]ignoreRule `yaml:"rules"`
}

type ignoreRule struct {
	Pattern     string `yaml:"pattern"`
	Kind        string `yaml:"kind"`
	Frontmatter *bool  `yaml:"frontmatter"`
}

type scan struct {
	Exclude []string `yaml:"exclude"`
}

type project struct {
	Name string `yaml:"name"`
}

type IgnoreRule struct {
	Pattern     string
	Kind        string
	Frontmatter bool
}

// DocumentationRule authorizes companion-document frontmatter within an
// explicitly authorized documentation directory.
type DocumentationRule struct {
	Pattern string
	Kind    string
}

// DocumentationConfig contains the opt-in write and metadata policy. Empty
// values are deliberate: discovering Markdown never grants write permission.
type DocumentationConfig struct {
	Directories []string
	Frontmatter []DocumentationRule
}

type Config struct {
	Schema        int
	CWD           string
	Path          string
	Extensions    []string
	AIMode        string
	Documentation DocumentationConfig
	Gitignore     bool
	IgnoreRules   []IgnoreRule
	Exclude       []string
	Project       string
}

func Defaults(cwd string) (Config, error) {
	absolute, err := filepath.Abs(cwd)
	if err != nil {
		return Config{}, apperror.Wrap(apperror.Configuration, "resolve working directory", err)
	}
	return Config{
		Schema:     1,
		CWD:        absolute,
		Extensions: append([]string(nil), defaultExtensions...),
		AIMode:     defaultAIMode,
		Documentation: DocumentationConfig{
			Directories: []string{},
			Frontmatter: []DocumentationRule{},
		},
		Gitignore:   true,
		IgnoreRules: cloneIgnoreRules(defaultIgnoreRules),
		Exclude:     append([]string(nil), defaultExclude...),
		Project:     filepath.Base(absolute),
	}, nil
}

func Load(cwd, explicit string, required bool) (Config, error) {
	base, err := Defaults(cwd)
	if err != nil {
		return Config{}, err
	}
	path, found, err := Resolve(base.CWD, explicit)
	if err != nil {
		return Config{}, err
	}
	if !found {
		if required {
			return Config{}, apperror.New(apperror.Configuration, "xdocs configuration not found. Run `xdocs init` to create xdocs.yaml.")
		}
		return base, nil
	}
	decoded, err := decode(path)
	if err != nil {
		return Config{}, err
	}
	decoded.CWD = base.CWD
	decoded.Path = path
	if decoded.Project == "" {
		decoded.Project = base.Project
	}
	return decoded, nil
}

func Resolve(cwd, explicit string) (string, bool, error) {
	if explicit != "" {
		path := explicit
		if !filepath.IsAbs(path) {
			path = filepath.Join(cwd, path)
		}
		absolute, err := filepath.Abs(path)
		if err != nil {
			return "", false, apperror.Wrap(apperror.Configuration, "resolve configuration", err)
		}
		info, err := os.Stat(absolute)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				return "", false, apperror.New(apperror.Configuration, fmt.Sprintf("configuration file not found: %s", absolute))
			}
			return "", false, apperror.Wrap(apperror.Configuration, "stat configuration", err)
		}
		if !info.Mode().IsRegular() {
			return "", false, apperror.New(apperror.Configuration, fmt.Sprintf("configuration path is not a regular file: %s", absolute))
		}
		return absolute, true, nil
	}

	projectPath := filepath.Join(cwd, Filename)
	if found, err := regularCandidate(projectPath); err != nil {
		return "", false, err
	} else if found {
		return projectPath, true, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", false, apperror.Wrap(apperror.Configuration, "resolve home directory", err)
	}
	globalPath := filepath.Join(home, ".guiho", "xdocs", Filename)
	if found, err := regularCandidate(globalPath); err != nil {
		return "", false, err
	} else if found {
		return globalPath, true, nil
	}
	return "", false, nil
}

func regularCandidate(path string) (bool, error) {
	info, err := os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, apperror.Wrap(apperror.Configuration, fmt.Sprintf("stat configuration candidate %s", path), err)
	}
	if !info.Mode().IsRegular() {
		return false, apperror.New(apperror.Configuration, fmt.Sprintf("configuration candidate is not a regular file: %s", path))
	}
	return true, nil
}

func decode(path string) (Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return Config{}, apperror.Wrap(apperror.Configuration, "open configuration", err)
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return Config{}, apperror.Wrap(apperror.Configuration, "read xdocs YAML configuration", err)
	}
	if err := validateDocumentationYAML(content); err != nil {
		return Config{}, err
	}
	decoder := yaml.NewDecoder(bytes.NewReader(content))
	decoder.KnownFields(true)
	var raw rawConfig
	if err := decoder.Decode(&raw); err != nil {
		return Config{}, apperror.Wrap(apperror.Configuration, fmt.Sprintf("decode xdocs YAML configuration at %s", path), err)
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		if err == nil {
			return Config{}, apperror.New(apperror.Configuration, "xdocs configuration must contain exactly one YAML document")
		}
		return Config{}, apperror.Wrap(apperror.Configuration, "decode trailing YAML document", err)
	}

	schema := 1
	if raw.Schema.Kind != 0 {
		if raw.Schema.Tag == "!!null" {
			return Config{}, apperror.New(apperror.Configuration, "schema must be an integer")
		}
		if err := raw.Schema.Decode(&schema); err != nil {
			return Config{}, apperror.Wrap(apperror.Configuration, "decode schema", err)
		}
	}
	if schema != 1 {
		return Config{}, apperror.New(apperror.Configuration, "invalid schema: expected 1")
	}
	supported := append([]string(nil), defaultExtensions...)
	if raw.Extensions != nil {
		supported = append([]string(nil), raw.Extensions.Supported...)
	}
	if len(supported) != 1 || strings.ToLower(supported[0]) != ".xdocs.md" {
		return Config{}, apperror.New(apperror.Configuration, `invalid extensions.supported: xdocs supports only named "*.xdocs.md" descriptor files`)
	}
	aiMode := defaultAIMode
	if raw.AI != nil {
		aiMode = strings.TrimSpace(raw.AI.Mode)
	}
	if aiMode != "prompt" && aiMode != "auto" {
		return Config{}, apperror.New(apperror.Configuration, `invalid ai.mode: expected "prompt" or "auto"`)
	}
	documentationPolicy := DocumentationConfig{
		Directories: []string{},
		Frontmatter: []DocumentationRule{},
	}
	if raw.Documentation != nil {
		for index, directory := range raw.Documentation.Directories {
			validated, err := validateDocumentationDirectory(index, directory)
			if err != nil {
				return Config{}, err
			}
			for _, existing := range documentationPolicy.Directories {
				if samePath(existing, validated) {
					return Config{}, apperror.New(apperror.Configuration, fmt.Sprintf("documentation.directories[%d] duplicates %q", index, validated))
				}
			}
			documentationPolicy.Directories = append(documentationPolicy.Directories, validated)
		}
		for index, rule := range raw.Documentation.Frontmatter {
			validated, err := validateDocumentationRule(index, rule)
			if err != nil {
				return Config{}, err
			}
			documentationPolicy.Frontmatter = append(documentationPolicy.Frontmatter, validated)
		}
	}
	gitignore := true
	ignoreRules := cloneIgnoreRules(defaultIgnoreRules)
	if raw.Ignore != nil {
		if raw.Ignore.Gitignore != nil {
			gitignore = *raw.Ignore.Gitignore
		}
		if raw.Ignore.Rules != nil {
			ignoreRules = make([]IgnoreRule, 0, len(*raw.Ignore.Rules))
			for index, rule := range *raw.Ignore.Rules {
				validated, err := validateIgnoreRule(index, rule)
				if err != nil {
					return Config{}, err
				}
				ignoreRules = append(ignoreRules, validated)
			}
		}
	}
	exclude := append([]string(nil), defaultExclude...)
	if raw.Scan != nil {
		exclude = append([]string(nil), raw.Scan.Exclude...)
	}
	for _, name := range exclude {
		if strings.TrimSpace(name) == "" || strings.ContainsAny(name, `/\`) {
			return Config{}, apperror.New(apperror.Configuration, "scan.exclude entries must be non-empty directory names")
		}
	}
	projectName := ""
	if raw.Project != nil {
		projectName = strings.TrimSpace(raw.Project.Name)
		if projectName == "" {
			return Config{}, apperror.New(apperror.Configuration, "project.name must be a non-empty string when project is configured")
		}
	}
	return Config{
		Schema:        schema,
		Extensions:    supported,
		AIMode:        aiMode,
		Documentation: documentationPolicy,
		Gitignore:     gitignore,
		IgnoreRules:   ignoreRules,
		Exclude:       exclude,
		Project:       projectName,
	}, nil
}

func validateDocumentationDirectory(index int, value string) (string, error) {
	label := fmt.Sprintf("documentation.directories[%d]", index)
	value = strings.TrimSpace(value)
	if value == "" {
		return "", apperror.New(apperror.Configuration, label+" must be a non-empty repository-relative directory")
	}
	if value == "." {
		return value, nil
	}
	if invalidRepositoryPath(value) {
		return "", apperror.New(apperror.Configuration, label+" must use a repository-relative path with forward slashes")
	}
	if strings.HasSuffix(value, "/") {
		return "", apperror.New(apperror.Configuration, label+" must not end with a slash")
	}
	for _, part := range strings.Split(value, "/") {
		if part == "" || part == "." || part == ".." {
			return "", apperror.New(apperror.Configuration, label+" must not contain empty, current-directory, or parent path segments")
		}
		if strings.ContainsAny(part, "*?[") {
			return "", apperror.New(apperror.Configuration, label+" must name a directory, not a glob")
		}
	}
	return value, nil
}

func validateDocumentationRule(index int, rule documentationRule) (DocumentationRule, error) {
	label := fmt.Sprintf("documentation.frontmatter[%d]", index)
	pattern := strings.TrimSpace(rule.Pattern)
	if pattern == "" {
		return DocumentationRule{}, apperror.New(apperror.Configuration, label+".pattern must be a non-empty repository-relative glob")
	}
	if invalidRepositoryPath(pattern) {
		return DocumentationRule{}, apperror.New(apperror.Configuration, label+".pattern must use forward slashes and be relative to the repository")
	}
	kind := strings.TrimSpace(rule.Kind)
	if kind != "file" && kind != "directory" {
		return DocumentationRule{}, apperror.New(apperror.Configuration, label+`.kind must be "file" or "directory"`)
	}
	if strings.HasSuffix(pattern, "/") {
		if kind != "directory" {
			return DocumentationRule{}, apperror.New(apperror.Configuration, label+".pattern may end with a slash only when kind is directory")
		}
		pattern = strings.TrimSuffix(pattern, "/")
	}
	for _, part := range strings.Split(pattern, "/") {
		if part == "" || part == "." || part == ".." {
			return DocumentationRule{}, apperror.New(apperror.Configuration, label+".pattern must not contain empty, current-directory, or parent path segments")
		}
	}
	if _, err := path.Match(pattern, ""); err != nil {
		return DocumentationRule{}, apperror.New(apperror.Configuration, label+".pattern is not a valid glob: "+err.Error())
	}
	return DocumentationRule{Pattern: pattern, Kind: kind}, nil
}

func invalidRepositoryPath(value string) bool {
	if strings.Contains(value, `\`) || strings.HasPrefix(value, "/") || filepath.IsAbs(value) || filepath.VolumeName(value) != "" {
		return true
	}
	// filepath.VolumeName only recognizes the host OS syntax. Reject Windows
	// drive forms on every platform so a config copied between systems cannot
	// turn a drive-qualified path into a relative grant.
	return len(value) >= 2 && ((value[0] >= 'a' && value[0] <= 'z') || (value[0] >= 'A' && value[0] <= 'Z')) && value[1] == ':'
}

func samePath(left, right string) bool {
	if runtime.GOOS == "windows" {
		return strings.EqualFold(left, right)
	}
	return left == right
}

func validateDocumentationYAML(content []byte) error {
	var document yaml.Node
	decoder := yaml.NewDecoder(bytes.NewReader(content))
	if err := decoder.Decode(&document); err != nil {
		return nil // The typed decoder reports the authoritative syntax error.
	}
	if len(document.Content) == 0 {
		return nil
	}
	root := document.Content[0]
	if root.Kind != yaml.MappingNode {
		return nil
	}
	for index := 0; index+1 < len(root.Content); index += 2 {
		if root.Content[index].Value != "documentation" {
			continue
		}
		return validateDocumentationNode(root.Content[index+1])
	}
	return nil
}

func validateDocumentationNode(node *yaml.Node) error {
	if node.Kind != yaml.MappingNode {
		return apperror.New(apperror.Configuration, "documentation must be a YAML object")
	}
	for index := 0; index+1 < len(node.Content); index += 2 {
		key, value := node.Content[index].Value, node.Content[index+1]
		switch key {
		case "directories":
			if value.Kind != yaml.SequenceNode {
				return apperror.New(apperror.Configuration, "documentation.directories must be an array of strings")
			}
			for itemIndex, item := range value.Content {
				if item.Kind != yaml.ScalarNode || item.Tag != "!!str" {
					return apperror.New(apperror.Configuration, fmt.Sprintf("documentation.directories[%d] must be a string", itemIndex))
				}
			}
		case "frontmatter":
			if value.Kind != yaml.SequenceNode {
				return apperror.New(apperror.Configuration, "documentation.frontmatter must be an array of rules")
			}
			for itemIndex, item := range value.Content {
				if item.Kind != yaml.MappingNode {
					return apperror.New(apperror.Configuration, fmt.Sprintf("documentation.frontmatter[%d] must be an object", itemIndex))
				}
				for fieldIndex := 0; fieldIndex+1 < len(item.Content); fieldIndex += 2 {
					field, fieldValue := item.Content[fieldIndex].Value, item.Content[fieldIndex+1]
					if (field == "pattern" || field == "kind") && (fieldValue.Kind != yaml.ScalarNode || fieldValue.Tag != "!!str") {
						return apperror.New(apperror.Configuration, fmt.Sprintf("documentation.frontmatter[%d].%s must be a string", itemIndex, field))
					}
				}
			}
		}
	}
	return nil
}

func validateIgnoreRule(index int, rule ignoreRule) (IgnoreRule, error) {
	label := fmt.Sprintf("ignore.rules[%d]", index)
	pattern := strings.TrimSpace(rule.Pattern)
	if pattern == "" {
		return IgnoreRule{}, apperror.New(apperror.Configuration, label+".pattern must be a non-empty repository-relative glob")
	}
	if strings.Contains(pattern, `\`) || strings.HasPrefix(pattern, "/") || filepath.IsAbs(pattern) || filepath.VolumeName(pattern) != "" {
		return IgnoreRule{}, apperror.New(apperror.Configuration, label+".pattern must use forward slashes and be relative to the repository")
	}
	kind := strings.TrimSpace(rule.Kind)
	if kind != "file" && kind != "directory" {
		return IgnoreRule{}, apperror.New(apperror.Configuration, label+`.kind must be "file" or "directory"`)
	}
	if strings.HasSuffix(pattern, "/") {
		if kind != "directory" {
			return IgnoreRule{}, apperror.New(apperror.Configuration, label+".pattern may end with a slash only when kind is directory")
		}
		pattern = strings.TrimSuffix(pattern, "/")
	}
	for _, part := range strings.Split(pattern, "/") {
		if part == "" {
			return IgnoreRule{}, apperror.New(apperror.Configuration, label+".pattern must not contain empty path segments")
		}
		if part == "." {
			return IgnoreRule{}, apperror.New(apperror.Configuration, label+".pattern must not contain current-directory path segments")
		}
		if part == ".." {
			return IgnoreRule{}, apperror.New(apperror.Configuration, label+".pattern must not traverse outside the repository")
		}
	}
	if _, err := path.Match(pattern, ""); err != nil {
		return IgnoreRule{}, apperror.New(apperror.Configuration, label+".pattern is not a valid glob: "+err.Error())
	}
	if rule.Frontmatter == nil || *rule.Frontmatter {
		return IgnoreRule{}, apperror.New(apperror.Configuration, label+".frontmatter must be explicitly false")
	}
	return IgnoreRule{Pattern: pattern, Kind: kind, Frontmatter: false}, nil
}

func cloneIgnoreRules(rules []IgnoreRule) []IgnoreRule {
	return append([]IgnoreRule(nil), rules...)
}

func DefaultContent(cwd string) string {
	name := strings.ReplaceAll(filepath.Base(cwd), `"`, `\"`)
	return fmt.Sprintf(`schema: 1
extensions:
  supported:
    - .xdocs.md
ai:
  mode: auto
documentation:
  directories: []
  frontmatter: []
ignore:
  gitignore: true
  rules:
    - pattern: AGENTS.md
      kind: file
      frontmatter: false
    - pattern: README.md
      kind: file
      frontmatter: false
    - pattern: CLAUDE.md
      kind: file
      frontmatter: false
scan:
  exclude:
    - node_modules
    - .git
    - dist
    - build
    - library
    - bin
    - bundle
    - vendor
project:
  name: "%s"
`, name)
}

func WriteDefault(cwd string, overwrite bool) (string, error) {
	path := filepath.Join(cwd, Filename)
	if !overwrite {
		if _, err := os.Stat(path); err == nil {
			return "", apperror.New(apperror.Mutation, fmt.Sprintf("configuration already exists: %s", path))
		}
	}
	if err := os.WriteFile(path, []byte(DefaultContent(cwd)), 0o644); err != nil {
		return "", apperror.Wrap(apperror.Mutation, "write configuration", err)
	}
	return path, nil
}
