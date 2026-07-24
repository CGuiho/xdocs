---
subject: xdocs-internal-release
description: Compatibility-first native target and exact eleven-asset release contract.
parent: xdocs-internal
children: []
files:
  matrix.go: Eight target definitions, CPU baselines, supporting asset names, and exact-set validation.
  matrix_test.go: Target count, OS distribution, tuning, naming, and eleven-asset regression tests.
documents: {}
tags:
  - release
  - portability
keywords:
  - AMD64 v1
  - ARMv6
  - ARMv7
  - eleven assets
flags: []
status: stable
---

The matrix favors broad desktop, VPS, Apple Silicon, Windows ARM, and Raspberry
Pi compatibility without speculative AMD64 performance variants.
