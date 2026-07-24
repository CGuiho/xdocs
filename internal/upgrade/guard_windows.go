//go:build windows

package upgrade

import (
	"os"
	"syscall"
	"unsafe"
)

var (
	kernel32UpgradeLockProc   = syscall.NewLazyDLL("kernel32.dll").NewProc("LockFileEx")
	kernel32UpgradeUnlockProc = syscall.NewLazyDLL("kernel32.dll").NewProc("UnlockFileEx")
)

func tryUpgradeGuard(path string) (func(), bool) {
	const (
		lockfileFailImmediately = 0x00000001
		lockfileExclusiveLock   = 0x00000002
	)
	file, err := os.OpenFile(path+".guard", os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, false
	}
	overlapped := &syscall.Overlapped{}
	result, _, _ := kernel32UpgradeLockProc.Call(
		file.Fd(),
		lockfileExclusiveLock|lockfileFailImmediately,
		0,
		0xffffffff,
		0xffffffff,
		uintptr(unsafe.Pointer(overlapped)),
	)
	if result == 0 {
		_ = file.Close()
		return nil, false
	}
	return func() {
		_, _, _ = kernel32UpgradeUnlockProc.Call(
			file.Fd(),
			0,
			0xffffffff,
			0xffffffff,
			uintptr(unsafe.Pointer(overlapped)),
		)
		_ = file.Close()
	}, true
}
