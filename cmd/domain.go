package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/CGuiho/xdocs/internal/agent"
	"github.com/CGuiho/xdocs/internal/apperror"
	"github.com/CGuiho/xdocs/internal/config"
	domain "github.com/CGuiho/xdocs/internal/xdocs"
	"github.com/spf13/cobra"
)

func newInitCommand(options *commonOptions, agents *agent.Service) *cobra.Command {
	var local bool
	command := &cobra.Command{
		Use:   "init",
		Short: "Initialize xdocs and install its agent skill globally.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			configPath := filepath.Join(options.cwd, config.Filename)
			configAction := "exists"
			if _, err := os.Stat(configPath); err == nil {
			} else {
				if _, err := config.WriteDefault(options.cwd, false); err != nil {
					return err
				}
				configAction = "created"
			}
			rootPath := filepath.Join(options.cwd, "XDOCS.md")
			rootAction := "exists"
			if _, err := os.Stat(rootPath); err == nil {
			} else {
				content := fmt.Sprintf("# %s -- XDocs Root\n\nThe single root index for this repository.\n\n## Packages\n\n## Applications\n", filepath.Base(options.cwd))
				if err := writeFile(rootPath, []byte(content), 0o644); err != nil {
					return err
				}
				rootAction = "created"
			}
			scope := "global"
			if local {
				scope = "local"
			}
			results, err := agents.Install(scope, options.cwd)
			if err != nil {
				return err
			}
			if options.format == "json" {
				return writeJSON(command, map[string]any{
					"command": "xdocs init",
					"config":  map[string]string{"action": configAction, "path": configPath},
					"root":    map[string]string{"action": rootAction, "path": rootPath},
					"scope":   scope,
					"skills":  results,
				})
			}
			fmt.Fprintf(command.OutOrStdout(), "%s: xdocs.yaml\n", configAction)
			fmt.Fprintf(command.OutOrStdout(), "%s: XDOCS.md\n", rootAction)
			for _, result := range results {
				action := "current"
				if result.Installed {
					action = "installed"
				} else if result.Updated {
					action = "updated"
				}
				fmt.Fprintf(command.OutOrStdout(), "%s: guiho-s-xdocs skill (%s, %s) -> %s\n", action, result.Tool, scope, result.Path)
			}
			fmt.Fprintln(command.OutOrStdout(), "\nxdocs initialized.")
			return nil
		},
	}
	command.Flags().BoolVar(&local, "local", false, "Install the agent skill in the initialized project instead of global scope")
	return command
}

func newScanCommand(options *commonOptions) *cobra.Command {
	return &cobra.Command{
		Use:   "scan",
		Short: "Scan descriptor and companion-document coverage.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			cfg, err := load(options, false, command)
			if err != nil {
				return err
			}
			result, err := domain.ScanProject(cfg)
			if err != nil {
				return err
			}
			if options.format == "json" {
				return writeJSON(command, scanJSON(result))
			}
			out := command.OutOrStdout()
			fmt.Fprintln(out, "\nxdocs scan")
			fmt.Fprintf(out, "\ndescriptor extension: %s\n", strings.Join(cfg.Extensions, ", "))
			fmt.Fprintf(out, "total files scanned: %d\n", result.TotalFiles)
			fmt.Fprintf(out, "total directories: %d\n", result.TotalDirectories)
			fmt.Fprintf(out, "markdown documents found: %d\n", result.TotalMarkdownDocuments)
			fmt.Fprintf(out, "covered directories: %d\n", result.CoveredDirectories)
			fmt.Fprintf(out, "uncovered directories: %d\n", result.UncoveredDirectories)
			fmt.Fprintf(out, "xdocs descriptors found: %d\n", len(result.XDocsFiles))
			if len(result.XDocsFiles) > 0 {
				fmt.Fprintln(out, "\nfiles:")
				for _, file := range result.XDocsFiles {
					status, subject := "incomplete", ""
					if file.RelativePath == "XDOCS.md" && file.Metadata == nil {
						status = "root index"
					}
					if file.Valid {
						status = "valid"
					}
					if file.Metadata != nil {
						subject = " (" + file.Metadata.Subject + ")"
					}
					fmt.Fprintf(out, "  %s [%s]%s\n", file.RelativePath, status, subject)
					if options.verbose {
						for _, message := range file.Errors {
							fmt.Fprintf(out, "    error: %s\n", message)
						}
						for _, document := range file.Documents {
							fmt.Fprintf(out, "    document: %s\n", document.Name)
						}
					}
				}
			}
			if options.verbose && len(result.UncoveredPaths) > 0 {
				fmt.Fprintln(out, "\nuncovered directories:")
				for _, path := range result.UncoveredPaths {
					fmt.Fprintln(out, "  "+path)
				}
			}
			fmt.Fprintln(out)
			return nil
		},
	}
}

