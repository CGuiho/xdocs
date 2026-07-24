package agent

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/CGuiho/xdocs/internal/apperror"
	"go.yaml.in/yaml/v3"
)

const (
	SkillName        = "guiho-s-xdocs"
	legacySkillName  = "guiho-as-xdocs"
	instructionBegin = "<!-- BEGIN XDOCS — DO NOT EDIT THIS SECTION -->"
	instructionEnd   = "<!-- END XDOCS -->"
)

var promptNames = []string{"write", "update", "agents", "generate"}

const InstructionTemplate = `## XDocs Structured Documentation

This project uses **xdocs** for structured, machine-readable documentation.
Load the ` + "`guiho-s-xdocs`" + ` agent skill before creating, updating,
scanning, merging, validating, or navigating xdocs descriptors.

The project configuration is ` + "`xdocs.yaml`" + `. Respect ` + "`ai.mode`" + `:
` + "`prompt`" + ` requires confirmation before documentation writes, while
` + "`auto`" + ` permits immediate descriptor maintenance. Use ` + "`xdocs meta`" + `,
` + "`xdocs context`" + `, ` + "`xdocs tree`" + `, and ` + "`xdocs doctor`" + `
to discover and validate documentation.
`

type Service struct {
	resources fs.FS
}

type SkillRecord struct {
	ID          string         `json:"id"`
	Path        string         `json:"path"`
	Description string         `json:"description"`
	Metadata    map[string]any `json:"metadata"`
}

type InstallResult struct {
	Tool               string   `json:"tool"`
	Scope              string   `json:"scope"`
	Path               string   `json:"path"`
	Installed          bool     `json:"installed"`
	Updated            bool     `json:"updated"`
	RemovedLegacyPaths []string `json:"removedLegacyPaths"`
	PreviousVersion    string   `json:"previousVersion,omitempty"`
	BundledVersion     string   `json:"bundledVersion,omitempty"`
}

type InstructionResult struct {
	Path    string `json:"path"`
	Exists  bool   `json:"exists"`
	Changed bool   `json:"changed"`
}

type Prompt struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Body        string `json:"-"`
}

func New(resources fs.FS) *Service {
	return &Service{resources: resources}
}

func (s *Service) Skill() ([]byte, error) {
	content, err := fs.ReadFile(s.resources, "skills/guiho-s-xdocs/SKILL.md")
	if err != nil {
		return nil, apperror.Wrap(apperror.Mutation, "read embedded xdocs skill", err)
	}
	return content, nil
}

func (s *Service) ListSkills(filter string) ([]SkillRecord, error) {
	record, err := s.ShowSkill(SkillName)
	if err != nil {
		return nil, err
	}
	if filter != "" {
		query := strings.ToLower(filter)
		if !strings.Contains(strings.ToLower(record.ID), query) &&
			!strings.Contains(strings.ToLower(record.Description), query) {
			return []SkillRecord{}, nil
		}
	}
	return []SkillRecord{record}, nil
}

func (s *Service) ShowSkill(id string) (SkillRecord, error) {
	if id != SkillName {
		return SkillRecord{}, apperror.New(apperror.Usage, fmt.Sprintf("unknown skill id: %q", id))
	}
	content, err := s.Skill()
	if err != nil {
		return SkillRecord{}, err
	}
	frontmatter, _, ok := splitFrontmatter(string(content))
	if !ok {
		return SkillRecord{}, apperror.New(apperror.Mutation, "bundled xdocs skill is missing YAML frontmatter")
	}
	var metadata map[string]any
	if err := yaml.Unmarshal([]byte(frontmatter), &metadata); err != nil {
		return SkillRecord{}, apperror.Wrap(apperror.Mutation, "decode embedded skill metadata", err)
	}
	name, _ := metadata["name"].(string)
	description, _ := metadata["description"].(string)
	if name != SkillName || description == "" {
		return SkillRecord{}, apperror.New(apperror.Mutation, "bundled xdocs skill metadata is invalid")
	}
	return SkillRecord{
		ID: SkillName, Path: "skills/guiho-s-xdocs/SKILL.md",
		Description: description, Metadata: metadata,
	}, nil
}

