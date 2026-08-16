package cmd

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/CGuiho/xdocs/internal/agent"
	"github.com/CGuiho/xdocs/internal/apperror"
	"github.com/CGuiho/xdocs/internal/update"
	"github.com/CGuiho/xdocs/internal/upgrade"
	"github.com/spf13/cobra"
)

type BuildInfo struct {
	Version string
	Commit  string
	Date    string
	Target  string
}

type Dependencies struct {
	In               io.Reader
	Out              io.Writer
	Err              io.Writer
	Resources        fs.FS
	WorkingDirectory string
	HomeDirectory    string
}

type commonOptions struct {
	cwd              string
	config           string
	format           string
	verbose          bool
	helpRequested    bool
	versionRequested bool
	helpTree         bool
	helpDepth        int
	helpDocs         bool
}

var errHelpRendered = errors.New("developer context help rendered")
var errVersionRendered = errors.New("version rendered")

type deferredBoolValue struct {
	requested *bool
}

func (value *deferredBoolValue) Set(raw string) error {
	enabled, err := strconv.ParseBool(raw)
	if err != nil {
		return err
	}
	*value.requested = enabled
	return nil
}

func (*deferredBoolValue) Type() string { return "bool" }

func (*deferredBoolValue) String() string { return "false" }

func (*deferredBoolValue) IsBoolFlag() bool { return true }

func Execute(info BuildInfo, resources fs.FS) error {
	root := NewRootCommand(Dependencies{
		In: os.Stdin, Out: os.Stdout, Err: os.Stderr, Resources: resources,
	}, info)
	err := root.Execute()
	if errors.Is(err, errHelpRendered) || errors.Is(err, errVersionRendered) {
		return nil
	}
	return err
}

func ExitCode(err error) int {
	if err == nil {
		return 0
	}
	return apperror.Code(err)
}

