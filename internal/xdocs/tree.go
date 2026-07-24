package xdocs

import (
	"fmt"
	"sort"
	"strings"
)

func BuildTree(files []File) *TreeNode {
	nodes := map[string]*TreeNode{}
	for _, file := range files {
		if file.Metadata == nil {
			continue
		}
		path := file.RelativePath
		nodes[file.Metadata.Subject] = &TreeNode{
			Subject:     file.Metadata.Subject,
			Description: file.Metadata.Description,
			Path:        &path,
			Children:    []*TreeNode{},
		}
	}
	var root *TreeNode
	for _, file := range files {
		if file.Metadata == nil {
			continue
		}
		node := nodes[file.Metadata.Subject]
		if file.Metadata.Parent == nil {
			if root == nil {
				root = node
			}
			continue
		}
		if parent := nodes[*file.Metadata.Parent]; parent != nil && node != nil {
			addChild(parent, node)
		}
	}
	for _, file := range files {
		if file.Metadata == nil {
			continue
		}
		parent := nodes[file.Metadata.Subject]
		for _, childName := range file.Metadata.Children {
			if child := nodes[childName]; child != nil {
				addChild(parent, child)
			}
		}
	}
	for _, node := range nodes {
		sort.Slice(node.Children, func(i, j int) bool { return node.Children[i].Subject < node.Children[j].Subject })
	}
	if root != nil {
		return root
	}
	root = &TreeNode{Subject: "(root)", Description: "No root xdocs descriptor found.", Children: []*TreeNode{}}
	children := map[string]bool{}
	for _, file := range files {
		if file.Metadata == nil {
			continue
		}
		for _, child := range file.Metadata.Children {
			children[child] = true
		}
		if file.Metadata.Parent != nil {
			children[file.Metadata.Subject] = true
		}
	}
	for subject, node := range nodes {
		if !children[subject] {
			root.Children = append(root.Children, node)
		}
	}
	sort.Slice(root.Children, func(i, j int) bool { return root.Children[i].Subject < root.Children[j].Subject })
	return root
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
		for _, child := range file.Metadata.Children {
			if seenChildren[child] {
				result.Errors = append(result.Errors, fmt.Sprintf(`Duplicate child: "%s" lists "%s" more than once in %s`, file.Metadata.Subject, child, file.RelativePath))
				continue
			}
			seenChildren[child] = true
			childFile := subjects[child]
			if childFile == nil {
				result.Errors = append(result.Errors, fmt.Sprintf(`Missing child: "%s" references non-existent child "%s" in %s`, file.Metadata.Subject, child, file.RelativePath))
				continue
			}
			if childFile.Metadata.Parent == nil || *childFile.Metadata.Parent != file.Metadata.Subject {
				result.Errors = append(result.Errors, fmt.Sprintf(
					`Parent-child mismatch: "%s" lists child "%s", whose parent does not point back.`,
					file.Metadata.Subject,
					child,
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
		if prefix == "" {
			lines = append(lines, node.Subject)
		} else {
			lines = append(lines, prefix+"|- "+node.Subject)
		}
		for _, child := range node.Children {
			visit(child, prefix+"|  ")
		}
	}
	visit(root, "")
	return strings.Join(lines, "\n")
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
		lines = append(lines, fmt.Sprintf("%s- **%s**: %s", strings.Repeat("  ", depth), node.Subject, node.Description))
		for _, child := range node.Children {
			visit(child, depth+1)
		}
	}
	visit(root, 0)
	return strings.Join(lines, "\n")
}
