//go:build !windows

package upgrade

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/CGuiho/xdocs/internal/apperror"
)

func replaceExecutable(plan Plan, expectedVersion string) (bool, error) {
	_ = os.Remove(plan.BackupPath)
	if err := os.Rename(plan.ExecutablePath, plan.BackupPath); err != nil {
		return false, apperror.Wrap(apperror.Mutation, "stage current executable", err)
	}
	if err := os.Rename(plan.TemporaryPath, plan.ExecutablePath); err != nil {
		_ = os.Rename(plan.BackupPath, plan.ExecutablePath)
		return false, apperror.Wrap(apperror.Mutation, "replace executable", err)
	}
	output, err := exec.Command(plan.ExecutablePath, "--version").CombinedOutput()
	if err != nil || strings.TrimSpace(string(output)) != "xdocs v"+expectedVersion {
		failed := plan.TemporaryPath + ".failed"
		_ = os.Rename(plan.ExecutablePath, failed)
		_ = os.Rename(plan.BackupPath, plan.ExecutablePath)
		return false, apperror.New(apperror.Mutation, fmt.Sprintf("replacement verification failed: %s", strings.TrimSpace(string(output))))
	}
	if err := refreshResources(plan.ExecutablePath); err != nil {
		_ = os.Remove(plan.ExecutablePath)
		_ = os.Rename(plan.BackupPath, plan.ExecutablePath)
		_ = refreshResources(plan.ExecutablePath)
		return false, err
	}
	_ = os.Remove(plan.BackupPath)
	return false, nil
}

func RunWindowsReplacement([]string) error {
	return apperror.New(apperror.Usage, "Windows replacement helper is unavailable on this platform")
}
