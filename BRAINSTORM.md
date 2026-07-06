# GUIHO XDocs Brainstorming

## What is xdocs

xdocs is a way of describing things. It is a structured documentation system that makes complex projects understandable without requiring someone (human or AI) to read every file and piece things together manually.

The canonical spelling is **xdocs** -- one word, no hyphen, no space, lowercase. When used in a title or heading, capitalize as **XDocs**.

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

xdocs code solves this by placing named `*.xdocs.md` descriptors throughout the project. Each descriptor describes the directory it lives in, acting as a self-contained map of that module. Instead of opening every file to understand a directory, you read its descriptor metadata first.

### What an xdocs Descriptor Describes

An xdocs descriptor for a directory/module covers:

- **Purpose** -- what this directory/module is and why it exists
- **Files** -- the files in this directory and what each one does
- **Documents** -- same-directory plain Markdown companion documents and what each one explains
- **Keywords** -- searchable concepts that help agents match user requests to the right module
- **Subdirectories** -- the child directories and what they contain
- **Parent** -- which directory this is a subdirectory of (what is above in the hierarchy)
- **Hierarchy** -- how this module fits into the broader project structure (what is above and what is below)

The key insight: a directory represents a module. The xdocs descriptor is the structured map of that module.

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

With xdocs, each of these directories would have one named `*.xdocs.md` descriptor that makes the structure self-describing. To understand the whole project, you read the descriptors. To understand a single module, you read its descriptor and then any listed companion Markdown documents that are relevant. You never need to open individual source files just to understand what a module does or how the project is organized.

### The Goal

The primary goal of xdocs code is to **help AI make sense of the codebase and use it effectively**. The xdocs descriptors are the structured context that AI agents need to navigate, understand, and work within a project without guessing or reading everything.

### File Format

xdocs descriptors are Markdown files with YAML frontmatter. A descriptor must be a named file ending in `.xdocs.md`, such as `authentication.xdocs.md`. A file named only `.xdocs.md` is invalid.

Same-directory plain `*.md` files are companion documents. They are listed in the descriptor's `documents` metadata map and should carry frontmatter with their own `keywords`.

### Who Writes xdocs Files

xdocs descriptors are written by AI. When AI writes or modifies code or same-directory Markdown documents, it also writes or updates the corresponding xdocs descriptor. The human does not need to manually maintain these files.

### Configuration

xdocs is configurable through an `xdocs.config.toml` file at the project root. The configuration controls:

- **Descriptor suffix** -- the only supported descriptor suffix is `.xdocs.md`
- **AI behavior** -- how the AI handles documentation updates when the codebase changes. Two modes:
  - **Prompt mode** -- the AI detects that documentation needs to be generated or updated, announces it to the user, and waits for the user to prompt it to proceed
  - **Auto mode** -- the AI automatically updates documentation whenever there is a change or a new addition that requires it, without waiting for user confirmation

### Discovery

xdocs descriptors are discovered by scanning every directory and subdirectory in the project for named files ending in `.xdocs.md`. Companion Markdown documents are discovered from same-directory plain `*.md` files and validated against the descriptor's `documents` map. There is no registry or manifest. The filesystem is the source of truth.

### References Between xdocs Descriptors

xdocs descriptors reference each other. This is fundamental to the system. Each descriptor knows its parent and its children, and through these references, the full project structure is navigable.

### The Tree

The tree is a crucial part of xdocs. It is the hierarchy of the project.

Files in a project are not thrown randomly into directories. Every module serves a purpose. Every piece of code was created to do something, and every piece of code is used in another part of the application. The tree makes this explicit.

The tree represents **hierarchy, not connections**. It shows containment: this is inside this, which is inside this, which is inside this. It is a parent-child structure, not a graph of relationships or dependencies.

The tree is generated from the xdocs descriptors and their references to each other. It provides a complete, navigable view of the project's module hierarchy from root to leaf.

