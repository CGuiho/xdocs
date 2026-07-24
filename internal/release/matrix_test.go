package release

import (
	"slices"
	"testing"
)

func TestExactElevenArtifactContract(t *testing.T) {
	if err := Validate(); err != nil {
		t.Fatal(err)
	}
	expected := []string{
		"checksums.txt",
		"guiho-i-xdocs.md",
		"guiho-s-xdocs.zip",
		"xdocs-darwin-amd64",
		"xdocs-darwin-arm64",
		"xdocs-linux-amd64",
		"xdocs-linux-arm64",
		"xdocs-linux-armv6",
		"xdocs-linux-armv7",
		"xdocs-windows-amd64.exe",
		"xdocs-windows-arm64.exe",
	}
	if !slices.Equal(AssetNames(), expected) {
		t.Fatalf("unexpected release assets: %#v", AssetNames())
	}
}
