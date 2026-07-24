//go:build windows

package upgrade

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	"github.com/CGuiho/xdocs/internal/apperror"
)

func replaceExecutable(plan Plan, expectedVersion string) (bool, error) {
	helper := filepath.Join(filepath.Dir(plan.ExecutablePath), ".xdocs-upgrade-helper-"+plan.TransactionID+".exe")
	journal, err := CompletionPath()
	if err != nil {
		return false, apperror.Wrap(apperror.Mutation, "resolve Windows upgrade journal", err)
	}
	if err := os.Remove(journal); err != nil && !os.IsNotExist(err) {
		return false, apperror.Wrap(apperror.Mutation, "clear stale Windows upgrade journal", err)
	}
	current, err := os.ReadFile(plan.ExecutablePath)
	if err != nil {
		return false, apperror.Wrap(apperror.Mutation, "read replacement helper source", err)
	}
	if err := os.WriteFile(helper, current, 0o755); err != nil {
		return false, apperror.Wrap(apperror.Mutation, "write replacement helper", err)
	}
	command := exec.Command(helper, "__replace-windows",
		"--pid", strconv.Itoa(os.Getpid()),
		"--current", plan.ExecutablePath,
		"--candidate", plan.TemporaryPath,
		"--backup", plan.BackupPath,
		"--expected-version", expectedVersion,
		"--helper", helper,
		"--journal", journal,
		"--lock", plan.LockPath,
		"--lock-token", plan.LockToken,
	)
	command.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: 0x00000200 | 0x00000008,
		HideWindow:    true,
	}
	if err := command.Start(); err != nil {
		return false, apperror.Wrap(apperror.Mutation, "start Windows replacement helper", err)
	}
	if err := command.Process.Release(); err != nil {
		return false, apperror.Wrap(apperror.Mutation, "release Windows replacement helper", err)
	}
	return true, nil
}

