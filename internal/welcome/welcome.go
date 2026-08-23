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

	innerWidth := 56
	for _, line := range xdocsLogo {
		if w := len([]rune(line)); w+4 > innerWidth {
			innerWidth = w + 4
		}
	}
	tagline := "Structured documentation for codebases and AI agents"
	if len([]rune(tagline))+4 > innerWidth {
		innerWidth = len([]rune(tagline)) + 4
	}

	var out strings.Builder
	// Two blank lines before — as requested
	out.WriteString("\n\n")

	for i, line := range xdocsLogo {
		color := ""
		if i < len(logoColors) {
			color = logoColors[i]
		}
		out.WriteString(colorize(withColor, center(line, innerWidth), color))
		out.WriteByte('\n')
	}
	out.WriteString(colorize(withColor, center(tagline, innerWidth), ansiTan+ansiDim))
	out.WriteByte('\n')
	out.WriteString(colorize(withColor, center("GUIHO  ·  Cristóvão GUIHO", innerWidth), ansiSage))
	out.WriteString("\n\n\n")

	// Details — organization, platform, version
	writeDetail(&out, withColor, "organization", "GUIHO", ansiCream+ansiBold)
	writeDetail(&out, withColor, "platform", platform+" "+architecture, ansiCream)
	writeDetail(&out, withColor, "version", "v"+version, ansiBrown+ansiBold)
	out.WriteByte('\n')
	out.WriteString("Run ")
	out.WriteString(colorize(withColor, "xdocs --help", ansiCream+ansiBold))
	out.WriteString(" to see available commands.")
	out.WriteString("\n")
	// Two blank lines after — as requested
	out.WriteString("\n\n")
	return out.String()
}

func displayValue(labels map[string]string, value string) string {
	if label, ok := labels[value]; ok {
		return label
	}
	return value
}

func center(value string, width int) string {
	w := len([]rune(value))
	if w >= width {
		return value
	}
	pad := width - w
	// left pad half, right is implicit via center visual; we only left-pad like genius
	left := pad / 2
	return strings.Repeat(" ", left) + value
}

func colorize(enabled bool, value, codes string) string {
	if !enabled || codes == "" {
		return value
	}
	return codes + value + ansiReset
}

func writeDetail(out *strings.Builder, withColor bool, label, value, valueColor string) {
	const labelWidth = 12
	if withColor {
		// labels in forest (subtle earth), values in cream/brown accent
		out.WriteString(colorize(true, fmt.Sprintf("  %-12s", label), ansiForest))
		out.WriteString("  ")
		out.WriteString(colorize(true, value, valueColor))
		out.WriteByte('\n')
		return
	}
	fmt.Fprintf(out, "  %-12s  %s\n", label, value)
}