func (s *Service) Install(scope, cwd string) ([]InstallResult, error) {
	content, err := s.Skill()
	if err != nil {
		return nil, err
	}
	root, err := scopeRoot(scope, cwd)
	if err != nil {
		return nil, err
	}
	bundledVersion := skillVersion(content)
	stages := make([]skillStage, 0, 2)
	for _, tool := range []string{"agents", "claude"} {
		base := "." + tool
		destination := filepath.Join(root, base, "skills", SkillName)
		legacy := filepath.Join(root, base, "skills", legacySkillName)
		stage, err := prepareSkillStage(tool, scope, destination, legacy, content)
		if err != nil {
			cleanupSkillStages(stages)
			return nil, err
		}
		stages = append(stages, stage)
	}
	for index := range stages {
		if err := commitSkillStage(&stages[index]); err != nil {
			if rollbackErr := rollbackSkillStages(stages); rollbackErr != nil {
				return nil, apperror.New(
					apperror.Mutation,
					fmt.Sprintf("%v; skill transaction rollback failed: %v", err, rollbackErr),
				)
			}
			return nil, err
		}
	}
	results := make([]InstallResult, 0, len(stages))
	for _, stage := range stages {
		removed := []string{}
		if stage.legacyExisted {
			removed = append(removed, stage.legacy)
		}
		result := InstallResult{
			Tool: stage.tool, Scope: scope, Path: stage.destination,
			Installed: !stage.existed, Updated: stage.existed && string(stage.previous) != string(content),
			RemovedLegacyPaths: removed, BundledVersion: bundledVersion,
		}
		if stage.existed {
			result.PreviousVersion = skillVersion(stage.previous)
		}
		results = append(results, result)
	}
	cleanupSkillStages(stages)
	return results, nil
}

type skillStage struct {
	tool, scope                  string
	destination, legacy          string
	staged, backup, legacyBackup string
	previous                     []byte
	existed, legacyExisted       bool
	destinationBackedUp          bool
	legacyBackedUp               bool
	installed, committed         bool
}

func prepareSkillStage(tool, scope, destination, legacy string, content []byte) (skillStage, error) {
	stage := skillStage{tool: tool, scope: scope, destination: destination, legacy: legacy}
	parent := filepath.Dir(destination)
	if err := os.MkdirAll(parent, 0o755); err != nil {
		return stage, apperror.Wrap(apperror.Mutation, "create skill parent", err)
	}
	temp, err := os.MkdirTemp(parent, ".xdocs-skill-new-*")
	if err != nil {
		return stage, apperror.Wrap(apperror.Mutation, "create staged skill", err)
	}
	stage.staged = temp
	if err := os.WriteFile(filepath.Join(temp, "SKILL.md"), content, 0o644); err != nil {
		os.RemoveAll(temp)
		return stage, apperror.Wrap(apperror.Mutation, "write staged skill", err)
	}
	if _, statErr := os.Stat(destination); statErr == nil {
		stage.existed = true
	} else if !os.IsNotExist(statErr) {
		os.RemoveAll(temp)
		return stage, apperror.Wrap(apperror.Mutation, "inspect installed skill", statErr)
	}
	stage.previous, err = os.ReadFile(filepath.Join(destination, "SKILL.md"))
	if err != nil && !os.IsNotExist(err) {
		os.RemoveAll(temp)
		return stage, apperror.Wrap(apperror.Mutation, "read installed skill", err)
	}
	if _, err := os.Stat(legacy); err == nil {
		stage.legacyExisted = true
	} else if !os.IsNotExist(err) {
		os.RemoveAll(temp)
		return stage, apperror.Wrap(apperror.Mutation, "inspect legacy skill", err)
	}
	stage.backup, err = unusedSibling(parent, ".xdocs-skill-backup-*")
	if err != nil {
		os.RemoveAll(temp)
		return stage, err
	}
	stage.legacyBackup, err = unusedSibling(parent, ".xdocs-legacy-backup-*")
	if err != nil {
		os.RemoveAll(temp)
		return stage, err
	}
	return stage, nil
}

