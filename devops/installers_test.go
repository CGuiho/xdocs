package main

import (
	"os"
	"strings"
	"testing"
)

func TestInstallersCoverReleaseTargetsAndTransactionalSafety(t *testing.T) {
	bashBytes, err := os.ReadFile("install.sh")
	if err != nil {
		t.Fatal(err)
	}
	powerShellBytes, err := os.ReadFile("install.ps1")
	if err != nil {
		t.Fatal(err)
	}
	bash := string(bashBytes)
	powerShell := string(powerShellBytes)

	for _, required := range []string{
		"Linux/x86_64|Linux/amd64",
		"Linux/aarch64|Linux/arm64",
		"Linux/armv7l",
		"Linux/armv6l",
		"Darwin/x86_64",
		"Darwin/arm64|Darwin/aarch64",
		`verify_asset "$ASSET"`,
		`verify_asset "$SKILL_ASSET"`,
		`verify_asset "$INSTRUCTION_ASSET"`,
		`"$DESTINATION" agent instruction update`,
		`[ -f "$BINARY_BACKUP" ]`,
		`[ -e "$AGENT_BACKUP" ]`,
		`[ -e "$CLAUDE_BACKUP" ]`,
	} {
		if !strings.Contains(bash, required) {
			t.Fatalf("Bash installer lacks %q", required)
		}
	}
	for _, required := range []string{
		`"AMD64" { $Asset = "xdocs-windows-amd64.exe" }`,
		`"ARM64" { $Asset = "xdocs-windows-arm64.exe" }`,
		"Test-XDocsChecksum $Asset",
		"Test-XDocsChecksum $SkillAsset",
		"Test-XDocsChecksum $InstructionAsset",
		"& $Destination agent instruction update",
		"Test-Path -LiteralPath $BinaryBackup",
		"Test-Path -LiteralPath $Stage.Backup",
		"$HadDisableUpdateCheck",
	} {
		if !strings.Contains(powerShell, required) {
			t.Fatalf("PowerShell installer lacks %q", required)
		}
	}
}
