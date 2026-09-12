package xdocs

import (
	"encoding/json"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
)

func TestBuildTreeContainsEveryDiscoveredDescriptorByDirectory(t *testing.T) {
	root := t.TempDir()
	missingParent := "missing-parent"
	files := []File{
		treeTestFile(root, "XDOCS.md", false, nil),
		treeTestFile(root, "technologies/technologies.xdocs.md", true, treeTestMetadata("technologies", "Technology directory context.", nil)),
		treeTestFile(root, "technologies/cloud/cloud.xdocs.md", true, treeTestMetadata("cloud", "Cloud directory context.", treeStringPointer("technologies"))),
		treeTestFile(root, "technologies/cloud/observability/observability.xdocs.md", true, treeTestMetadata("observability", "Observability directory context.", treeStringPointer("cloud"))),
		treeTestFile(root, "technologies/cloud/observability/runtime/runtime.xdocs.md", true, treeTestMetadata("runtime", "Runtime directory context.", treeStringPointer("observability"))),
		treeTestFile(root, "technologies/cloud/broken/broken.xdocs.md", false, nil, "Missing YAML frontmatter."),
		treeTestFile(root, "orphan/deep/orphan.xdocs.md", true, treeTestMetadata("orphan", "Orphan directory context.", &missingParent)),
		treeTestFile(root, "duplicates/first/duplicate.xdocs.md", true, treeTestMetadata("duplicate", "First duplicate subject.", nil)),
		treeTestFile(root, "duplicates/second/duplicate.xdocs.md", true, treeTestMetadata("duplicate", "Second duplicate subject.", nil)),
		treeTestFile(root, "legacy/.xdocs.md", false, nil, `Invalid xdocs descriptor filename.`),
	}

	tree := BuildTree(files)
	nodes := treeTestNodes(tree)
	if got, want := len(nodes), len(files)+1; got != want {
		t.Fatalf("tree node count = %d, want synthetic root plus %d discovered entries", got, len(files))
	}

	byPath := map[string][]*TreeNode{}
	for _, node := range nodes {
		if node.Path != nil {
			byPath[*node.Path] = append(byPath[*node.Path], node)
		}
	}
	expectedPaths := make([]string, 0, len(files))
	for _, file := range files {
		expectedPaths = append(expectedPaths, file.RelativePath)
	}
	sort.Strings(expectedPaths)
	for _, path := range expectedPaths {
		if got := len(byPath[path]); got != 1 {
			t.Fatalf("tree path %q appears %d times, want exactly once", path, got)
		}
	}

	parentByPath := treeTestParentPaths(tree)
	wantParents := map[string]string{
		"XDOCS.md":                                                  "(root)",
		"technologies/technologies.xdocs.md":                        "(root)",
		"technologies/cloud/cloud.xdocs.md":                         "technologies/technologies.xdocs.md",
		"technologies/cloud/observability/observability.xdocs.md":   "technologies/cloud/cloud.xdocs.md",
		"technologies/cloud/observability/runtime/runtime.xdocs.md": "technologies/cloud/observability/observability.xdocs.md",
		"technologies/cloud/broken/broken.xdocs.md":                 "technologies/cloud/cloud.xdocs.md",
		"orphan/deep/orphan.xdocs.md":                               "(root)",
		"duplicates/first/duplicate.xdocs.md":                       "(root)",
		"duplicates/second/duplicate.xdocs.md":                      "(root)",
		"legacy/.xdocs.md":                                          "(root)",
	}
	for path, wantParent := range wantParents {
		if got := parentByPath[path]; got != wantParent {
			t.Errorf("parent of %q = %q, want %q", path, got, wantParent)
		}
	}

	index := byPath["XDOCS.md"][0]
	if index.Kind != "index" {
		t.Errorf("root index kind = %q, want index", index.Kind)
	}
	if index.Subject != "XDOCS.md" {
		t.Errorf("root index subject = %q, want XDOCS.md", index.Subject)
	}
	if index.Valid {
		t.Error("special root index should preserve its non-descriptor validity state")
	}

	invalid := byPath["technologies/cloud/broken/broken.xdocs.md"][0]
	if invalid.Kind != "descriptor" || invalid.Valid {
		t.Fatalf("invalid descriptor was not retained as an invalid descriptor: %#v", invalid)
	}
	if !strings.Contains(invalid.Description, "Missing YAML frontmatter") {
		t.Errorf("invalid descriptor lost its diagnostic context: %q", invalid.Description)
	}

	orphan := byPath["orphan/deep/orphan.xdocs.md"][0]
	if orphan.Description != "Orphan directory context." {
		t.Errorf("orphan descriptor lost its available description: %q", orphan.Description)
	}
	if orphan.Valid != true {
		t.Error("tree display should preserve a parsed orphan descriptor as available/valid metadata")
	}
}