type scanJSONFile struct {
	Path                string            `json:"path"`
	Valid               bool              `json:"valid"`
	Subject             *string           `json:"subject"`
	Keywords            []string          `json:"keywords"`
	Documents           map[string]string `json:"documents"`
	DiscoveredDocuments []string          `json:"discoveredDocuments"`
	Errors              []string          `json:"errors"`
}

type scanJSONResult struct {
	TotalFiles             int            `json:"totalFiles"`
	TotalDirectories       int            `json:"totalDirectories"`
	TotalMarkdownDocuments int            `json:"totalMarkdownDocuments"`
	CoveredDirectories     int            `json:"coveredDirectories"`
	UncoveredDirectories   int            `json:"uncoveredDirectories"`
	XDocsFiles             []scanJSONFile `json:"xdocsFiles"`
	MarkdownDocuments      []string       `json:"markdownDocuments"`
	UncoveredPaths         []string       `json:"uncoveredPaths"`
}

func scanJSON(result domain.ScanResult) scanJSONResult {
	projected := scanJSONResult{
		TotalFiles: result.TotalFiles, TotalDirectories: result.TotalDirectories,
		TotalMarkdownDocuments: result.TotalMarkdownDocuments,
		CoveredDirectories:     result.CoveredDirectories, UncoveredDirectories: result.UncoveredDirectories,
		XDocsFiles: []scanJSONFile{}, MarkdownDocuments: []string{},
		UncoveredPaths: append([]string{}, result.UncoveredPaths...),
	}
	for _, file := range result.XDocsFiles {
		entry := scanJSONFile{
			Path: file.RelativePath, Valid: file.Valid, Keywords: nil,
			Documents: nil, DiscoveredDocuments: []string{},
			Errors: append([]string{}, file.Errors...),
		}
		if file.Metadata != nil {
			subject := file.Metadata.Subject
			entry.Subject = &subject
			entry.Keywords = append([]string{}, file.Metadata.Keywords...)
			entry.Documents = file.Metadata.Documents
		}
		for _, document := range file.Documents {
			entry.DiscoveredDocuments = append(entry.DiscoveredDocuments, document.RelativePath)
		}
		projected.XDocsFiles = append(projected.XDocsFiles, entry)
	}
	for _, document := range result.MarkdownDocuments {
		projected.MarkdownDocuments = append(projected.MarkdownDocuments, document.RelativePath)
	}
	return projected
}

func newGenerateCommand(options *commonOptions) *cobra.Command {
	var output string
	command := &cobra.Command{
		Use:   "generate [path]",
		Short: "Generate documentation for a directory or project.",
		Args:  maxArgs(1),
		RunE: func(command *cobra.Command, args []string) error {
			cfg, err := load(options, false, command)
			if err != nil {
				return err
			}
			scan, err := domain.ScanProject(cfg)
			if err != nil {
				return err
			}
			target := ""
			if len(args) == 1 {
				target = args[0]
			}
			content := domain.Generate(cfg, scan, target)
			if output != "" {
				path := output
				if !filepath.IsAbs(path) {
					path = filepath.Join(options.cwd, path)
				}
				if err := writeFile(path, []byte(content), 0o644); err != nil {
					return err
				}
				if options.format == "json" {
					return writeJSON(command, map[string]any{
						"command": "xdocs generate", "path": target,
						"output": output, "written": true,
					})
				}
				fmt.Fprintf(command.OutOrStdout(), "generated: %s\n", output)
				return nil
			}
			if options.format == "json" {
				return writeJSON(command, map[string]any{
					"command": "xdocs generate", "path": target,
					"content": content, "written": false,
				})
			}
			fmt.Fprint(command.OutOrStdout(), content)
			return nil
		},
	}
	command.Flags().StringVar(&output, "output", "", "Write output to a file")
	return command
}

