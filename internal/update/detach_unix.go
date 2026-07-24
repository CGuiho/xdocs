//go:build !windows

package update

import (
	"os/exec"
	"syscall"
)

func prepareDetached(command *exec.Cmd) {
	command.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}
