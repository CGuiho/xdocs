package xdocs

import (
	"bufio"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"github.com/CGuiho/xdocs/internal/config"
)

type pathPolicy struct {
	root               string
	useGitignore       bool
	gitignoreRules     []gitignoreRule
	frontmatterRules   []configuredIgnoreRule
	excludeRules       []excludeRule
	documentationDirs  []string
	documentationRules []configuredDocumentationRule
	loaded             map[string]bool
	ignoreCase         bool
}

type gitignoreRule struct {
	base      string
	negated   bool
	directory bool
	hasSlash  bool
	pattern   *regexp.Regexp
}

type configuredIgnoreRule struct {
	kind     string
	hasSlash bool
	pattern  *regexp.Regexp
}

type configuredDocumentationRule struct {
	kind     string
	hasSlash bool
	pattern  *regexp.Regexp
}

type excludeRule struct {
	hasSlash bool
	pattern  *regexp.Regexp
}

func newPathPolicy(cfg config.Config, target string) (*pathPolicy, error) {
	policy := &pathPolicy{
		root:               filepath.Clean(cfg.CWD),
		useGitignore:       cfg.Gitignore,
		gitignoreRules:     []gitignoreRule{},
		frontmatterRules:   []configuredIgnoreRule{},
		excludeRules:       compileExcludeRules(cfg.Exclude, runtime.GOOS == "windows"),
		documentationDirs:  append([]string(nil), cfg.Documentation.Directories...),
		documentationRules: []configuredDocumentationRule{},
		loaded:             map[string]bool{},
		ignoreCase:         runtime.GOOS == "windows",
	}
	for _, rule := range cfg.IgnoreRules {
		policy.frontmatterRules = append(policy.frontmatterRules, configuredIgnoreRule{
			kind: rule.Kind, hasSlash: strings.Contains(rule.Pattern, "/"), pattern: compileGlob(rule.Pattern, policy.ignoreCase),
		})
	}
	for _, rule := range cfg.Documentation.Frontmatter {
		policy.documentationRules = append(policy.documentationRules, configuredDocumentationRule{
			kind: rule.Kind, hasSlash: strings.Contains(rule.Pattern, "/"), pattern: compileGlob(rule.Pattern, policy.ignoreCase),
		})
	}
	if !policy.useGitignore {
		return policy, nil
	}
	if target == "" {
		target = policy.root
	}
	target, _ = filepath.Abs(target)
	relative, err := filepath.Rel(policy.root, target)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return policy, nil
	}
	directory := policy.root
	if err := policy.loadGitignore(directory); err != nil {
		return nil, err
	}
	if relative == "." || relative == "" {
		return policy, nil
	}
	for _, part := range strings.Split(filepath.ToSlash(relative), "/") {
		if part == "" || part == "." {
			continue
		}
		directory = filepath.Join(directory, filepath.FromSlash(part))
		if policy.scanExcluded(directory, true) || policy.ignored(directory, true) {
			return policy, nil
		}
		if err := policy.loadGitignore(directory); err != nil {
			return nil, err
		}
	}
	return policy, nil
}

func (policy *pathPolicy) loadGitignore(directory string) error {
	if !policy.useGitignore {
		return nil
	}
	filename := filepath.Join(directory, ".gitignore")
	if policy.loaded[filename] {
		return nil
	}
	policy.loaded[filename] = true
	content, err := os.ReadFile(filename)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read .gitignore %s: %w", filepath.ToSlash(filename), err)
	}
	base := slashRelative(policy.root, directory)
	if base == "." {
		base = ""
	}
	scanner := bufio.NewScanner(strings.NewReader(string(content)))
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	for scanner.Scan() {
		if rule, ok := parseGitignoreRule(base, scanner.Text(), policy.ignoreCase); ok {
			policy.gitignoreRules = append(policy.gitignoreRules, rule)
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read .gitignore %s: %w", filepath.ToSlash(filename), err)
	}
	return nil
}

