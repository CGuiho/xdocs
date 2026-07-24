---
subject: xdocs-internal-agent
description: Atomic and idempotent embedded skill, instruction, and prompt resource operations.
parent: xdocs-internal
children: []
files:
  agent.go: Resource validation, dual-tool skill mutation, instruction block reconciliation, and prompt reads.
  agent_test.go: Local/global path, atomicity, idempotence, and managed-block regression tests.
documents: {}
tags:
  - agent-resources
  - go
keywords:
  - go:embed
  - dual skill install
  - instructions
flags: []
status: stable
---

Agent resource changes happen only through explicit commands or the documented
initialization setup path.
