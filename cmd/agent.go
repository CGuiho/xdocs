package cmd

import (
	"fmt"

	"github.com/CGuiho/xdocs/internal/agent"
	"github.com/spf13/cobra"
)

func newAgentCommand(options *commonOptions, service *agent.Service) *cobra.Command {
	command := &cobra.Command{
		Use:   "agent",
		Short: "Manage xdocs agent resources.",
		Args:  noArgs,
		RunE:  showHelp,
	}
	command.AddCommand(newAgentSkillCommand(options, service))
	command.AddCommand(newAgentInstructionCommand(options))
	command.AddCommand(newAgentPromptCommand(options, service))
	return command
}

func newAgentSkillCommand(options *commonOptions, service *agent.Service) *cobra.Command {
	command := &cobra.Command{
		Use:   "skill",
		Short: "Manage the embedded xdocs skill.",
		Args:  noArgs,
		RunE:  showHelp,
	}
	for _, action := range []string{"install", "uninstall", "update"} {
		action := action
		var local bool
		child := &cobra.Command{
			Use:   action,
			Short: skillActionDescription(action),
			Args:  noArgs,
			RunE: func(command *cobra.Command, _ []string) error {
				scope := "global"
				if local {
					scope = "local"
				}
				if action == "uninstall" {
					result, err := service.Uninstall(scope, options.cwd)
					if err != nil {
						return err
					}
					return writeAgentValue(command, options.format, map[string]any{"action": action, "scope": scope, "result": result})
				}
				result, err := service.Install(scope, options.cwd)
				if err != nil {
					return err
				}
				return writeAgentValue(command, options.format, map[string]any{"action": action, "scope": scope, "result": result})
			},
		}
		child.Flags().BoolVar(&local, "local", false, "Use project-local scope instead of global scope")
		command.AddCommand(child)
	}
	var filter string
	list := &cobra.Command{
		Use:   "list",
		Short: "List embedded agent skills.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			result, err := service.ListSkills(filter)
			if err != nil {
				return err
			}
			return writeAgentValue(command, options.format, result)
		},
	}
	list.Flags().StringVar(&filter, "filter", "", "Filter skill metadata")
	command.AddCommand(list)
	show := &cobra.Command{
		Use:   "show [id]",
		Short: "Show embedded skill metadata.",
		Args:  maxArgs(1),
		RunE: func(command *cobra.Command, args []string) error {
			id := agent.SkillName
			if len(args) == 1 {
				id = args[0]
			}
			result, err := service.ShowSkill(id)
			if err != nil {
				return err
			}
			return writeAgentValue(command, options.format, result)
		},
	}
	command.AddCommand(show)
	return command
}

func newAgentInstructionCommand(options *commonOptions) *cobra.Command {
	command := &cobra.Command{
		Use:   "instruction",
		Short: "Manage AGENTS.md and CLAUDE.md instructions.",
		Args:  noArgs,
		RunE:  showHelp,
	}
	for _, action := range []string{"apply", "remove", "update"} {
		action := action
		child := &cobra.Command{
			Use:   action,
			Short: instructionActionDescription(action),
			Args:  noArgs,
			RunE: func(command *cobra.Command, _ []string) error {
				var (
					result []agent.InstructionResult
					err    error
				)
				if action == "remove" {
					result, err = agent.RemoveInstructions(options.cwd)
				} else {
					result, err = agent.ApplyInstructions(options.cwd)
				}
				if err != nil {
					return err
				}
				return writeAgentValue(command, options.format, map[string]any{"action": action, "result": result})
			},
		}
		command.AddCommand(child)
	}
	command.AddCommand(&cobra.Command{
		Use:   "show",
		Short: "Show the raw canonical instruction template.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			if options.format == "json" {
				return writeJSON(command, map[string]string{"instruction": agent.InstructionTemplate})
			}
			fmt.Fprint(command.OutOrStdout(), agent.InstructionTemplate)
			return nil
		},
	})
	return command
}

func newAgentPromptCommand(options *commonOptions, service *agent.Service) *cobra.Command {
	command := &cobra.Command{
		Use:   "prompt",
		Short: "Discover and print embedded prompts.",
		Args:  noArgs,
		RunE:  showHelp,
	}
	var namesOnly bool
	list := &cobra.Command{
		Use:   "list",
		Short: "List embedded prompts.",
		Args:  noArgs,
		RunE: func(command *cobra.Command, _ []string) error {
			prompts, err := service.Prompts()
			if err != nil {
				return err
			}
			if namesOnly {
				if options.format == "json" {
					names := make([]string, 0, len(prompts))
					for _, prompt := range prompts {
						names = append(names, prompt.Name)
					}
					return writeJSON(command, names)
				}
				for _, prompt := range prompts {
					fmt.Fprintln(command.OutOrStdout(), prompt.Name)
				}
				return nil
			}
			type summary struct {
				Name        string `json:"name"`
				Description string `json:"description"`
			}
			result := make([]summary, 0, len(prompts))
			for _, prompt := range prompts {
				result = append(result, summary{prompt.Name, prompt.Description})
			}
			return writeAgentValue(command, options.format, result)
		},
	}
	list.Flags().BoolVar(&namesOnly, "names", false, "Print prompt names only")
	command.AddCommand(list)
	command.AddCommand(&cobra.Command{
		Use:   "show <id>",
		Short: "Print a raw embedded prompt body.",
		Args:  rangeArgs(1, 1),
		RunE: func(command *cobra.Command, args []string) error {
			prompt, err := service.ShowPrompt(args[0])
			if err != nil {
				return err
			}
			if options.format == "json" {
				return writeJSON(command, prompt)
			}
			fmt.Fprintln(command.OutOrStdout(), prompt.Body)
			return nil
		},
	})
	return command
}

func writeAgentValue(command *cobra.Command, format string, value any) error {
	if format == "json" {
		return writeJSON(command, value)
	}
	fmt.Fprintln(command.OutOrStdout(), formatAgentValue(value, ""))
	return nil
}

func formatAgentValue(value any, prefix string) string {
	switch typed := value.(type) {
	case string:
		return prefix + typed
	case []string:
		result := ""
		for _, item := range typed {
			result += prefix + item + "\n"
		}
		return result
	default:
		data, _ := jsonMarshal(value)
		return prefix + string(data)
	}
}

func jsonMarshal(value any) ([]byte, error) {
	return marshalIndented(value)
}

func showHelp(command *cobra.Command, _ []string) error {
	return command.Help()
}

func skillActionDescription(action string) string {
	switch action {
	case "install":
		return "Install the bundled skill in both tool locations."
	case "uninstall":
		return "Uninstall the skill from both tool locations."
	default:
		return "Refresh the skill in both tool locations."
	}
}

func instructionActionDescription(action string) string {
	switch action {
	case "apply":
		return "Apply canonical instructions idempotently."
	case "remove":
		return "Remove managed xdocs instructions."
	default:
		return "Refresh stale managed instructions."
	}
}