func newMergeCommand(options *commonOptions) *cobra.Command {
	var output string
	command := &cobra.Command{
		Use:   "merge [path]",
		Short: "Merge descriptors into one document.",
		Args:  maxArgs(1),
		RunE: func(command *cobra.Command, args []string) error {
			cfg, err := load(options, false, command)
			if err != nil {
				return err
			}
			scan, err := domain.ScanProject(cfg)
			if err != nil {
				return err
			}
			target := ""
			if len(args) == 1 {
				target = args[0]
			}
			content, count := domain.Merge(scan, cfg.CWD, target)
			if count == 0 {
				if options.format == "json" {
					return writeJSON(command, map[string]any{
						"command": "xdocs merge", "path": target,
						"count": 0, "content": "", "written": false,
					})
				}
				fmt.Fprintln(command.OutOrStdout(), "No xdocs descriptors found in the specified path.")
				return nil
			}
			if output != "" {
				path := output
				if !filepath.IsAbs(path) {
					path = filepath.Join(options.cwd, path)
				}
				if err := writeFile(path, []byte(content), 0o644); err != nil {
					return err
				}
				if options.format == "json" {
					return writeJSON(command, map[string]any{
						"command": "xdocs merge", "path": target,
						"count": count, "output": output, "written": true,
					})
				}
				fmt.Fprintf(command.OutOrStdout(), "merged: %s (%d files)\n", output, count)
				return nil
			}
			if options.format == "json" {
				return writeJSON(command, map[string]any{
					"command": "xdocs merge", "path": target,
					"count": count, "content": content, "written": false,
				})
			}
			fmt.Fprint(command.OutOrStdout(), content)
			return nil
		},
	}
	command.Flags().StringVar(&output, "output", "", "Write output to a file")
	return command
}

func newTreeCommand(options *commonOptions) *cobra.Command {
	var output string
	command := &cobra.Command{
		Use:   "tree",
		Short: "Display the project hierarchy.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			cfg, err := load(options, false, command)
			if err != nil {
				return err
			}
			scan, err := domain.ScanProject(cfg)
			if err != nil {
				return err
			}
			tree := domain.BuildTree(scan.XDocsFiles)
			if options.verbose {
				validation := domain.ValidateTree(scan.XDocsFiles)
				for _, message := range validation.Warnings {
					fmt.Fprintln(command.ErrOrStderr(), "warning: "+message)
				}
				for _, message := range validation.Errors {
					fmt.Fprintln(command.ErrOrStderr(), "error: "+message)
				}
			}
			var content string
			switch options.format {
			case "json":
				data, err := json.MarshalIndent(tree, "", "  ")
				if err != nil {
					return err
				}
				content = string(data) + "\n"
			case "markdown":
				content = "# Project Hierarchy\n\n" + domain.RenderTreeMarkdown(tree) + "\n"
			default:
				content = domain.RenderTree(tree) + "\n"
			}
			if output != "" {
				path := output
				if !filepath.IsAbs(path) {
					path = filepath.Join(options.cwd, path)
				}
				if err := writeFile(path, []byte(content), 0o644); err != nil {
					return err
				}
				fmt.Fprintf(command.OutOrStdout(), "tree: %s\n", output)
				return nil
			}
			fmt.Fprint(command.OutOrStdout(), content)
			return nil
		},
	}
	command.Flags().StringVar(&output, "output", "", "Write output to a file")
	return command
}