### What xdocs Delivers

xdocs ships three things:

1. **A CLI** -- a cross-platform command-line tool with actions for initializing configuration, scanning the project, generating the tree, and other operations. The CLI must work on macOS, Linux, and Windows.
2. **Agent skills** -- documentation and instructions that teach AI agents how to work with xdocs, when to use the CLI, and how to maintain xdocs descriptors as part of their workflow.
3. **Plugins** -- native integrations for AI coding tools so that xdocs works seamlessly within each tool's ecosystem. Target plugins:
   - Claude Code
   - OpenAI Codex
   - Google Jules
   - OpenCode

### CLI

The xdocs CLI is the primary interface for both humans and AI to interact with xdocs. The AI uses the CLI to perform xdocs operations.

#### `xdocs init`

Initializes xdocs in a project. This command:

- Creates a root `XDOCS.md` file for the project
- Creates an `xdocs.config.toml` configuration file with defaults
- Updates the project's `AGENTS.md` file to include instructions for AI agents to use xdocs
- Installs the xdocs agent skills into the repository (or prompts the user to choose where to place them, since there are default locations supported by many tools)

#### `xdocs scan`

Scans every directory and subdirectory in the project for named `*.xdocs.md` descriptors and same-directory plain Markdown companion documents. Reports what descriptors exist, where they are, and which directories are missing documentation.

#### `xdocs generate`

Generates documentation. This is a versatile command that works at different scopes:

- **Directory/module scope** -- when run on a directory, it scans descriptors, keywords, files, companion documents, and subdirectories, then generates a comprehensive document describing the whole module.
- **Project scope** -- when run at the project level, it scans the entire project and generates a single `.md` file with the complete description of everything: all modules, all files, the full hierarchy, and how it all fits together.

The generate command produces a complete, self-contained document for whatever scope it targets.

#### `xdocs prompt`

Outputs ready-made prompts for AI agents. Each prompt is tailored to a specific xdocs task. The CLI assembles the prompt, but it is the AI that executes it. Prompts are selected via the `--name` flag (not subcommands) to avoid ambiguity where prompt names look like verbs. Both `--name=value` and `--name value` forms are supported.

Prompts include (not exhaustive):

- **Write documentation** -- instructs the AI on how to scan a directory and write xdocs documentation for it
- **Update documentation** -- instructs the AI to update existing xdocs descriptors after code or document changes
- **Update AGENTS.md** -- instructs the AI to update the AGENTS.md file with xdocs instructions
- **Generate full docs** -- instructs the AI to generate comprehensive documentation for a specific domain or the whole project

There will be many prompts, one for each individual task. The prompt command is the collection of all of them.

#### `xdocs merge`

Merges xdocs descriptors from a specific domain or directory into a single file. Given a domain, it takes all the xdocs descriptors within it and produces one consolidated document with everything merged together.

#### `xdocs tree`

Generates a tree view of the project hierarchy. Similar to merge, but instead of merging file contents, it produces a structural tree with references between modules. It does not list individual files -- it shows the module hierarchy and how modules relate to each other in the parent-child structure.

#### `xdocs list`

Lists the files and companion Markdown documents that exist in a given scope with an explanation of what each entry is for. This is useful as a quick inventory, similar to what you would put in an `lnms.txt` or a file manifest.

#### More commands

There will be more CLI commands as the design evolves. All commands accept flags to modify their behavior.

### Key Design Considerations

These are open questions to be resolved as the design evolves:

- What is the schema or structure within an xdocs Markdown file? (headings, sections, metadata)
- How does the tree get rendered? (CLI output, generated Markdown, or both)
- What does the `xdocs.config.toml` schema look like in detail?
- What does the agent skill contain and how does it instruct the AI to behave?
- What are the default skill installation locations to support across tools?
- What is the full catalog of prompts the prompt command should ship?
- How do plugins integrate with each AI tool's extension model?
