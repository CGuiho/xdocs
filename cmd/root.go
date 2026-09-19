package cmd

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/CGuiho/xdocs/internal/agent"
	"github.com/CGuiho/xdocs/internal/apperror"
	"github.com/CGuiho/xdocs/internal/update"
	"github.com/CGuiho/xdocs/internal/upgrade"
	"github.com/CGuiho/xdocs/internal/welcome"
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
	cwd       string
	config    string
	format    string
	verbose   bool
	helpTree  bool
	helpDepth int
	helpDocs  bool
}

var errHelpRendered = errors.New("developer context help rendered")

var errVersionRendered = errors.New("version rendered")

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
			useColor := welcome.ShouldUseColor(isTerminalWriter(command.OutOrStdout()))
			if flag := command.Flags().Lookup("color"); flag != nil && flag.Changed {
				if v, err := command.Flags().GetBool("color"); err == nil {
					useColor = v && welcome.ShouldUseColor(true)
				}
			} else if flag := command.PersistentFlags().Lookup("color"); flag != nil && flag.Changed {
				if v, err := command.PersistentFlags().GetBool("color"); err == nil {
					useColor = v && welcome.ShouldUseColor(true)
				}
			}
			text := welcome.RenderWithColor(runtime.GOOS, runtime.GOARCH, info.Version, useColor)
			fmt.Fprint(command.OutOrStdout(), text)
			return nil
		},
	}
	root.SetIn(deps.In)
	root.SetOut(deps.Out)
	root.SetErr(deps.Err)
	root.SetVersionTemplate("{{.Name}} v{{.Version}}\n")
	root.CompletionOptions.DisableDefaultCmd = true
	root.SetHelpCommand(&cobra.Command{Use: "help", Hidden: true})
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
	flags.Bool("color", false, "Enable ANSI color output when supported.")

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

	versionFlag := &versionCleanupValue{options: options, deps: deps}
	installLegacyCleanupVersionHook(root, options, deps, versionFlag)
	root.PersistentPreRunE = wrapLegacyCleanupPreRun(root.PersistentPreRunE, options, deps, versionFlag)
	installLegacyCleanupHelpHook(root, options, deps, versionFlag)
	for _, child := range root.Commands() {
		wrapLegacyCleanupCommandWithCarrier(child, options, deps, versionFlag)
	}
	return root
}

// installLegacyCleanupHelpHook covers every help rendering path, including
// Cobra's early --help exit that runs before PersistentPreRunE. The hook is
// installed on every command so the HelpFunc lookup always finds the wrapper
// on the executed command itself, regardless of which ancestor Cobra asks.
func installLegacyCleanupHelpHook(root *cobra.Command, options *commonOptions, deps Dependencies, carrier *versionCleanupValue) {
	var visit func(command *cobra.Command)
	visit = func(command *cobra.Command) {
		help := command.HelpFunc()
		command.SetHelpFunc(func(cmd *cobra.Command, args []string) {
			if !internalProtocolCommand(cmd) {
				if err := cleanupForHelpArgs(cmd, options, deps); err != nil {
					if carrier != nil {
						carrier.cleanupErr = err
						carrier.requested = true
					}
					return
				}
			}
			help(cmd, args)
		})
		for _, child := range command.Commands() {
			visit(child)
		}
	}
	visit(root)
}

// installLegacyCleanupVersionHook removes the legacy index on Cobra's early
// --version exit. Cobra checks the version flag inside execute() before
// PersistentPreRunE, so predefine the version flag with a NoOptDefVal hook:
// pflag invokes the flag's value setter during parsing, which runs after the
// effective --cwd flag is parsed regardless of flag order. Valid invocations
// clean exactly once; invalid syntax still fails as usage in Cobra.
func installLegacyCleanupVersionHook(root *cobra.Command, options *commonOptions, deps Dependencies, flag *versionCleanupValue) {
	if existing := root.Flags().Lookup("version"); existing != nil {
		existing.NoOptDefVal = "true"
		return
	}
	root.Flags().VarPF(flag, "version", "v", "version for "+root.DisplayName())
	root.Flags().Lookup("version").NoOptDefVal = "true"
	_ = options
	_ = deps
}

// versionCleanupValue marks a version request and removes the legacy index
// from the effective --cwd at parse time. It reports unset until Cobra parses
// --version, so normal invocations never render the version template early.
type versionCleanupValue struct {
	options    *commonOptions
	deps       Dependencies
	requested  bool
	cleanupErr error
}

func (value versionCleanupValue) String() string { return "false" }

func (value versionCleanupValue) Type() string { return "bool" }

func (value versionCleanupValue) IsBoolFlag() bool { return true }

func (value *versionCleanupValue) Set(raw string) error {
	value.requested = raw == "true"
	if value.requested {
		if value.options.cwd == "." && value.deps.WorkingDirectory != "" {
			value.options.cwd = value.deps.WorkingDirectory
		}
		if absolute, err := filepath.Abs(value.options.cwd); err == nil {
			value.options.cwd = absolute
			value.cleanupErr = removeLegacyRootIndex(absolute)
		}
	}
	return nil
}

