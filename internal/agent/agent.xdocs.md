---
subject: xdocs-internal-agent
description: Atomic and idempotent embedded skill, instruction, prompt, and plain-startup bootstrap operations.
parent: xdocs-internal
children: []
files:
  agent.go: Resource validation, no-op-aware dual-tool skill mutation, strict instruction preflight and reconciliation, bootstrap coordination, and prompt reads.
  agent_test.go: Local/global path, atomicity, no-op idempotence, malformed-marker preflight, and managed-block regression tests.
documents: {}
tags:
  - agent-resources
  - go
keywords:
  - go:embed
  - dual skill install
  - instructions
  - plain invocation
  - malformed markers
flags: []
status: stable
---

Agent resource changes happen through explicit commands, initialization setup,
or the documented argument-free root bootstrap. Data commands never enter the
bootstrap path.