func RunWindowsReplacement(args []string) (resultErr error) {
	if len(args)%2 != 0 {
		return apperror.New(apperror.Usage, "invalid Windows replacement arguments")
	}
	values := map[string]string{}
	for index := 0; index+1 < len(args); index += 2 {
		values[args[index]] = args[index+1]
	}
	pid, err := strconv.Atoi(values["--pid"])
	if err != nil || pid <= 0 {
		return apperror.New(apperror.Usage, "invalid Windows replacement pid")
	}
	current := values["--current"]
	candidate := values["--candidate"]
	backup := values["--backup"]
	expected := values["--expected-version"]
	journal := values["--journal"]
	lock := values["--lock"]
	lockToken := values["--lock-token"]
	helper := values["--helper"]
	if current == "" || candidate == "" || backup == "" || expected == "" || journal == "" ||
		lock == "" || lockToken == "" {
		return apperror.New(apperror.Usage, "incomplete Windows replacement arguments")
	}
	defer releaseUpgradeLock(lock, lockToken)
	if helper != "" {
		defer scheduleHelperCleanup(helper)
	}
	completion := Completion{
		TargetVersion: expected,
		Outcome:       "failed",
		Verification:  "not run",
		Rollback:      "not required",
		Recovery:      recoveryCommand(expected),
	}
	defer func() {
		if resultErr != nil {
			completion.FailureMessage = resultErr.Error()
		}
		if journalErr := WriteCompletion(journal, completion); journalErr != nil && resultErr == nil {
			resultErr = apperror.Wrap(apperror.Mutation, "write Windows upgrade completion", journalErr)
		}
	}()
	if !ownsUpgradeLock(lock, lockToken) {
		return apperror.New(apperror.Mutation, "Windows replacement no longer owns the upgrade lock")
	}
	if err := waitForProcessExit(uint32(pid), 30_000); err != nil {
		return err
	}
	_ = os.Remove(backup)
	if err := os.Rename(current, backup); err != nil {
		return apperror.Wrap(apperror.Mutation, "stage Windows executable", err)
	}
	rollback := func(removeCurrent bool) error {
		if removeCurrent {
			if err := os.Remove(current); err != nil && !os.IsNotExist(err) {
				return fmt.Errorf("remove failed replacement: %w", err)
			}
		}
		if err := os.Rename(backup, current); err != nil {
			return fmt.Errorf("restore previous executable: %w", err)
		}
		return nil
	}
	if err := os.Rename(candidate, current); err != nil {
		if rollbackErr := rollback(false); rollbackErr != nil {
			completion.Rollback = "failed: " + rollbackErr.Error()
			return apperror.New(apperror.Mutation, fmt.Sprintf("replace Windows executable: %v; rollback failed: %v", err, rollbackErr))
		}
		completion.Rollback = "succeeded"
		return apperror.Wrap(apperror.Mutation, "replace Windows executable", err)
	}
	output, err := exec.Command(current, "--version").CombinedOutput()
	completion.Verification = strings.TrimSpace(string(output))
	if err != nil || completion.Verification != "xdocs v"+expected {
		if rollbackErr := rollback(true); rollbackErr != nil {
			completion.Rollback = "failed: " + rollbackErr.Error()
			return apperror.New(apperror.Mutation, fmt.Sprintf(
				"Windows replacement verification failed: %s; rollback failed: %v",
				completion.Verification,
				rollbackErr,
			))
		}
		completion.Rollback = "succeeded"
		return apperror.New(apperror.Mutation, fmt.Sprintf("Windows replacement verification failed: %s", completion.Verification))
	}
	if err := refreshResources(current); err != nil {
		if rollbackErr := rollback(true); rollbackErr != nil {
			completion.Rollback = "failed: " + rollbackErr.Error()
			return apperror.New(apperror.Mutation, fmt.Sprintf("refresh Windows resources: %v; rollback failed: %v", err, rollbackErr))
		}
		completion.Rollback = "succeeded"
		if refreshErr := refreshResources(current); refreshErr != nil {
			return apperror.New(apperror.Mutation, fmt.Sprintf(
				"refresh Windows resources: %v; rollback resources also failed: %v",
				err,
				refreshErr,
			))
		}
		return err
	}
	if err := os.Remove(backup); err != nil && !os.IsNotExist(err) {
		return apperror.Wrap(apperror.Mutation, "remove Windows upgrade backup", err)
	}
	completion.Outcome = "succeeded"
	completion.Rollback = "not required"
	completion.Recovery = ""
	return nil
}

func scheduleHelperCleanup(helper string) {
	cleanup := exec.Command("cmd.exe", "/d", "/c", "ping 127.0.0.1 -n 2 >nul & del /f /q \""+helper+"\"")
	cleanup.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000, HideWindow: true}
	_ = cleanup.Start()
}

var (
	kernel32Proc            = syscall.NewLazyDLL("kernel32.dll")
	openProcessProc         = kernel32Proc.NewProc("OpenProcess")
	waitForSingleObjectProc = kernel32Proc.NewProc("WaitForSingleObject")
	closeHandleProc         = kernel32Proc.NewProc("CloseHandle")
)

func waitForProcessExit(pid uint32, timeoutMilliseconds uint32) error {
	const (
		synchronizeAccess = 0x00100000
		waitObject0       = 0x00000000
		waitTimeout       = 0x00000102
		waitFailed        = 0xFFFFFFFF
	)
	handle, _, callErr := openProcessProc.Call(synchronizeAccess, 0, uintptr(pid))
	if handle == 0 {
		if errno, ok := callErr.(syscall.Errno); ok && errno == syscall.Errno(87) {
			return nil
		}
		return apperror.Wrap(apperror.Mutation, "open running XDocs process", callErr)
	}
	defer closeHandleProc.Call(handle)
	result, _, waitErr := waitForSingleObjectProc.Call(handle, uintptr(timeoutMilliseconds))
	switch result {
	case waitObject0:
		return nil
	case waitTimeout:
		return apperror.New(apperror.Mutation, "timed out waiting for the running XDocs process to exit")
	case waitFailed:
		return apperror.Wrap(apperror.Mutation, "wait for running XDocs process", waitErr)
	default:
		return apperror.New(apperror.Mutation, fmt.Sprintf("unexpected Windows process wait result: 0x%x", result))
	}
}
