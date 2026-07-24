package main

import (
	"embed"
	"fmt"
	"os"

	"github.com/CGuiho/xdocs/cmd"
)

var (
	version     = "dev"
	commit      = "unknown"
	buildDate   = "unknown"
	buildTarget = "development"
)

//go:embed skills/guiho-s-xdocs/** prompts/*.md
var agentResources embed.FS

func main() {
	info := cmd.BuildInfo{
		Version: version,
		Commit:  commit,
		Date:    buildDate,
		Target:  buildTarget,
	}
	if err := cmd.Execute(info, agentResources); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(cmd.ExitCode(err))
	}
}