func parseGitignoreRule(base, line string, ignoreCase bool) (gitignoreRule, bool) {
	line = strings.TrimSuffix(line, "\r")
	line = trimUnescapedTrailingSpaces(line)
	if line == "" || strings.HasPrefix(line, "#") {
		return gitignoreRule{}, false
	}
	negated := false
	if strings.HasPrefix(line, "!") {
		negated = true
		line = line[1:]
	} else if strings.HasPrefix(line, `\!`) || strings.HasPrefix(line, `\#`) {
		line = line[1:]
	}
	anchored := strings.HasPrefix(line, "/")
	line = strings.TrimPrefix(line, "/")
	directory := strings.HasSuffix(line, "/") && !strings.HasSuffix(line, `\/`)
	line = strings.TrimSuffix(line, "/")
	if line == "" {
		return gitignoreRule{}, false
	}
	hasSlash := strings.Contains(line, "/")
	return gitignoreRule{
		base: base, negated: negated, directory: directory, hasSlash: hasSlash || anchored,
		pattern: compileGlob(line, ignoreCase),
	}, true
}

func trimUnescapedTrailingSpaces(value string) string {
	for strings.HasSuffix(value, " ") {
		backslashes := 0
		for index := len(value) - 2; index >= 0 && value[index] == '\\'; index-- {
			backslashes++
		}
		if backslashes%2 == 1 {
			return value[:len(value)-2] + " "
		}
		value = strings.TrimSuffix(value, " ")
	}
	return value
}

func (policy *pathPolicy) ignored(pathname string, directory bool) bool {
	if !policy.useGitignore {
		return false
	}
	relative := slashRelative(policy.root, pathname)
	parts := strings.Split(relative, "/")
	directoryParts := len(parts)
	if !directory {
		directoryParts--
	}
	for index := 1; index <= directoryParts; index++ {
		if policy.ignoredExact(strings.Join(parts[:index], "/"), true) {
			return true
		}
	}
	if directory {
		return false
	}
	return policy.ignoredExact(relative, false)
}

func (policy *pathPolicy) ignoredExact(relative string, directory bool) bool {
	ignored := false
	for _, rule := range policy.gitignoreRules {
		candidate, ok := relativeToBase(relative, rule.base)
		if !ok || (rule.directory && !directory) {
			continue
		}
		matched := false
		if rule.hasSlash {
			matched = rule.pattern.MatchString(candidate)
		} else {
			matched = rule.pattern.MatchString(path.Base(candidate))
		}
		if matched {
			ignored = !rule.negated
		}
	}
	return ignored
}

func relativeToBase(relative, base string) (string, bool) {
	if base == "" {
		return relative, true
	}
	if relative == base {
		return "", false
	}
	prefix := base + "/"
	if !strings.HasPrefix(relative, prefix) {
		return "", false
	}
	return strings.TrimPrefix(relative, prefix), true
}

// ignoreRuleMatches reports whether any legacy ignore.rules entry matches
// the file at pathname: a file rule matches the file's relative path (or
// its basename when the pattern has no slash), and a directory rule matches
// any ancestor directory. A match is an explicit denial: xdocs never
// requires frontmatter for the file, and doctor does not require the file to
// be listed in its descriptor's documents map. A file that is listed anyway
// stays tracked exactly as before.
func (policy *pathPolicy) ignoreRuleMatches(pathname string) bool {
	relative := slashRelative(policy.root, pathname)
	for _, rule := range policy.frontmatterRules {
		if rule.kind == "file" {
			if matchConfiguredPattern(rule, relative) {
				return true
			}
			continue
		}
		directory := path.Dir(relative)
		for directory != "." && directory != "/" && directory != "" {
			if matchConfiguredPattern(rule, directory) {
				return true
			}
			next := path.Dir(directory)
			if next == directory {
				break
			}
			directory = next
		}
	}
	return false
}