func newListCommand(options *commonOptions) *cobra.Command {
	return &cobra.Command{
		Use:   "list [path]",
		Short: "List documented files and documents.",
		Args:  maxArgs(1),
		RunE: func(command *cobra.Command, args []string) error {
			cfg, err := load(options, false, command)
			if err != nil {
				return err
			}
			scan, err := domain.ScanProject(cfg)
			if err != nil {
				return err
			}
			target := ""
			if len(args) == 1 {
				target = args[0]
			}
			entries := domain.List(scan, cfg.CWD, target)
			if options.format == "json" {
				return writeJSON(command, entries)
			}
			scope := scopeLabel(cfg.CWD, target)
			if len(entries) == 0 {
				fmt.Fprintf(command.OutOrStdout(), "No documented files or documents found in %s.\n", scope)
				return nil
			}
			fmt.Fprintf(command.OutOrStdout(), "\nentries in %s:\n\n", scope)
			for _, entry := range entries {
				fmt.Fprintf(command.OutOrStdout(), "  %s %s: %s\n", entry.Kind, entry.File, entry.Description)
			}
			fmt.Fprintln(command.OutOrStdout())
			return nil
		},
	}
}

func newMetaCommand(options *commonOptions) *cobra.Command {
	var includeDocuments, strict bool
	var owner, tag, keyword string
	command := &cobra.Command{
		Use:   "meta [path]",
		Short: "Read descriptor and companion-document frontmatter.",
		Args:  maxArgs(1),
		RunE: func(command *cobra.Command, args []string) error {
			cfg, err := load(options, false, command)
			if err != nil {
				return err
			}
			target := ""
			if len(args) == 1 {
				target = args[0]
			}
			result, err := domain.ScanMetadata(cfg, domain.MetaOptions{
				TargetPath: target, IncludeDocuments: includeDocuments, Strict: strict,
				Filters: domain.Filters{Owner: owner, Tag: tag, Keyword: keyword},
			})
			if err != nil {
				return err
			}
			if strict && len(result.Errors) > 0 {
				return apperror.New(apperror.Usage, "metadata scan failed:\n  "+strings.Join(result.Errors, "\n  "))
			}
			return renderMeta(command, options.format, result)
		},
	}
	flags := command.Flags()
	flags.BoolVar(&includeDocuments, "documents", false, "Include companion document frontmatter")
	flags.BoolVar(&strict, "strict", false, "Fail when metadata is invalid")
	flags.StringVar(&owner, "owner", "", "Filter by descriptor subject or document owner")
	flags.StringVar(&tag, "tag", "", "Filter by tag")
	flags.StringVar(&keyword, "keyword", "", "Filter by keyword")
	return command
}

func newContextCommand(options *commonOptions) *cobra.Command {
	var includeDocuments, includeFiles, explain bool
	var limit int
	var owner, tag, keyword string
	command := &cobra.Command{
		Use:   "context <query> [path]",
		Short: "Recommend a minimal reading set for a task.",
		Args:  rangeArgs(1, 2),
		RunE: func(command *cobra.Command, args []string) error {
			cfg, err := load(options, false, command)
			if err != nil {
				return err
			}
			target := ""
			if len(args) == 2 {
				target = args[1]
			}
			result, err := domain.FindContext(cfg, args[0], domain.ContextOptions{
				TargetPath: target, IncludeDocuments: includeDocuments, IncludeFiles: includeFiles,
				Limit: limit, Filters: domain.Filters{Owner: owner, Tag: tag, Keyword: keyword},
			})
			if err != nil {
				return err
			}
			return renderContext(command, options.format, result, explain)
		},
	}
	flags := command.Flags()
	flags.BoolVar(&includeDocuments, "documents", false, "Include companion documents")
	flags.BoolVar(&includeFiles, "files", false, "Include documented implementation files")
	flags.IntVar(&limit, "limit", 20, "Maximum number of entries")
	flags.StringVar(&owner, "owner", "", "Filter by owner")
	flags.StringVar(&tag, "tag", "", "Filter by tag")
	flags.StringVar(&keyword, "keyword", "", "Filter by keyword")
	flags.BoolVar(&explain, "explain", false, "Include match reasons")
	return command
}

