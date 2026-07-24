package upgrade

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const upgradeLockMaxAge = 10 * time.Minute

func newTransactionToken() (string, error) {
	random := make([]byte, 16)
	if _, err := rand.Read(random); err != nil {
		return "", fmt.Errorf("generate upgrade transaction token: %w", err)
	}
	return hex.EncodeToString(random), nil
}

func acquireUpgradeLock(path, token string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create upgrade lock directory: %w", err)
	}
	releaseGuard, acquired := tryUpgradeGuard(path)
	if !acquired {
		return fmt.Errorf("another XDocs upgrade is acquiring the transaction lock")
	}
	defer releaseGuard()

	if info, err := os.Stat(path); err == nil {
		if time.Since(info.ModTime()) < upgradeLockMaxAge {
			return fmt.Errorf("another XDocs upgrade is already in progress")
		}
		_ = os.Remove(path)
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("inspect upgrade lock: %w", err)
	}
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		if os.IsExist(err) {
			return fmt.Errorf("another XDocs upgrade is already in progress")
		}
		return fmt.Errorf("create upgrade lock: %w", err)
	}
	if _, err := fmt.Fprintf(file, "%s\n%d\n", token, os.Getpid()); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return fmt.Errorf("write upgrade lock: %w", err)
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(path)
		return fmt.Errorf("close upgrade lock: %w", err)
	}
	return nil
}

func ownsUpgradeLock(path, token string) bool {
	content, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	fields := strings.Fields(string(content))
	return len(fields) > 0 && fields[0] == token
}

func releaseUpgradeLock(path, token string) bool {
	if !ownsUpgradeLock(path, token) {
		return false
	}
	return os.Remove(path) == nil
}