func NewRootCommand(deps Dependencies, info BuildInfo) *cobra.Command {
	options := &commonOptions{cwd: ".", format: "text"}
	agents := agent.New(deps.Resources, deps.HomeDirectory)
	root := &cobra.Command{
		Use:   "xdocs",
		Short: "Structured documentation for codebases and AI agents.",
		Long: "Structured documentation for codebases and AI agents. A plain invocation " +
			"ensures the global XDocs skill and this repository's managed agent instructions before printing the welcome.",
		Version:       info.Version,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          noArgs,
		PersistentPreRunE: func(command *cobra.Command, _ []string) error {
			if command.Flags().Changed("help-tree-depth") && options.helpDepth < 1 {
				return apperror.New(apperror.Usage, "--help-tree-depth must be a positive integer")
			}
			cwd := options.cwd
			if cwd == "." && deps.WorkingDirectory != "" {
				cwd = deps.WorkingDirectory
			}
			absolute, err := filepath.Abs(cwd)
			if err != nil {
				return apperror.Wrap(apperror.Usage, "resolve --cwd", err)
			}
			options.cwd = absolute
			if !internalProtocolCommand(command) {
				if err := removeLegacyRootIndex(options.cwd); err != nil {
					return err
				}
			}
			if options.helpRequested {
				if err := command.Help(); err != nil {
					return err
				}
				return errHelpRendered
			}
			if options.versionRequested {
				fmt.Fprintf(command.OutOrStdout(), "%s v%s\n", command.Name(), info.Version)
				return errVersionRendered
			}
			if options.helpTree || command.Flags().Changed("help-tree-depth") {
				fmt.Fprint(command.OutOrStdout(), renderCommandTree(command, options.helpDepth))
				return errHelpRendered
			}
			if options.helpDocs {
				text, err := renderMarkdownHelp(command, options.helpDepth)
				if err != nil {
					return err
				}
				fmt.Fprint(command.OutOrStdout(), text)
				return errHelpRendered
			}
			if err := validateFormat(options.format); err != nil {
				return err
			}
			if !internalProtocolCommand(command) {
				if completion, found, err := upgrade.ReadAndClearCompletion(); err != nil {
					fmt.Fprintf(command.ErrOrStderr(), "Warning: could not read the prior XDocs upgrade result: %v\n", err)
				} else if found {
					fmt.Fprint(command.ErrOrStderr(), upgrade.FormatCompletion(completion))
				}
				if options.format != "json" {
					if notice := update.ReadNotice(info.Version); notice != "" {
						fmt.Fprint(command.ErrOrStderr(), notice)
					}
				}
				if executable, err := os.Executable(); err == nil {
					_ = update.SpawnWorker(executable, info.Version)
				}
			}
			return nil
		},
		RunE: func(command *cobra.Command, _ []string) error {
			if plainRootInvocation(command) {
				if _, err := agents.Bootstrap(options.cwd); err != nil {
					return err
				}
			}
			if options.format == "json" {
				return writeJSON(command, map[string]any{
					"command": "xdocs", "version": info.Version,
					"message": fmt.Sprintf("Hello Windows - xdocs v%s", info.Version),
				})
			}
			fmt.Fprintf(command.OutOrStdout(), "Hello Windows - xdocs v%s\n", info.Version)
			return nil
		},
	}
	root.SetIn(deps.In)
	root.SetOut(deps.Out)
	root.SetErr(deps.Err)
	root.SetVersionTemplate("{{.Name}} v{{.Version}}\n")
	root.CompletionOptions.DisableDefaultCmd = true
	helpCommand := &cobra.Command{
		Use:    "help [command]",
		Short:  "Help about any command.",
		Hidden: true,
		Args:   maxArgs(1),
		RunE: func(command *cobra.Command, args []string) error {
			target := command.Root()
			if len(args) == 1 {
				found, _, err := command.Root().Find([]string{args[0]})
				if err != nil {
					return apperror.Wrap(apperror.Usage, "find help command", err)
				}
				target = found
			}
			return target.Help()
		},
	}
	installDeferredHelpFlags(helpCommand, &options.helpRequested)
	root.SetHelpCommand(helpCommand)
	root.SetFlagErrorFunc(func(_ *cobra.Command, err error) error {
		return apperror.Wrap(apperror.Usage, "parse flags", err)
	})

	flags := root.PersistentFlags()
	flags.StringVar(&options.cwd, "cwd", ".", "Run as if started in this directory")
	flags.StringVar(&options.config, "config", "", "Path to xdocs.yaml")
	flags.StringVar(&options.format, "format", "text", "Output format: text, json, or markdown")
	flags.BoolVar(&options.verbose, "verbose", false, "Show detailed diagnostics")
	flags.BoolVar(&options.helpTree, "help-tree", false, "Show the command subtree")
	flags.IntVar(&options.helpDepth, "help-tree-depth", 0, "Limit command-tree recursion to a positive depth")
	flags.BoolVar(&options.helpDocs, "help-docs", false, "Show Markdown documentation for this command scope")
	root.Flags().VarP(&deferredBoolValue{requested: &options.versionRequested}, "version", "v", "version for xdocs")
	root.Flags().Lookup("version").NoOptDefVal = "true"

	root.AddCommand(newInitCommand(options, agents))
	root.AddCommand(newScanCommand(options))
	root.AddCommand(newGenerateCommand(options))
	root.AddCommand(newMergeCommand(options))
	root.AddCommand(newTreeCommand(options))
	root.AddCommand(newListCommand(options))
	root.AddCommand(newMetaCommand(options))
	root.AddCommand(newContextCommand(options))
	root.AddCommand(newDoctorCommand(options))
	root.AddCommand(newAgentCommand(options, agents))
	root.AddCommand(newUpgradeCommand(options, info))
	root.AddCommand(newUninstallCommand(options))
	root.AddCommand(newUpdateWorkerCommand())
	root.AddCommand(newWindowsReplacementCommand())
	installDeferredHelpFlags(root, &options.helpRequested)
	return root
}

func installDeferredHelpFlags(command *cobra.Command, requested *bool) {
	command.Flags().VarP(&deferredBoolValue{requested: requested}, "help", "h", "help for "+command.CommandPath())
	command.Flags().Lookup("help").NoOptDefVal = "true"
	for _, child := range command.Commands() {
		installDeferredHelpFlags(child, requested)
	}
}