func (policy *pathPolicy) frontmatterRequired(pathname string) bool {
	relative := slashRelative(policy.root, pathname)
	// Legacy ignore rules are explicit denials and always win over the new
	// opt-in policy.
	if policy.ignoreRuleMatches(pathname) {
		return false
	}
	if !policy.documentationDirectoryAuthorized(path.Dir(relative)) {
		return false
	}
	for _, rule := range policy.documentationRules {
		if rule.kind == "file" {
			if matchConfiguredDocumentationPattern(rule, relative) {
				return true
			}
			continue
		}
		directory := path.Dir(relative)
		for directory != "." && directory != "/" && directory != "" {
			if matchConfiguredDocumentationPattern(rule, directory) {
				return true
			}
			next := path.Dir(directory)
			if next == directory {
				break
			}
			directory = next
		}
	}
	return false
}

func (policy *pathPolicy) documentationDirectoryAuthorized(directory string) bool {
	directory = path.Clean(directory)
	if directory == ".." || strings.HasPrefix(directory, "../") || path.IsAbs(directory) || windowsDrivePath(directory) {
		return false
	}
	for _, allowed := range policy.documentationDirs {
		allowed = path.Clean(allowed)
		if allowed == "." || pathEqual(allowed, directory, policy.ignoreCase) || pathPrefix(allowed, directory, policy.ignoreCase) {
			return true
		}
	}
	return false
}

func windowsDrivePath(value string) bool {
	return len(value) >= 2 && ((value[0] >= 'a' && value[0] <= 'z') || (value[0] >= 'A' && value[0] <= 'Z')) && value[1] == ':'
}

func pathEqual(left, right string, ignoreCase bool) bool {
	if ignoreCase {
		return strings.EqualFold(left, right)
	}
	return left == right
}

func pathPrefix(prefix, value string, ignoreCase bool) bool {
	if len(value) <= len(prefix) {
		return false
	}
	if ignoreCase {
		return strings.HasPrefix(strings.ToLower(value), strings.ToLower(prefix)+"/")
	}
	return strings.HasPrefix(value, prefix+"/")
}

func matchConfiguredPattern(rule configuredIgnoreRule, relative string) bool {
	if rule.hasSlash {
		return rule.pattern.MatchString(relative)
	}
	return rule.pattern.MatchString(path.Base(relative))
}

func compileExcludeRules(values []string, ignoreCase bool) []excludeRule {
	rules := make([]excludeRule, 0, len(values))
	for _, value := range values {
		pattern := strings.TrimSpace(value)
		if pattern == "" {
			continue
		}
		pattern = strings.TrimSuffix(pattern, "/")
		if pattern == "" {
			continue
		}
		rules = append(rules, excludeRule{
			hasSlash: strings.Contains(pattern, "/"), pattern: compileGlob(pattern, ignoreCase),
		})
	}
	return rules
}

// scanExcluded reports whether pathname is removed from scanning by a
// scan.exclude entry. Every path prefix is checked so that an excluded
// ancestor directory excludes everything beneath it, while file globs such
// as "AGENTS.md" or "**/AGENTS.md" exclude matching files wherever they
// live.
func (policy *pathPolicy) scanExcluded(pathname string, directory bool) bool {
	relative := slashRelative(policy.root, pathname)
	if relative == "." || relative == "/" || relative == "" || strings.HasPrefix(relative, "../") {
		return false
	}
	return scanExcludedRelative(policy.excludeRules, relative)
}

func scanExcludedRelative(rules []excludeRule, relative string) bool {
	parts := strings.Split(relative, "/")
	for index := 1; index <= len(parts); index++ {
		if matchExcludeRules(rules, strings.Join(parts[:index], "/")) {
			return true
		}
	}
	return false
}

func matchExcludeRules(rules []excludeRule, relative string) bool {
	for _, rule := range rules {
		if rule.hasSlash {
			if rule.pattern.MatchString(relative) {
				return true
			}
			continue
		}
		if rule.pattern.MatchString(path.Base(relative)) {
			return true
		}
	}
	return false
}

