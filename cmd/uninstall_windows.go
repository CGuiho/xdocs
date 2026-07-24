//go:build windows

package cmd

import (
	"os/exec"
	"syscall"

	"github.com/CGuiho/xdocs/internal/apperror"
)

func removeExecutable(path string) (bool, error) {
	command := exec.Command("cmd.exe", "/d", "/c", "ping 127.0.0.1 -n 2 >nul & del /f /q \""+path+"\"")
	command.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000, HideWindow: true}
	if err := command.Start(); err != nil {
		return false, apperror.Wrap(apperror.Mutation, "schedule Windows uninstall", err)
	}
	return true, nil
}
