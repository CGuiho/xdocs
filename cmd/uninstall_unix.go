//go:build !windows

package cmd

import (
	"os"

	"github.com/CGuiho/xdocs/internal/apperror"
)

func removeExecutable(path string) (bool, error) {
	if err := os.Remove(path); err != nil {
		return false, apperror.Wrap(apperror.Mutation, "remove executable", err)
	}
	return false, nil
}
