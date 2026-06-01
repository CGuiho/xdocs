# GUIHO XDocs Brainstorming

## What is xdocs

xdocs is a way of describing things. It is a structured documentation system that makes complex projects understandable without requiring someone (human or AI) to read every file and piece things together manually.

The canonical spelling is **xdocs** -- one word, no hyphen, no space, lowercase.

## Vision

xdocs will be used across multiple areas:

- **Code** -- describing codebases, modules, directories, and their relationships (the current focus)
- **Work** -- describing work processes, workflows, and organizational structures
- **Startup** -- describing business domains, product areas, and company knowledge

There may be other areas in the future. The underlying principle is the same across all of them: provide a structured, self-describing layer on top of complex systems so that both humans and AI can navigate and understand them without needing to absorb everything at once.

## xdocs Code

### The Problem

When working with AI on a codebase, most of the structural knowledge lives in the head of the person who built it. The AI has no understanding of _why_ files exist, _what purpose_ a directory serves, or _how_ modules relate to each other. To figure this out, the AI must read every file and try to piece things together, which is slow, expensive, and error-prone.

This is especially true in modular applications. A modular application has domains (e.g., authentication, user, supply, product), and each domain directory contains many files. If you ask "why are those files there?" or "what is the purpose of this module?", the answer is not written down anywhere. It is implicit, scattered across the code itself.

### The Solution

xdocs code solves this by placing xdocs files throughout the project. Each xdocs file describes the directory it lives in, acting as a self-contained map of that module. Instead of opening every file to understand a directory, you read its xdocs file.

### What an xdocs File Describes

An xdocs file for a directory/module covers:

- **Purpose** -- what this directory/module is and why it exists
- **Files** -- the files in this directory and what each one does
- **Subdirectories** -- the child directories and what they contain
- **Parent** -- which directory this is a subdirectory of (what is above in the hierarchy)
- **Hierarchy** -- how this module fits into the broader project structure (what is above and what is below)

The key insight: a directory represents a module. The xdocs file is the documentation of that module.

### How It Works

xdocs code targets modular applications. A typical modular application structure:

```
project/
  domain-a/
    authentication/
      ...files...
    user/
      ...files...
  domain-b/
    supply/
      ...files...
    product/
      ...files...
```

With xdocs, each of these directories would have an xdocs file that makes the structure self-describing. To understand the whole project, you read the xdocs files. To understand a single module, you read its xdocs file. You never need to open individual source files just to understand what a module does or how the project is organized.

### The Goal

The primary goal of xdocs code is to **help AI make sense of the codebase and use it effectively**. The xdocs files are the structured context that AI agents need to navigate, understand, and work within a project without guessing or reading everything.

### Key Design Considerations

These are open questions and decisions to be made as the design evolves:

- What is the file format of an xdocs file? (Markdown, TOML, JSON, YAML, or a custom format)
- What is the naming convention? (e.g., `XDOCS.md`, `xdocs.toml`, `.xdocs`)
- How are xdocs files generated? (manually written, CLI-assisted, AI-generated, or a combination)
- How are xdocs files kept in sync when the codebase changes?
- What is the schema or structure within an xdocs file?
- How does an AI agent discover and traverse xdocs files across a project?
- Should xdocs files reference each other (e.g., links between parent and child)?
