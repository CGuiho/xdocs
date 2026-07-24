package cmd

import (
	"io/fs"
	"testing/fstest"
)

func agentTestResources() fs.FS {
	return fstest.MapFS{
		"skills/guiho-s-xdocs/SKILL.md": {Data: []byte("---\nname: guiho-s-xdocs\ndescription: XDocs skill.\nmetadata:\n  version: 0.8.0\n---\n# Skill\n")},
		"prompts/write.md":              {Data: []byte("---\nname: write\ndescription: Write docs.\n---\nWrite.")},
		"prompts/update.md":             {Data: []byte("---\nname: update\ndescription: Update docs.\n---\nUpdate.")},
		"prompts/agents.md":             {Data: []byte("---\nname: agents\ndescription: Update agents.\n---\nAgents.")},
		"prompts/generate.md":           {Data: []byte("---\nname: generate\ndescription: Generate docs.\n---\nGenerate.")},
	}
}
