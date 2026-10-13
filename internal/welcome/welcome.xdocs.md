---
subject: xdocs-internal-welcome
description: Beautiful hello window rendering for the xdocs CLI with earth-tone palette and borderless layout.
parent: xdocs-internal
children: []
files:
  welcome.go: ANSI earth-tone rendering (7F5539, A68A64, EDE0D4, 656D4A, 414833), XDOCS block logo, left-aligned tagline and author line, column-0 Platform/Version/Author details with aligned values, and one blank line before and after the hello window.
  welcome_test.go: Exact left-aligned plain layout and coloured-output alignment regression tests, including absence of the organization line and one-blank-line framing.
documents: {}
tags:
  - welcome
  - cli
keywords:
  - hello window
  - earth palette
  - ANSI
  - borderless
flags: []
status: stable
---

Hello window is borderless and deterministic, matching RunX and Genius siblings while using the five-tone earth palette.