func newDoctorCommand(options *commonOptions) *cobra.Command {
	var noDocuments, warningsAsErrors bool
	command := &cobra.Command{
		Use:   "doctor [path]",
		Short: "Run strict xdocs health checks.",
		Args:  maxArgs(1),
		RunE: func(command *cobra.Command, args []string) error {
			cfg, err := load(options, false, command)
			if err != nil {
				return err
			}
			target := ""
			if len(args) == 1 {
				target = args[0]
			}
			result, err := domain.Doctor(cfg, domain.DoctorOptions{
				TargetPath: target, IncludeDocuments: !noDocuments, WarningsAsErrors: warningsAsErrors,
			})
			if err != nil {
				return err
			}
			if err := renderDoctor(command, options.format, result); err != nil {
				return err
			}
			if !result.Valid {
				return apperror.New(apperror.Usage, fmt.Sprintf("xdocs doctor found %d error(s)", result.Summary.Errors))
			}
			return nil
		},
	}
	command.Flags().BoolVar(&noDocuments, "no-documents", false, "Skip companion-document validation")
	command.Flags().BoolVar(&warningsAsErrors, "warnings-as-errors", false, "Treat warnings as errors")
	return command
}

func load(options *commonOptions, required bool, command *cobra.Command) (config.Config, error) {
	cfg, err := config.Load(options.cwd, options.config, required)
	if err != nil {
		return config.Config{}, err
	}
	if cfg.Path != "" {
		fmt.Fprintln(command.ErrOrStderr(), "configuration file loaded: "+filepath.ToSlash(cfg.Path))
	}
	return cfg, nil
}

func writeJSON(command *cobra.Command, value any) error {
	encoder := json.NewEncoder(command.OutOrStdout())
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(value); err != nil {
		return apperror.Wrap(apperror.Unexpected, "encode JSON output", err)
	}
	return nil
}

func renderMeta(command *cobra.Command, format string, result domain.MetaResult) error {
	if format == "json" {
		return writeJSON(command, metaJSON(result))
	}
	out := command.OutOrStdout()
	if format == "markdown" {
		fmt.Fprintf(out, "# xdocs Metadata\n\nTarget: `%s`\n\n", result.TargetPath)
		for _, descriptor := range result.Descriptors {
			fmt.Fprintf(out, "## `%s`", descriptor.RelativePath)
			if descriptor.Subject != "" {
				fmt.Fprintf(out, " (%s)", descriptor.Subject)
			}
			fmt.Fprintln(out)
			fmt.Fprintln(out)
			if descriptor.Metadata != nil {
				fmt.Fprintln(out, descriptor.Metadata.Description)
				fmt.Fprintln(out)
			}
			for _, document := range descriptor.Documents {
				fmt.Fprintf(out, "- `%s`", document.RelativePath)
				if document.Owner != "" {
					fmt.Fprintf(out, ", owner: `%s`", document.Owner)
				}
				fmt.Fprintln(out)
			}
		}
		if len(result.Errors) > 0 {
			fmt.Fprintln(out, "\n## Errors")
			for _, message := range result.Errors {
				fmt.Fprintln(out, "- "+message)
			}
		}
		return nil
	}
	fmt.Fprintf(out, "\nxdocs meta\n\ntarget: %s\ndescriptors: %d\ndocuments included: %s\n", result.TargetPath, len(result.Descriptors), yesNo(result.IncludeDocuments))
	if len(result.Errors) > 0 {
		fmt.Fprintf(out, "metadata errors: %d\n", len(result.Errors))
	}
	if len(result.Descriptors) > 0 {
		fmt.Fprintln(out, "\ndescriptors:")
		for _, descriptor := range result.Descriptors {
			status := "incomplete"
			if descriptor.Valid {
				status = "valid"
			}
			fmt.Fprintf(out, "  %s [%s]", descriptor.RelativePath, status)
			if descriptor.Subject != "" {
				fmt.Fprintf(out, " (%s)", descriptor.Subject)
			}
			fmt.Fprintln(out)
			for _, document := range descriptor.Documents {
				fmt.Fprintf(out, "    document %s", document.Name)
				if document.Owner != "" {
					fmt.Fprintf(out, " owner=%s", document.Owner)
				}
				fmt.Fprintln(out)
			}
		}
	}
	if len(result.Errors) > 0 {
		fmt.Fprintln(out, "\nerrors:")
		for _, message := range result.Errors {
			fmt.Fprintln(out, "  "+message)
		}
	}
	fmt.Fprintln(out)
	return nil
}

