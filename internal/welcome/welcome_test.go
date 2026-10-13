package welcome

import (
	"strings"
	"testing"
)

func TestRenderIsLeftAlignedWithoutCreatorLine(t *testing.T) {
	got := Render("linux", "amd64", "0.12.0")
	want := "\n" + strings.Join(xdocsLogo, "\n") + "\n" +
		"Structured documentation for codebases and AI agents\n" +
		"GUIHO  ·  Cristóvão GUIHO\n" +
		"\n" +
		"Platform  Linux x64\n" +
		"Version   v0.12.0\n" +
		"Author    GUIHO (www.guiho.co)\n" +
		"\n" +
		"Run xdocs --help to see available commands.\n" +
		"\n"
	if got != want {
		t.Fatalf("unexpected welcome layout:\ngot:\n%q\nwant:\n%q", got, want)
	}
}

func TestRenderWithColorKeepsLeftAlignment(t *testing.T) {
	got := RenderWithColor("windows", "arm64", "v1.2.3", true)
	for _, line := range strings.Split(got, "\n") {
		if strings.HasPrefix(line, " ") {
			t.Fatalf("coloured welcome line is indented: %q", line)
		}
	}
	for _, required := range []string{
		logoColors[0] + xdocsLogo[0] + ansiReset + "\n",
		ansiSage + "GUIHO  ·  Cristóvão GUIHO" + ansiReset + "\n\n" + ansiForest + "Platform" + ansiReset,
		ansiForest + "Version " + ansiReset + "  " + ansiBrown + ansiBold + "v1.2.3" + ansiReset + "\n" +
			ansiForest + "Author  " + ansiReset + "  " +
			ansiCream + "GUIHO (" + ansiReset + ansiAccent + "www.guiho.co" + ansiReset + ansiCream + ")" + ansiReset + "\n\nRun ",
	} {
		if !strings.Contains(got, required) {
			t.Fatalf("coloured welcome omits %q:\n%q", required, got)
		}
	}
	if strings.Contains(got, "organization") {
		t.Fatalf("coloured welcome still shows the organization line: %q", got)
	}
}