func unusedSibling(parent, pattern string) (string, error) {
	path, err := os.MkdirTemp(parent, pattern)
	if err != nil {
		return "", apperror.Wrap(apperror.Mutation, "reserve skill transaction path", err)
	}
	if err := os.Remove(path); err != nil {
		return "", apperror.Wrap(apperror.Mutation, "release skill transaction path", err)
	}
	return path, nil
}

func commitSkillStage(stage *skillStage) error {
	if stage.existed {
		if err := os.Rename(stage.destination, stage.backup); err != nil {
			return apperror.Wrap(apperror.Mutation, "stage installed skill", err)
		}
		stage.destinationBackedUp = true
	}
	if stage.legacyExisted {
		if err := os.Rename(stage.legacy, stage.legacyBackup); err != nil {
			return apperror.Wrap(apperror.Mutation, "stage legacy skill", err)
		}
		stage.legacyBackedUp = true
	}
	if err := os.Rename(stage.staged, stage.destination); err != nil {
		return apperror.Wrap(apperror.Mutation, "install staged skill", err)
	}
	stage.staged = ""
	stage.installed = true
	stage.committed = true
	return nil
}

func rollbackSkillStages(stages []skillStage) error {
	var failures []string
	for index := len(stages) - 1; index >= 0; index-- {
		stage := &stages[index]
		if stage.installed {
			if err := os.RemoveAll(stage.destination); err != nil {
				failures = append(failures, fmt.Sprintf("remove %s: %v", stage.destination, err))
			} else {
				stage.installed = false
			}
		}
		if stage.destinationBackedUp {
			if err := os.Rename(stage.backup, stage.destination); err != nil {
				failures = append(failures, fmt.Sprintf("restore %s from %s: %v", stage.destination, stage.backup, err))
			} else {
				stage.destinationBackedUp = false
				stage.backup = ""
			}
		}
		if stage.legacyBackedUp {
			if err := os.Rename(stage.legacyBackup, stage.legacy); err != nil {
				failures = append(failures, fmt.Sprintf("restore %s from %s: %v", stage.legacy, stage.legacyBackup, err))
			} else {
				stage.legacyBackedUp = false
				stage.legacyBackup = ""
			}
		}
		if stage.staged != "" {
			_ = os.RemoveAll(stage.staged)
			stage.staged = ""
		}
	}
	if len(failures) > 0 {
		return fmt.Errorf("%s", strings.Join(failures, "; "))
	}
	cleanupSkillStages(stages)
	return nil
}

func cleanupSkillStages(stages []skillStage) {
	for _, stage := range stages {
		if stage.staged != "" {
			_ = os.RemoveAll(stage.staged)
		}
		_ = os.RemoveAll(stage.backup)
		_ = os.RemoveAll(stage.legacyBackup)
	}
}

func (s *Service) Uninstall(scope, cwd string) ([]string, error) {
	root, err := scopeRoot(scope, cwd)
	if err != nil {
		return nil, err
	}
	var removed []string
	for _, tool := range []string{"agents", "claude"} {
		for _, name := range []string{SkillName, legacySkillName} {
			path := filepath.Join(root, "."+tool, "skills", name)
			if _, err := os.Stat(path); err == nil {
				if err := os.RemoveAll(path); err != nil {
					return nil, apperror.Wrap(apperror.Mutation, "remove skill", err)
				}
				removed = append(removed, path)
			}
		}
	}
	return removed, nil
}