// wrapLegacyCleanupPreRun runs invocation-time legacy cleanup before the
// shared persistent hook. The cleanup key is the effective --cwd: the flag
// value when set, otherwise the injected working directory.
func wrapLegacyCleanupPreRun(
	hook func(*cobra.Command, []string) error,
	options *commonOptions,
	deps Dependencies,
	versionFlag *versionCleanupValue,
) func(*cobra.Command, []string) error {
	return func(command *cobra.Command, args []string) error {
		if versionFlag != nil && versionFlag.requested {
			if versionFlag.cleanupErr != nil {
				err := versionFlag.cleanupErr
				versionFlag.requested = false
				versionFlag.cleanupErr = nil
				return err
			}
			if helpRequested(command) {
				return hook(command, args)
			}
			fmt.Fprintf(command.OutOrStdout(), "%s v%s\n", command.Root().Name(), command.Root().Version)
			return errVersionRendered
		}
		cwd, err := resolveEffectiveCWD(options, deps)
		if err != nil {
			return err
		}
		if !internalProtocolCommand(command) {
			if err := removeLegacyRootIndex(cwd); err != nil {
				return err
			}
		}
		return hook(command, args)
	}
}

// wrapLegacyCleanupCommand folds the effective --cwd cleanup into the help
// path of one command subtree. Cobra's --help exit runs before
// PersistentPreRunE, so the help wrapper cleans before rendering. Cleanup
// failures are recorded on the shared version-flag carrier so the pending
// help exit surfaces them in the mutation category instead of silently
// rendering help over an undeleted directory.
func wrapLegacyCleanupCommand(command *cobra.Command, options *commonOptions, deps Dependencies) {
	wrapLegacyCleanupCommandWithCarrier(command, options, deps, nil)
}

func wrapLegacyCleanupCommandWithCarrier(command *cobra.Command, options *commonOptions, deps Dependencies, carrier *versionCleanupValue) {
	help := command.HelpFunc()
	command.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		if err := cleanupForHelpArgs(cmd, options, deps); err != nil {
			if carrier != nil {
				carrier.cleanupErr = err
				carrier.requested = true
				return
			}
			help(cmd, args)
			return
		}
		help(cmd, args)
	})
	if command.Version != "" {
		_ = command.Version
	}
	for _, child := range command.Commands() {
		wrapLegacyCleanupCommandWithCarrier(child, options, deps, carrier)
	}
}

// cleanupForHelpArgs removes the legacy index for help output of one command.
// It reads the effective --cwd the same way Cobra's help path sees it:
// persistent --cwd belongs to the executed (leaf) command, so inspect that
// command's merged flag set and fall back to the injected directory.
func helpRequested(command *cobra.Command) bool {
	if command == nil {
		return false
	}
	if help, err := command.Flags().GetBool("help"); err == nil && help {
		return true
	}
	if root := command.Root(); root != nil && root != command {
		if help, err := root.Flags().GetBool("help"); err == nil && help {
			return true
		}
	}
	return false
}

func cleanupForHelpArgs(command *cobra.Command, options *commonOptions, deps Dependencies) error {
	cwd := options.cwd
	if command != nil {
		if value, err := command.Flags().GetString("cwd"); err == nil && command.Flags().Changed("cwd") {
			cwd = value
		} else if root := command.Root(); root != nil {
			if value, err := root.PersistentFlags().GetString("cwd"); err == nil && root.PersistentFlags().Changed("cwd") {
				cwd = value
			}
		}
	}
	if cwd == "" || cwd == "." {
		if deps.WorkingDirectory != "" {
			cwd = deps.WorkingDirectory
		}
	}
	if cwd == "" {
		return nil
	}
	absolute, err := filepath.Abs(cwd)
	if err != nil {
		return apperror.Wrap(apperror.Usage, "resolve --cwd", err)
	}
	return removeLegacyRootIndex(absolute)
}

func plainRootInvocation(command *cobra.Command) bool {
	return command.Flags().NFlag() == 0 && command.PersistentFlags().NFlag() == 0
}

func resolveEffectiveCWD(options *commonOptions, deps Dependencies) (string, error) {
	cwd := options.cwd
	if cwd == "." && deps.WorkingDirectory != "" {
		cwd = deps.WorkingDirectory
	}
	absolute, err := filepath.Abs(cwd)
	if err != nil {
		return "", apperror.Wrap(apperror.Usage, "resolve --cwd", err)
	}
	options.cwd = absolute
	return absolute, nil
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

func isTerminalWriter(writer io.Writer) bool {
	file, ok := writer.(*os.File)
	if !ok {
		return false
	}
	info, err := file.Stat()
	if err != nil {
		return false
	}
	return info.Mode()&os.ModeCharDevice != 0
}