func matchConfiguredDocumentationPattern(rule configuredDocumentationRule, relative string) bool {
	if rule.hasSlash {
		return rule.pattern.MatchString(relative)
	}
	return rule.pattern.MatchString(path.Base(relative))
}

func compileGlob(pattern string, ignoreCase bool) *regexp.Regexp {
	var expression strings.Builder
	if ignoreCase {
		expression.WriteString("(?i)")
	}
	expression.WriteString("^")
	for index := 0; index < len(pattern); {
		switch pattern[index] {
		case '*':
			end := index + 1
			for end < len(pattern) && pattern[end] == '*' {
				end++
			}
			if end-index == 1 {
				expression.WriteString("[^/]*")
				index = end
				continue
			}
			previousBoundary := index == 0 || pattern[index-1] == '/'
			nextSlash := end < len(pattern) && pattern[end] == '/'
			switch {
			case previousBoundary && nextSlash:
				expression.WriteString("(?:.*/)?")
				index = end + 1
			case previousBoundary && end == len(pattern):
				expression.WriteString(".*")
				index = end
			default:
				expression.WriteString("[^/]*")
				index = end
			}
		case '?':
			expression.WriteString("[^/]")
			index++
		case '[':
			end := index + 1
			for end < len(pattern) && pattern[end] != ']' {
				end++
			}
			if end >= len(pattern) {
				expression.WriteString(`\[`)
				index++
				continue
			}
			class := pattern[index+1 : end]
			if strings.HasPrefix(class, "!") {
				class = "^" + strings.TrimPrefix(class, "!")
			}
			expression.WriteString("[")
			expression.WriteString(class)
			expression.WriteString("]")
			index = end + 1
		case '\\':
			if index+1 < len(pattern) {
				expression.WriteString(regexp.QuoteMeta(string(pattern[index+1])))
				index += 2
			} else {
				expression.WriteString(`\\`)
				index++
			}
		default:
			expression.WriteString(regexp.QuoteMeta(string(pattern[index])))
			index++
		}
	}
	expression.WriteString("$")
	compiled, err := regexp.Compile(expression.String())
	if err == nil {
		return compiled
	}
	prefix := ""
	if ignoreCase {
		prefix = "(?i)"
	}
	return regexp.MustCompile(prefix + "^" + regexp.QuoteMeta(pattern) + "$")
}

func filterMetadata(metadata *Metadata, frontmatter Frontmatter, directory string, policy *pathPolicy) {
	if policy == nil {
		return
	}
	filterFrontmatterReferences(frontmatter, "files", directory, policy)
	filterFrontmatterReferences(frontmatter, "documents", directory, policy)
	if metadata == nil {
		return
	}
	for name := range metadata.Files {
		full := filepath.Join(directory, name)
		if policy.ignored(full, false) || policy.scanExcluded(full, false) {
			delete(metadata.Files, name)
		}
	}
	for name := range metadata.Documents {
		full := filepath.Join(directory, name)
		if policy.ignored(full, false) || policy.scanExcluded(full, false) {
			delete(metadata.Documents, name)
		}
	}
	if frontmatter != nil {
		frontmatter["files"] = metadata.Files
		frontmatter["documents"] = metadata.Documents
	}
}

func filterFrontmatterReferences(frontmatter Frontmatter, field, directory string, policy *pathPolicy) {
	if frontmatter == nil {
		return
	}
	value, ok := frontmatter[field]
	if !ok {
		return
	}
	ignored := func(name string) bool {
		full := filepath.Join(directory, name)
		return policy.ignored(full, false) || policy.scanExcluded(full, false)
	}
	switch references := value.(type) {
	case Frontmatter:
		for name := range references {
			if ignored(name) {
				delete(references, name)
			}
		}
	case map[string]any:
		for name := range references {
			if ignored(name) {
				delete(references, name)
			}
		}
	case map[string]string:
		for name := range references {
			if ignored(name) {
				delete(references, name)
			}
		}
	case map[any]any:
		for key := range references {
			name, ok := key.(string)
			if ok && ignored(name) {
				delete(references, key)
			}
		}
	}
}