func internalProtocolCommand(command *cobra.Command) bool {
	return command.Name() == "__update-worker" || command.Name() == "__replace-windows"
}

func removeLegacyRootIndex(cwd string) error {
	path := filepath.Join(cwd, "XDOCS.md")
	info, err := os.Lstat(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return apperror.Wrap(apperror.Mutation, "inspect legacy XDOCS.md", err)
	}
	if info.IsDir() {
		return apperror.New(apperror.Mutation, fmt.Sprintf("legacy XDOCS.md path is a directory: %s", path))
	}
	if !info.Mode().IsRegular() && info.Mode()&os.ModeSymlink == 0 {
		return apperror.New(apperror.Mutation, fmt.Sprintf("legacy XDOCS.md path is not a regular file or symbolic link: %s", path))
	}
	if err := os.Remove(path); err != nil {
		return apperror.Wrap(apperror.Mutation, "remove legacy XDOCS.md", err)
	}
	return nil
}

func plainRootInvocation(command *cobra.Command) bool {
	return command.Flags().NFlag() == 0 && command.PersistentFlags().NFlag() == 0
}

func noArgs(_ *cobra.Command, args []string) error {
	if len(args) != 0 {
		return apperror.New(apperror.Usage, fmt.Sprintf("accepts 0 arg(s), received %d", len(args)))
	}
	return nil
}

func maxArgs(max int) cobra.PositionalArgs {
	return func(_ *cobra.Command, args []string) error {
		if len(args) > max {
			return apperror.New(apperror.Usage, fmt.Sprintf("accepts at most %d arg(s), received %d", max, len(args)))
		}
		return nil
	}
}

func rangeArgs(minimum, maximum int) cobra.PositionalArgs {
	return func(_ *cobra.Command, args []string) error {
		if len(args) < minimum || len(args) > maximum {
			return apperror.New(apperror.Usage, fmt.Sprintf("accepts between %d and %d arg(s), received %d", minimum, maximum, len(args)))
		}
		return nil
	}
}

func validateFormat(value string) error {
	switch value {
	case "text", "json", "markdown":
		return nil
	default:
		return apperror.New(apperror.Usage, fmt.Sprintf("invalid --format %q: expected text, json, or markdown", value))
	}
}

func newUpdateWorkerCommand() *cobra.Command {
	var currentVersion, lease, leaseToken string
	command := &cobra.Command{
		Use:    "__update-worker",
		Hidden: true,
		Args:   noArgs,
		RunE: func(*cobra.Command, []string) error {
			return update.RunWorker(currentVersion, lease, leaseToken)
		},
	}
	command.Flags().StringVar(&currentVersion, "current-version", "", "")
	command.Flags().StringVar(&lease, "lease", "", "")
	command.Flags().StringVar(&leaseToken, "lease-token", "", "")
	_ = command.MarkFlagRequired("current-version")
	_ = command.MarkFlagRequired("lease")
	_ = command.MarkFlagRequired("lease-token")
	return command
}

func newWindowsReplacementCommand() *cobra.Command {
	command := &cobra.Command{
		Use:                "__replace-windows",
		Hidden:             true,
		DisableFlagParsing: true,
		RunE: func(_ *cobra.Command, args []string) error {
			return upgrade.RunWindowsReplacement(args)
		},
	}
	return command
}

func writeFile(path string, content []byte, mode fs.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return apperror.Wrap(apperror.Mutation, "create output directory", err)
	}
	if err := os.WriteFile(path, content, mode); err != nil {
		return apperror.Wrap(apperror.Mutation, "write output file", err)
	}
	return nil
}

func scopeLabel(root, target string) string {
	if target == "" {
		return "project"
	}
	absolute := target
	if !filepath.IsAbs(absolute) {
		absolute = filepath.Join(root, absolute)
	}
	relative, err := filepath.Rel(root, absolute)
	if err != nil || relative == "." {
		return "project"
	}
	return filepath.ToSlash(relative)
}

func trimVersion(value string) string {
	return strings.TrimPrefix(value, "v")
}

func marshalIndented(value any) ([]byte, error) {
	return json.MarshalIndent(value, "", "  ")
}
