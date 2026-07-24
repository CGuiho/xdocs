package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/CGuiho/xdocs/internal/apperror"
	"github.com/CGuiho/xdocs/internal/update"
	"github.com/CGuiho/xdocs/internal/upgrade"
	"github.com/spf13/cobra"
)

func newUpgradeCommand(options *commonOptions, info BuildInfo) *cobra.Command {
	var requestedVersion string
	var dryRun bool
	command := &cobra.Command{
		Use:   "upgrade",
		Short: "Upgrade the installed xdocs binary.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			service := upgrade.New()
			var progress = command.ErrOrStderr()
			if options.format == "json" {
				progress = nil
			}
			result, err := service.Upgrade(info.Version, info.Target, requestedVersion, dryRun, progress)
			if err != nil {
				if result.Recovery != "" {
					if options.format == "json" {
						if writeErr := writeJSON(command, result); writeErr != nil {
							return writeErr
						}
					} else {
						fmt.Fprintf(command.ErrOrStderr(), "outcome: failed\nrecovery: %s\n", result.Recovery)
					}
				}
				return err
			}
			if options.format == "json" {
				return writeJSON(command, result)
			}
			fmt.Fprintf(command.OutOrStdout(), "current: %s\ntarget: %s\nasset: %s\noutcome: %s\n", result.Plan.CurrentVersion, result.Plan.TargetVersion, result.Plan.AssetName, result.Outcome)
			if result.Scheduled {
				fmt.Fprintln(command.OutOrStdout(), "replacement: scheduled after the current Windows process exits")
			}
			fmt.Fprintln(command.OutOrStdout(), "recovery: "+result.Recovery)
			return nil
		},
	}
	command.Flags().StringVar(&requestedVersion, "version", "", "Install a specific version")
	command.Flags().BoolVar(&dryRun, "dry-run", false, "Preview without replacing the binary")
	command.AddCommand(newUpgradeCheckCommand(options, info))
	command.AddCommand(newUpgradeListCommand(options, info))
	return command
}

func newUpgradeCheckCommand(options *commonOptions, info BuildInfo) *cobra.Command {
	return &cobra.Command{
		Use:   "check",
		Short: "Check whether a newer release exists.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			result, err := update.NewClient().Check(info.Version)
			if err != nil {
				return err
			}
			if options.format == "json" {
				return writeJSON(command, result)
			}
			fmt.Fprintf(command.OutOrStdout(), "current: %s\nlatest: %s\nupdate available: %t\n", info.Version, result.LatestVersion, result.NewVersionAvailable)
			if result.NewVersionAvailable {
				fmt.Fprintln(command.OutOrStdout(), "upgrade: "+result.UpgradeCommand)
			}
			return nil
		},
	}
}

func newUpgradeListCommand(options *commonOptions, info BuildInfo) *cobra.Command {
	var page, size int
	command := &cobra.Command{
		Use:   "list",
		Short: "List published releases eight at a time.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			target := upgrade.AssetName(upgrade.Target(info.Target))
			result, err := update.NewClient().List(info.Version, target, page, size)
			if err != nil {
				return err
			}
			if options.format == "json" {
				return writeJSON(command, result)
			}
			if options.format == "markdown" {
				fmt.Fprintln(command.OutOrStdout(), "| Version | Channel | Prerelease | Published | Compatible | Release |")
				fmt.Fprintln(command.OutOrStdout(), "| --- | --- | --- | --- | --- | --- |")
				for _, release := range result.Releases {
					published := ""
					if release.PublishedAt != nil {
						published = *release.PublishedAt
					}
					compatible := "no"
					if release.CompatibleAsset != nil {
						compatible = release.CompatibleAsset.Name
					}
					fmt.Fprintf(command.OutOrStdout(), "| %s | %s | %t | %s | %s | [release](%s) |\n", release.Version, release.Channel, release.Prerelease, published, compatible, release.ReleaseURL)
				}
				return nil
			}
			fmt.Fprintln(command.OutOrStdout(), "VERSION\tCHANNEL\tPRERELEASE\tPUBLISHED\tCOMPATIBLE\tRELEASE")
			for _, release := range result.Releases {
				published := ""
				if release.PublishedAt != nil {
					published = *release.PublishedAt
				}
				compatible := "no"
				if release.CompatibleAsset != nil {
					compatible = release.CompatibleAsset.Name
				}
				fmt.Fprintf(command.OutOrStdout(), "%s\t%s\t%t\t%s\t%s\t%s\n", release.Version, release.Channel, release.Prerelease, published, compatible, release.ReleaseURL)
			}
			fmt.Fprintf(command.OutOrStdout(), "\npage %d of %d (%d releases)\n", result.Pagination.Page, result.Pagination.TotalPages, result.Pagination.TotalItems)
			if result.Pagination.PreviousCommand != nil {
				fmt.Fprintln(command.OutOrStdout(), "previous: "+*result.Pagination.PreviousCommand)
			}
			if result.Pagination.NextCommand != nil {
				fmt.Fprintln(command.OutOrStdout(), "next: "+*result.Pagination.NextCommand)
			}
			return nil
		},
	}
	command.Flags().IntVar(&page, "page", 1, "Positive result page")
	command.Flags().IntVar(&size, "size", 8, "Positive page size up to 100")
	return command
}

func newUninstallCommand(options *commonOptions) *cobra.Command {
	var dryRun bool
	command := &cobra.Command{
		Use:   "uninstall",
		Short: "Remove the installed native xdocs binary.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			executable, err := os.Executable()
			if err != nil {
				return apperror.Wrap(apperror.Mutation, "resolve executable", err)
			}
			executable, _ = filepath.EvalSymlinks(executable)
			result := map[string]any{"executablePath": executable, "dryRun": dryRun, "scheduled": false}
			if !dryRun {
				scheduled, err := removeExecutable(executable)
				if err != nil {
					return err
				}
				result["scheduled"] = scheduled
			}
			if options.format == "json" {
				return writeJSON(command, result)
			}
			fmt.Fprintf(command.OutOrStdout(), "executable: %s\ndry run: %t\nscheduled: %t\n", executable, dryRun, result["scheduled"])
			return nil
		},
	}
	command.Flags().BoolVar(&dryRun, "dry-run", false, "Preview without removing the binary")
	return command
}
