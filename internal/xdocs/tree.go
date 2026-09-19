package xdocs

import (
	"fmt"
	"path/filepath"
	"sort"
	"strings"
)

// BuildTree builds a display tree from directory containment. Descriptor
// metadata relationships remain a doctor concern; using them here would hide
// malformed, orphaned, or duplicate descriptors from the navigable tree.
func BuildTree(files []File) *TreeNode {
	root := &TreeNode{
		Subject:     "(root)",
		Description: "Project XDocs tree.",
		Kind:        "project",
		Valid:       true,
		Children:    []*TreeNode{},
	}

	type entry struct {
		file  File
		node  *TreeNode
		dir   string
		depth int
	}
	entries := make([]entry, 0, len(files))
	for _, file := range files {
		if !IsDescriptorCandidate(file.Path) {
			continue
		}
		kind := "descriptor"
		valid := file.Valid
		path := file.RelativePath
		subject := filepath.Base(file.RelativePath)
		description := ""
		errors := append([]string(nil), file.Errors...)
		if file.Metadata != nil {
			subject = file.Metadata.Subject
			description = file.Metadata.Description
		} else if len(errors) > 0 {
			description = errors[0]
		}
		if subject == "" {
			subject = file.RelativePath
		}
		if description == "" {
			description = "Descriptor metadata is invalid or unavailable."
		}
		node := &TreeNode{
			Subject: subject, Description: description, Path: &path,
			Kind: kind, Valid: valid, Errors: errors, Children: []*TreeNode{},
		}
		directory := filepath.Clean(file.Directory)
		entries = append(entries, entry{file: file, node: node, dir: directory, depth: pathDepth(directory)})
	}
	sort.SliceStable(entries, func(i, j int) bool {
		return entries[i].file.RelativePath < entries[j].file.RelativePath
	})

	// Every entry is a named descriptor; containment nests descendants under
	// the nearest ancestor descriptor directory.
	descriptorEntries := make([]int, 0, len(entries))
	for index, item := range entries {
		if item.node.Kind == "descriptor" {
			descriptorEntries = append(descriptorEntries, index)
		}
	}
	for index := range entries {
		item := &entries[index]
		parent := -1
		bestDepth := -1
		if item.node.Kind == "descriptor" {
			for _, candidateIndex := range descriptorEntries {
				if candidateIndex == index {
					continue
				}
				candidate := entries[candidateIndex]
				if candidate.depth >= item.depth || !directoryContains(candidate.dir, item.dir) {
					continue
				}
				if candidate.depth > bestDepth {
					parent = candidateIndex
					bestDepth = candidate.depth
				}
			}
		}
		if parent >= 0 {
			addChild(entries[parent].node, item.node)
		} else {
			addChild(root, item.node)
		}
	}
	for _, item := range entries {
		sort.SliceStable(item.node.Children, func(i, j int) bool {
			left, right := item.node.Children[i], item.node.Children[j]
			leftPath, rightPath := "", ""
			if left.Path != nil {
				leftPath = *left.Path
			}
			if right.Path != nil {
				rightPath = *right.Path
			}
			if leftPath != rightPath {
				return leftPath < rightPath
			}
			return left.Subject < right.Subject
		})
	}
	sort.SliceStable(root.Children, func(i, j int) bool {
		left, right := root.Children[i], root.Children[j]
		leftPath, rightPath := "", ""
		if left.Path != nil {
			leftPath = *left.Path
		}
		if right.Path != nil {
			rightPath = *right.Path
		}
		return leftPath < rightPath
	})
	return root
}

func pathDepth(value string) int {
	value = filepath.Clean(value)
	if value == "." || value == string(filepath.Separator) {
		return 0
	}
	parts := strings.Split(filepath.ToSlash(value), "/")
	if len(parts) == 1 && parts[0] == "." {
		return 0
	}
	return len(parts)
}

func directoryContains(parent, child string) bool {
	relative, err := filepath.Rel(parent, child)
	return err == nil && relative != "." && relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator)) && !filepath.IsAbs(relative)
}

func addChild(parent, child *TreeNode) {
	if parent == nil || child == nil || parent == child {
		return
	}
	for _, existing := range parent.Children {
		if existing == child {
			return
		}
	}
	parent.Children = append(parent.Children, child)
}