func (s *Service) Prompts() ([]Prompt, error) {
	result := make([]Prompt, 0, len(promptNames))
	for _, name := range promptNames {
		content, err := fs.ReadFile(s.resources, "prompts/"+name+".md")
		if err != nil {
			return nil, apperror.Wrap(apperror.Mutation, "read embedded prompt", err)
		}
		frontmatter, body, ok := splitFrontmatter(string(content))
		if !ok {
			return nil, apperror.New(apperror.Mutation, fmt.Sprintf("embedded prompt %q is missing YAML frontmatter", name))
		}
		var metadata struct {
			Name        string `yaml:"name"`
			Description string `yaml:"description"`
		}
		if err := yaml.Unmarshal([]byte(frontmatter), &metadata); err != nil {
			return nil, apperror.Wrap(apperror.Mutation, "decode prompt metadata", err)
		}
		if metadata.Name == "" || metadata.Description == "" {
			return nil, apperror.New(apperror.Mutation, fmt.Sprintf("embedded prompt %q metadata is invalid", name))
		}
		result = append(result, Prompt{Name: metadata.Name, Description: metadata.Description, Body: strings.TrimSpace(body)})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

func (s *Service) ShowPrompt(id string) (Prompt, error) {
	prompts, err := s.Prompts()
	if err != nil {
		return Prompt{}, err
	}
	for _, prompt := range prompts {
		if prompt.Name == id {
			return prompt, nil
		}
	}
	return Prompt{}, apperror.New(apperror.Usage, fmt.Sprintf("unknown prompt id: %q", id))
}

func ApplyInstructions(cwd string) ([]InstructionResult, error) {
	return mutateInstructions(cwd, false)
}

func RemoveInstructions(cwd string) ([]InstructionResult, error) {
	return mutateInstructions(cwd, true)
}

func mutateInstructions(cwd string, remove bool) ([]InstructionResult, error) {
	root, err := filepath.Abs(cwd)
	if err != nil {
		return nil, apperror.Wrap(apperror.Mutation, "resolve instruction directory", err)
	}
	candidates := []string{filepath.Join(root, "AGENTS.md"), filepath.Join(root, "CLAUDE.md")}
	var targets []string
	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			targets = append(targets, path)
		}
	}
	if len(targets) == 0 && !remove {
		targets = []string{candidates[0]}
	}
	var results []InstructionResult
	for _, path := range targets {
		content, err := os.ReadFile(path)
		exists := err == nil
		if err != nil && !os.IsNotExist(err) {
			return nil, apperror.Wrap(apperror.Mutation, "read instruction file", err)
		}
		current := string(content)
		next := reconcileInstruction(current, remove)
		changed := current != next
		if changed {
			if err := atomicWrite(path, []byte(next), 0o644); err != nil {
				return nil, err
			}
		}
		results = append(results, InstructionResult{Path: path, Exists: exists, Changed: changed})
	}
	return results, nil
}

func reconcileInstruction(content string, remove bool) string {
	newline := "\n"
	if strings.Contains(content, "\r\n") {
		newline = "\r\n"
	}
	template := strings.ReplaceAll(strings.TrimRight(InstructionTemplate, "\r\n"), "\n", newline)
	canonical := instructionBegin + newline + template + newline + instructionEnd
	var output strings.Builder
	cursor := 0
	inserted := false
	malformed := false
	for {
		relativeStart := strings.Index(content[cursor:], "<!-- BEGIN XDOCS")
		if relativeStart < 0 {
			break
		}
		start := cursor + relativeStart
		output.WriteString(content[cursor:start])
		endRelative := strings.Index(content[start:], instructionEnd)
		if endRelative < 0 {
			output.WriteString(content[start:])
			cursor = len(content)
			malformed = true
			break
		}
		end := start + endRelative + len(instructionEnd)
		if !remove && !inserted {
			output.WriteString(canonical)
			inserted = true
		}
		cursor = end
	}
	output.WriteString(content[cursor:])
	result := output.String()
	if !remove && !inserted && !malformed {
		if result != "" && !strings.HasSuffix(result, newline) {
			result += newline
		}
		if result != "" && !strings.HasSuffix(result, newline+newline) {
			result += newline
		}
		result += canonical + newline
	}
	return result
}

