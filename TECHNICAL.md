---
name: xdocs-technical-notes
purpose: Preserve concise technical notes that complement the canonical architecture.
description: Supplemental implementation notes for the native Go XDocs CLI.
created: 2026-06-01
owner: xdocs-package
flags: []
tags:
  - technical-notes
  - implementation
  - go
keywords:
  - xdocs internals
  - Go CLI
  - Git version
---

# Technical Notes

## Active generation

The active CLI generation is native Go:

- one Cobra command tree;
- strict YAML decoded into Go structs;
- embedded agent resources;
- background update checks isolated from foreground work;
- Git-only `xdocs/vX.Y.Z` version authority;
- eight portable binaries and exactly eleven release assets.

The TypeScript tree is migration reference only. Do not add behavior there
unless a separate task explicitly removes or archives the legacy sources.

## Reproducible local checks

```powershell
gofmt -w .
go mod tidy
go test ./...
go vet ./...
go run ./devops/build-binaries.go `
  --version 0.0.0-dev `
  --commit (git rev-parse HEAD) `
  --build-date 2026-01-01T00:00:00Z
```

The release builder must finish with exactly eight executables,
`guiho-s-xdocs.zip`, `guiho-i-xdocs.md`, and `checksums.txt`.