func ValidateTree(files []File) TreeValidation {
	result := TreeValidation{Valid: true, Warnings: []string{}, Errors: []string{}}
	subjects := map[string]*File{}
	rootCount := 0
	for _, file := range files {
		if file.Metadata == nil {
			continue
		}
		if subjects[file.Metadata.Subject] != nil {
			result.Errors = append(result.Errors, fmt.Sprintf(`Duplicate subject: "%s" in %s`, file.Metadata.Subject, file.RelativePath))
		} else {
			current := file
			subjects[file.Metadata.Subject] = &current
		}
		if file.Metadata.Parent == nil {
			rootCount++
		}
	}
	if len(subjects) > 0 && rootCount != 1 {
		result.Errors = append(result.Errors, fmt.Sprintf("Tree must contain exactly one root subject; found %d.", rootCount))
	}
	for _, file := range files {
		if file.Metadata == nil {
			continue
		}
		if file.Metadata.Parent != nil {
			parent := subjects[*file.Metadata.Parent]
			if parent == nil {
				result.Errors = append(result.Errors, fmt.Sprintf(`Orphan subject: "%s" references non-existent parent "%s" in %s`, file.Metadata.Subject, *file.Metadata.Parent, file.RelativePath))
			} else if occurrences(parent.Metadata.Children, file.Metadata.Subject) != 1 {
				result.Errors = append(result.Errors, fmt.Sprintf(
					`Parent-child mismatch: "%s" names parent "%s", whose children must contain it exactly once.`,
					file.Metadata.Subject,
					*file.Metadata.Parent,
				))
			}
		}
		seenChildren := map[string]bool{}
		for _, childName := range file.Metadata.Children {
			if seenChildren[childName] {
				result.Errors = append(result.Errors, fmt.Sprintf(`Duplicate child: "%s" lists "%s" more than once in %s`, file.Metadata.Subject, childName, file.RelativePath))
				continue
			}
			seenChildren[childName] = true
			childFile := subjects[childName]
			if childFile == nil {
				result.Errors = append(result.Errors, fmt.Sprintf(`Missing child: "%s" references non-existent child "%s" in %s`, file.Metadata.Subject, childName, file.RelativePath))
				continue
			}
			if childFile.Metadata.Parent == nil || *childFile.Metadata.Parent != file.Metadata.Subject {
				result.Errors = append(result.Errors, fmt.Sprintf(
					`Parent-child mismatch: "%s" lists child "%s", whose parent does not point back.`,
					file.Metadata.Subject,
					childName,
				))
			}
		}
	}
	state := map[string]int{}
	var visit func(string)
	visit = func(subject string) {
		switch state[subject] {
		case 1:
			result.Errors = append(result.Errors, fmt.Sprintf(`Tree cycle detected at subject "%s".`, subject))
			return
		case 2:
			return
		}
		state[subject] = 1
		file := subjects[subject]
		if file != nil && file.Metadata.Parent != nil && subjects[*file.Metadata.Parent] != nil {
			visit(*file.Metadata.Parent)
		}
		state[subject] = 2
	}
	names := make([]string, 0, len(subjects))
	for subject := range subjects {
		names = append(names, subject)
	}
	sort.Strings(names)
	for _, subject := range names {
		visit(subject)
	}
	sort.Strings(result.Errors)
	sort.Strings(result.Warnings)
	result.Valid = len(result.Errors) == 0
	return result
}

func occurrences(values []string, wanted string) int {
	count := 0
	for _, value := range values {
		if value == wanted {
			count++
		}
	}
	return count
}

func RenderTree(root *TreeNode) string {
	var lines []string
	seen := map[*TreeNode]bool{}
	var visit func(*TreeNode, string)
	visit = func(node *TreeNode, prefix string) {
		if node == nil || seen[node] {
			return
		}
		seen[node] = true
		lines = append(lines, treeLabel(node, prefix == "", prefix))
		for _, child := range node.Children {
			childPrefix := prefix + "|  "
			if prefix != "" {
				childPrefix = prefix + "  "
			}
			visit(child, childPrefix)
		}
	}
	visit(root, "")
	return strings.Join(lines, "\n")
}

func treeLabel(node *TreeNode, root bool, prefix string) string {
	label := node.Subject
	if node.Path != nil {
		label += " [" + *node.Path + "]"
	}
	if !node.Valid {
		label += " [invalid]"
	}
	if node.Description != "" {
		label += ": " + node.Description
	}
	if root {
		return label
	}
	if len(prefix) > 1 {
		prefix = prefix[:1] + strings.ReplaceAll(prefix[1:], "|", " ")
	}
	return prefix + "|- " + label
}

func RenderTreeMarkdown(root *TreeNode) string {
	var lines []string
	seen := map[*TreeNode]bool{}
	var visit func(*TreeNode, int)
	visit = func(node *TreeNode, depth int) {
		if node == nil || seen[node] {
			return
		}
		seen[node] = true
		label := "**" + node.Subject + "**"
		if node.Path != nil {
			label += " (`" + *node.Path + "`)"
		}
		if !node.Valid {
			label += " [invalid]"
		}
		lines = append(lines, fmt.Sprintf("%s- %s: %s", strings.Repeat("  ", depth), label, node.Description))
		for _, child := range node.Children {
			visit(child, depth+1)
		}
	}
	visit(root, 0)
	return strings.Join(lines, "\n")
}