func TestBuildTreeRetainsDuplicateSubjectsAndSemanticCyclesWithoutJSONCycles(t *testing.T) {
	root := t.TempDir()
	alphaParent := "beta"
	betaParent := "alpha"
	files := []File{
		treeTestFile(root, "alpha/alpha.xdocs.md", true, treeTestMetadata("alpha", "Alpha context.", &alphaParent)),
		treeTestFile(root, "beta/beta.xdocs.md", true, treeTestMetadata("beta", "Beta context.", &betaParent)),
		treeTestFile(root, "same/one.xdocs.md", true, treeTestMetadata("same", "First same subject.", nil)),
		treeTestFile(root, "same/two.xdocs.md", true, treeTestMetadata("same", "Second same subject.", nil)),
		treeTestFile(root, "invalid/deeper/invalid.xdocs.md", false, nil, "Invalid YAML frontmatter."),
	}

	tree := BuildTree(files)
	nodes := treeTestNodes(tree)
	paths := make([]string, 0, len(files))
	for _, node := range nodes {
		if node.Path != nil {
			paths = append(paths, *node.Path)
		}
	}
	sort.Strings(paths)
	wantPaths := make([]string, 0, len(files))
	for _, file := range files {
		wantPaths = append(wantPaths, file.RelativePath)
	}
	sort.Strings(wantPaths)
	if !reflect.DeepEqual(paths, wantPaths) {
		t.Fatalf("tree paths = %#v, want %#v", paths, wantPaths)
	}

	validation := ValidateTree(files)
	if validation.Valid {
		t.Fatal("semantic cycle and duplicate subjects unexpectedly passed tree validation")
	}
	validationErrors := strings.Join(validation.Errors, "\n")
	for _, want := range []string{"Duplicate subject", "Tree cycle detected"} {
		if !strings.Contains(validationErrors, want) {
			t.Errorf("validation errors omitted %q: %s", want, validationErrors)
		}
	}

	data, err := json.Marshal(tree)
	if err != nil {
		t.Fatalf("tree JSON contains a cycle: %v", err)
	}
	var decoded TreeNode
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("tree JSON could not be decoded: %v", err)
	}
	if got := len(treeTestNodes(&decoded)); got != len(files)+1 {
		t.Fatalf("decoded tree node count = %d, want %d", got, len(files)+1)
	}
}

func TestTreeRenderersAreDeterministicAndExposeAllPathsAndContext(t *testing.T) {
	root := t.TempDir()
	files := []File{
		treeTestFile(root, "zeta/zeta.xdocs.md", true, treeTestMetadata("zeta", "Zeta context.", nil)),
		treeTestFile(root, "alpha/alpha.xdocs.md", true, treeTestMetadata("alpha", "Alpha context.", nil)),
		treeTestFile(root, "alpha/deep/broken.xdocs.md", false, nil, "Missing YAML frontmatter."),
		treeTestFile(root, "XDOCS.md", false, nil),
	}
	reversed := append([]File(nil), files...)
	for left, right := 0, len(reversed)-1; left < right; left, right = left+1, right-1 {
		reversed[left], reversed[right] = reversed[right], reversed[left]
	}

	first := BuildTree(files)
	second := BuildTree(reversed)
	textFirst, textSecond := RenderTree(first), RenderTree(second)
	markdownFirst, markdownSecond := RenderTreeMarkdown(first), RenderTreeMarkdown(second)
	jsonFirstBytes, err := json.Marshal(first)
	if err != nil {
		t.Fatal(err)
	}
	jsonSecondBytes, err := json.Marshal(second)
	if err != nil {
		t.Fatal(err)
	}
	if textFirst != textSecond || markdownFirst != markdownSecond || string(jsonFirstBytes) != string(jsonSecondBytes) {
		t.Fatalf("tree renderers are input-order dependent:\ntext:\n%s\n---\n%s\nmarkdown:\n%s\n---\n%s\njson:\n%s\n---\n%s", textFirst, textSecond, markdownFirst, markdownSecond, jsonFirstBytes, jsonSecondBytes)
	}

	for _, path := range []string{"XDOCS.md", "alpha/alpha.xdocs.md", "alpha/deep/broken.xdocs.md", "zeta/zeta.xdocs.md"} {
		for format, output := range map[string]string{"text": textFirst, "markdown": markdownFirst, "json": string(jsonFirstBytes)} {
			if !strings.Contains(output, path) {
				t.Errorf("%s tree omitted path %q:\n%s", format, path, output)
			}
		}
	}
	for _, description := range []string{"Alpha context.", "Zeta context.", "Missing YAML frontmatter."} {
		for format, output := range map[string]string{"markdown": markdownFirst, "json": string(jsonFirstBytes)} {
			if !strings.Contains(output, description) {
				t.Errorf("%s tree omitted available context %q:\n%s", format, description, output)
			}
		}
	}
}

func treeTestFile(root, relativePath string, valid bool, metadata *Metadata, errors ...string) File {
	path := filepath.Join(root, filepath.FromSlash(relativePath))
	return File{
		Path:         path,
		RelativePath: filepath.ToSlash(relativePath),
		Directory:    filepath.Dir(path),
		Metadata:     metadata,
		Valid:        valid,
		Errors:       append([]string(nil), errors...),
		Documents:    []MarkdownDocument{},
	}
}

func treeTestMetadata(subject, description string, parent *string) *Metadata {
	return &Metadata{
		Subject:     subject,
		Description: description,
		Parent:      parent,
		Children:    []string{},
		Files:       map[string]string{},
		Documents:   map[string]string{},
		Tags:        []string{},
		Keywords:    []string{},
		Flags:       []string{},
	}
}

func treeTestNodes(root *TreeNode) []*TreeNode {
	var result []*TreeNode
	seen := map[*TreeNode]bool{}
	var visit func(*TreeNode)
	visit = func(node *TreeNode) {
		if node == nil || seen[node] {
			return
		}
		seen[node] = true
		result = append(result, node)
		for _, child := range node.Children {
			visit(child)
		}
	}
	visit(root)
	return result
}

func treeTestParentPaths(root *TreeNode) map[string]string {
	result := map[string]string{}
	seen := map[*TreeNode]bool{}
	var visit func(*TreeNode, string)
	visit = func(node *TreeNode, parent string) {
		if node == nil || seen[node] {
			return
		}
		seen[node] = true
		if node.Path != nil {
			result[*node.Path] = parent
		}
		label := "(root)"
		if node.Path != nil {
			label = *node.Path
		}
		for _, child := range node.Children {
			visit(child, label)
		}
	}
	visit(root, "")
	return result
}

func treeStringPointer(value string) *string {
	return &value
}