func scopeRoot(scope, cwd string) (string, error) {
	switch scope {
	case "global":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", apperror.Wrap(apperror.Mutation, "resolve home directory", err)
		}
		return home, nil
	case "local":
		root, err := filepath.Abs(cwd)
		if err != nil {
			return "", apperror.Wrap(apperror.Mutation, "resolve local skill directory", err)
		}
		return root, nil
	default:
		return "", apperror.New(apperror.Usage, fmt.Sprintf("invalid skill scope: %s", scope))
	}
}

func atomicSkillWrite(destination string, content []byte) error {
	parent := filepath.Dir(destination)
	if err := os.MkdirAll(parent, 0o755); err != nil {
		return apperror.Wrap(apperror.Mutation, "create skill parent", err)
	}
	temp, err := os.MkdirTemp(parent, ".xdocs-skill-*")
	if err != nil {
		return apperror.Wrap(apperror.Mutation, "create temporary skill", err)
	}
	defer os.RemoveAll(temp)
	if err := os.WriteFile(filepath.Join(temp, "SKILL.md"), content, 0o644); err != nil {
		return apperror.Wrap(apperror.Mutation, "write temporary skill", err)
	}
	backup := destination + ".xdocs-backup"
	_ = os.RemoveAll(backup)
	if _, err := os.Stat(destination); err == nil {
		if err := os.Rename(destination, backup); err != nil {
			return apperror.Wrap(apperror.Mutation, "stage current skill", err)
		}
	}
	if err := os.Rename(temp, destination); err != nil {
		_ = os.Rename(backup, destination)
		return apperror.Wrap(apperror.Mutation, "install skill", err)
	}
	_ = os.RemoveAll(backup)
	return nil
}

func atomicWrite(path string, content []byte, mode fs.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return apperror.Wrap(apperror.Mutation, "create parent directory", err)
	}
	temp, err := os.CreateTemp(filepath.Dir(path), ".xdocs-*")
	if err != nil {
		return apperror.Wrap(apperror.Mutation, "create temporary file", err)
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)
	if _, err := temp.Write(content); err != nil {
		temp.Close()
		return apperror.Wrap(apperror.Mutation, "write temporary file", err)
	}
	if err := temp.Sync(); err != nil {
		temp.Close()
		return apperror.Wrap(apperror.Mutation, "sync temporary file", err)
	}
	if err := temp.Close(); err != nil {
		return apperror.Wrap(apperror.Mutation, "close temporary file", err)
	}
	if err := os.Chmod(tempPath, mode); err != nil {
		return apperror.Wrap(apperror.Mutation, "set temporary file mode", err)
	}
	if err := os.Rename(tempPath, path); err != nil {
		return apperror.Wrap(apperror.Mutation, "replace file", err)
	}
	return nil
}

func splitFrontmatter(content string) (string, string, bool) {
	trimmed := strings.TrimLeft(content, "\ufeff \t\r\n")
	if !strings.HasPrefix(trimmed, "---") {
		return "", content, false
	}
	rest := strings.TrimPrefix(trimmed, "---")
	rest = strings.TrimPrefix(rest, "\r\n")
	rest = strings.TrimPrefix(rest, "\n")
	index := strings.Index(rest, "\n---")
	if index < 0 {
		return "", content, false
	}
	body := rest[index+4:]
	body = strings.TrimPrefix(body, "\r\n")
	body = strings.TrimPrefix(body, "\n")
	return strings.TrimSpace(rest[:index]), body, true
}

func skillVersion(content []byte) string {
	frontmatter, _, ok := splitFrontmatter(string(content))
	if !ok {
		return ""
	}
	var metadata struct {
		Version  string `yaml:"version"`
		Metadata struct {
			Version string `yaml:"version"`
		} `yaml:"metadata"`
	}
	if yaml.Unmarshal([]byte(frontmatter), &metadata) != nil {
		return ""
	}
	if metadata.Metadata.Version != "" {
		return metadata.Metadata.Version
	}
	return metadata.Version
}