func renderContext(command *cobra.Command, format string, result domain.ContextResult, explain bool) error {
	if format == "json" {
		return writeJSON(command, contextJSON(result))
	}
	out := command.OutOrStdout()
	if format == "markdown" {
		fmt.Fprintf(out, "# xdocs Context\n\nQuery: `%s`\nTarget: `%s`\n\n", result.Query, result.TargetPath)
		for _, entry := range result.Entries {
			fmt.Fprintf(out, "- **%s** `%s` (score %d)\n", entry.Kind, entry.Path, entry.Score)
			if entry.Description != "" {
				fmt.Fprintln(out, "  "+entry.Description)
			}
			if explain && len(entry.Reasons) > 0 {
				fmt.Fprintln(out, "  Reasons: "+strings.Join(entry.Reasons, ", "))
			}
		}
		return nil
	}
	fmt.Fprintf(out, "\nxdocs context\n\nquery: %s\ntarget: %s\nentries: %d\n", result.Query, result.TargetPath, len(result.Entries))
	if len(result.Entries) > 0 {
		fmt.Fprintln(out, "\nmatches:")
		for _, entry := range result.Entries {
			fmt.Fprintf(out, "  %s %s (score %d)\n", entry.Kind, entry.Path, entry.Score)
			if entry.Description != "" {
				fmt.Fprintln(out, "    "+entry.Description)
			}
			if explain && len(entry.Reasons) > 0 {
				fmt.Fprintln(out, "    reasons: "+strings.Join(entry.Reasons, ", "))
			}
		}
	}
	fmt.Fprintln(out)
	return nil
}

type metaJSONDocument struct {
	Path         string             `json:"path"`
	RelativePath string             `json:"relativePath"`
	Directory    string             `json:"directory"`
	Name         string             `json:"name"`
	Owner        *string            `json:"owner"`
	Valid        bool               `json:"valid"`
	Frontmatter  domain.Frontmatter `json:"frontmatter"`
	Errors       []string           `json:"errors"`
}

type metaJSONDescriptor struct {
	Path         string             `json:"path"`
	RelativePath string             `json:"relativePath"`
	Directory    string             `json:"directory"`
	Subject      *string            `json:"subject"`
	Valid        bool               `json:"valid"`
	Frontmatter  domain.Frontmatter `json:"frontmatter"`
	Metadata     *domain.Metadata   `json:"metadata"`
	Documents    []metaJSONDocument `json:"documents"`
	Errors       []string           `json:"errors"`
}

type metaJSONResult struct {
	Root             string               `json:"root"`
	TargetPath       string               `json:"targetPath"`
	IncludeDocuments bool                 `json:"includeDocuments"`
	Strict           bool                 `json:"strict"`
	Filters          domain.Filters       `json:"filters"`
	Descriptors      []metaJSONDescriptor `json:"descriptors"`
	Errors           []string             `json:"errors"`
}

