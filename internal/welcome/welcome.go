package welcome

import (
	"fmt"
	"os"
	"runtime"
	"strings"
)

const (
	ansiReset = "\x1b[0m"
	ansiBold  = "\x1b[1m"
	ansiDim   = "\x1b[2m"

	// Palette from user image — earth tones:
	// 7F5539 warm brown, A68A64 tan, EDE0D4 cream, 656D4A sage, 414833 forest
	ansiBrown  = "\x1b[38;2;127;85;57m"
	ansiTan    = "\x1b[38;2;166;138;100m"
	ansiCream  = "\x1b[38;2;237;224;212m"
	ansiSage   = "\x1b[38;2;101;109;74m"
	ansiForest = "\x1b[38;2;65;72;51m"

	// ansiAccent is the xdocs primary accent: the warm brown logo tone.
	ansiAccent = ansiBrown + ansiBold
)

var platformLabels = map[string]string{
	"darwin":  "macOS",
	"linux":   "Linux",
	"windows": "Windows",
	"win32":   "Windows",
}

var archLabels = map[string]string{
	"amd64": "x64",
	"386":   "x86",
	"arm64": "arm64",
	"arm":   "arm",
}

// XDOCS logo — 6 rows, block style matching RunX/Genius beauty
var xdocsLogo = []string{
	"██╗  ██╗██████╗   ██████╗   ██████╗ ███████╗",
	"╚██╗██╔╝██╔══██╗ ██╔═══██╗ ██╔════╝ ██╔════╝",
	" ╚███╔╝ ██║  ██║ ██║   ██║ ██║      ███████╗",
	" ██╔██╗ ██║  ██║ ██║   ██║ ██║      ╚════██║",
	"██╔╝╚██╗██████╔╝ ╚██████╔╝ ╚██████╗ ███████║",
	"╚═╝  ╚═╝╚═════╝   ╚═════╝   ╚═════╝ ╚══════╝",
}

var logoColors = []string{
	ansiCream + ansiBold,
	ansiTan + ansiBold,
	ansiBrown + ansiBold,
	ansiSage + ansiBold,
	ansiForest + ansiBold,
	ansiSage + ansiBold,
}

// Render returns deterministic borderless welcome without ANSI.
func Render(platform, architecture, version string) string {
	return render(platform, architecture, version, false)
}

// RenderWithColor returns the beautiful hello window with earth palette when withColor is true.
func RenderWithColor(platform, architecture, version string, withColor bool) string {
	return render(platform, architecture, version, withColor)
}

// ShouldUseColor reports whether ANSI output should be used.
func ShouldUseColor(isTerminal bool) bool {
	if os.Getenv("NO_COLOR") != "" || os.Getenv("TERM") == "dumb" {
		return false
	}
	return isTerminal
}

func render(platform, architecture, version string, withColor bool) string {
	if platform == "" {
		platform = runtime.GOOS
	}
	if architecture == "" {
		architecture = runtime.GOARCH
	}
	platform = displayValue(platformLabels, platform)
	architecture = displayValue(archLabels, architecture)
	version = strings.TrimPrefix(strings.TrimSpace(version), "v")

	tagline := "Structured documentation for codebases and AI agents"

	var out strings.Builder
	// One blank line before, so the welcome never touches the prompt line
	out.WriteString("\n")

	for i, line := range xdocsLogo {
		color := ""
		if i < len(logoColors) {
			color = logoColors[i]
		}
		out.WriteString(colorize(withColor, line, color))
		out.WriteByte('\n')
	}
	out.WriteString(colorize(withColor, tagline, ansiTan+ansiDim))
	out.WriteByte('\n')
	out.WriteString(colorize(withColor, "GUIHO  ·  Cristóvão GUIHO", ansiSage))
	out.WriteString("\n\n")

	// Details — platform, version, author
	writeDetail(&out, withColor, "Platform", colorize(withColor, platform+" "+architecture, ansiCream))
	writeDetail(&out, withColor, "Version", colorize(withColor, "v"+version, ansiAccent))
	writeDetail(&out, withColor, "Author",
		colorize(withColor, "GUIHO (", ansiCream)+
			colorize(withColor, "www.guiho.co", ansiAccent)+
			colorize(withColor, ")", ansiCream))
	out.WriteByte('\n')
	out.WriteString("Run ")
	out.WriteString(colorize(withColor, "xdocs --help", ansiCream+ansiBold))
	out.WriteString(" to see available commands.")
	out.WriteString("\n")
	// One blank line after, so the welcome never touches the next prompt
	out.WriteString("\n")
	return out.String()
}

func displayValue(labels map[string]string, value string) string {
	if label, ok := labels[value]; ok {
		return label
	}
	return value
}

func colorize(enabled bool, value, codes string) string {
	if !enabled || codes == "" {
		return value
	}
	return codes + value + ansiReset
}

// detailLabelWidth fits the longest detail label ("Platform") so values align.
const detailLabelWidth = 8

// writeDetail writes one detail row; value is already colourized by the caller.
func writeDetail(out *strings.Builder, withColor bool, label, value string) {
	// labels in forest (subtle earth), values in cream/brown accent
	padded := colorize(withColor, fmt.Sprintf("%-*s", detailLabelWidth, label), ansiForest)
	fmt.Fprintf(out, "%s  %s\n", padded, value)
}
