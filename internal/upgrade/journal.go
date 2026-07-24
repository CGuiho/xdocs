package upgrade

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const completionFilename = "upgrade-result.json"

type Completion struct {
	SchemaVersion  int    `json:"schemaVersion"`
	TargetVersion  string `json:"targetVersion"`
	Outcome        string `json:"outcome"`
	Verification   string `json:"verification"`
	Rollback       string `json:"rollback"`
	Recovery       string `json:"recovery"`
	CompletedAt    string `json:"completedAt"`
	FailureMessage string `json:"failureMessage,omitempty"`
}

func CompletionPath() (string, error) {
	if override := strings.TrimSpace(os.Getenv("XDOCS_CACHE_DIR")); override != "" {
		return filepath.Join(override, completionFilename), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve home directory: %w", err)
	}
	return filepath.Join(home, ".guiho", "xdocs", completionFilename), nil
}

func WriteCompletion(path string, completion Completion) error {
	completion.SchemaVersion = 1
	completion.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	content, err := json.MarshalIndent(completion, "", "  ")
	if err != nil {
		return fmt.Errorf("encode upgrade completion: %w", err)
	}
	content = append(content, '\n')
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create upgrade completion directory: %w", err)
	}
	temporary, err := os.CreateTemp(filepath.Dir(path), ".upgrade-result-*.tmp")
	if err != nil {
		return fmt.Errorf("create upgrade completion temporary file: %w", err)
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if _, err := temporary.Write(content); err != nil {
		_ = temporary.Close()
		return fmt.Errorf("write upgrade completion: %w", err)
	}
	if err := temporary.Sync(); err != nil {
		_ = temporary.Close()
		return fmt.Errorf("sync upgrade completion: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close upgrade completion: %w", err)
	}
	_ = os.Remove(path)
	if err := os.Rename(temporaryPath, path); err != nil {
		return fmt.Errorf("commit upgrade completion: %w", err)
	}
	return nil
}

func ReadAndClearCompletion() (Completion, bool, error) {
	path, err := CompletionPath()
	if err != nil {
		return Completion{}, false, err
	}
	content, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return Completion{}, false, nil
	}
	if err != nil {
		return Completion{}, false, fmt.Errorf("read upgrade completion: %w", err)
	}
	if err := os.Remove(path); err != nil {
		return Completion{}, false, fmt.Errorf("clear upgrade completion: %w", err)
	}
	var completion Completion
	decoder := json.NewDecoder(strings.NewReader(string(content)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&completion); err != nil {
		return Completion{}, false, fmt.Errorf("decode upgrade completion: %w", err)
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		if err == nil {
			return Completion{}, false, fmt.Errorf("decode upgrade completion: multiple JSON documents")
		}
		return Completion{}, false, fmt.Errorf("decode trailing upgrade completion data: %w", err)
	}
	if completion.SchemaVersion != 1 || completion.TargetVersion == "" ||
		(completion.Outcome != "succeeded" && completion.Outcome != "failed") ||
		completion.CompletedAt == "" {
		return Completion{}, false, fmt.Errorf("decode upgrade completion: invalid completion record")
	}
	return completion, true, nil
}

func FormatCompletion(completion Completion) string {
	if completion.Outcome == "succeeded" {
		return fmt.Sprintf(
			"XDocs upgrade to %s completed successfully (%s).\n",
			completion.TargetVersion,
			completion.Verification,
		)
	}
	message := fmt.Sprintf(
		"XDocs upgrade to %s failed: %s. Rollback: %s.",
		completion.TargetVersion,
		completion.FailureMessage,
		completion.Rollback,
	)
	if completion.Recovery != "" {
		message += " Recovery: " + completion.Recovery
	}
	return message + "\n"
}