func metaJSON(result domain.MetaResult) metaJSONResult {
	projected := metaJSONResult{
		Root: result.Root, TargetPath: result.TargetPath,
		IncludeDocuments: result.IncludeDocuments, Strict: result.Strict, Filters: result.Filters,
		Descriptors: []metaJSONDescriptor{}, Errors: append([]string{}, result.Errors...),
	}
	for _, descriptor := range result.Descriptors {
		entry := metaJSONDescriptor{
			Path: descriptor.Path, RelativePath: descriptor.RelativePath, Directory: descriptor.Directory,
			Valid: descriptor.Valid, Frontmatter: descriptor.Frontmatter, Metadata: descriptor.Metadata,
			Documents: []metaJSONDocument{}, Errors: append([]string{}, descriptor.Errors...),
		}
		if descriptor.Subject != "" {
			subject := descriptor.Subject
			entry.Subject = &subject
		}
		for _, document := range descriptor.Documents {
			item := metaJSONDocument{
				Path: document.Path, RelativePath: document.RelativePath, Directory: document.Directory,
				Name: document.Name, Valid: document.Valid, Frontmatter: document.Frontmatter,
				Errors: append([]string{}, document.Errors...),
			}
			if document.Owner != "" {
				owner := document.Owner
				item.Owner = &owner
			}
			entry.Documents = append(entry.Documents, item)
		}
		projected.Descriptors = append(projected.Descriptors, entry)
	}
	return projected
}

type contextJSONEntry struct {
	Kind        string   `json:"kind"`
	Path        string   `json:"path"`
	Source      string   `json:"source"`
	Owner       *string  `json:"owner"`
	Score       int      `json:"score"`
	Reasons     []string `json:"reasons"`
	Description *string  `json:"description"`
}

type contextJSONResult struct {
	Root             string             `json:"root"`
	TargetPath       string             `json:"targetPath"`
	Query            string             `json:"query"`
	Tokens           []string           `json:"tokens"`
	IncludeDocuments bool               `json:"includeDocuments"`
	IncludeFiles     bool               `json:"includeFiles"`
	Filters          domain.Filters     `json:"filters"`
	Entries          []contextJSONEntry `json:"entries"`
}

func contextJSON(result domain.ContextResult) contextJSONResult {
	projected := contextJSONResult{
		Root: result.Root, TargetPath: result.TargetPath, Query: result.Query,
		Tokens: append([]string{}, result.Tokens...), IncludeDocuments: result.IncludeDocuments,
		IncludeFiles: result.IncludeFiles, Filters: result.Filters, Entries: []contextJSONEntry{},
	}
	for _, entry := range result.Entries {
		item := contextJSONEntry{
			Kind: entry.Kind, Path: entry.Path, Source: entry.Source, Score: entry.Score,
			Reasons: append([]string{}, entry.Reasons...),
		}
		if entry.Owner != "" {
			owner := entry.Owner
			item.Owner = &owner
		}
		if entry.Description != "" {
			description := entry.Description
			item.Description = &description
		}
		projected.Entries = append(projected.Entries, item)
	}
	return projected
}

func renderDoctor(command *cobra.Command, format string, result domain.DoctorResult) error {
	if format == "json" {
		return writeJSON(command, result)
	}
	out := command.OutOrStdout()
	if format == "markdown" {
		fmt.Fprintf(out, "# xdocs Doctor\n\nTarget: `%s`\nValid: `%t`\nErrors: `%d`\nWarnings: `%d`\n", result.TargetPath, result.Valid, result.Summary.Errors, result.Summary.Warnings)
		if len(result.Issues) > 0 {
			fmt.Fprintln(out, "\n## Issues")
			for _, issue := range result.Issues {
				path := ""
				if issue.Path != nil {
					path = " `" + *issue.Path + "`"
				}
				fmt.Fprintf(out, "- **%s** `%s`%s: %s\n", issue.Severity, issue.Code, path, issue.Message)
			}
		}
		return nil
	}
	fmt.Fprintf(out, "\nxdocs doctor\n\ntarget: %s\nvalid: %t\nerrors: %d\nwarnings: %d\n", result.TargetPath, result.Valid, result.Summary.Errors, result.Summary.Warnings)
	if len(result.Issues) > 0 {
		fmt.Fprintln(out, "\nissues:")
		for _, issue := range result.Issues {
			path := ""
			if issue.Path != nil {
				path = *issue.Path + ": "
			}
			fmt.Fprintf(out, "  %s %s: %s%s\n", issue.Severity, issue.Code, path, issue.Message)
		}
	}
	fmt.Fprintln(out)
	return nil
}

func yesNo(value bool) string {
	if value {
		return "yes"
	}
	return "no"
}

var _ = sort.Strings
