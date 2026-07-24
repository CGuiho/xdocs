package upgrade

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/CGuiho/xdocs/internal/apperror"
	"github.com/CGuiho/xdocs/internal/update"
)

type Plan struct {
	CurrentVersion string `json:"currentVersion"`
	TargetVersion  string `json:"targetVersion"`
	BuildTarget    string `json:"buildTarget"`
	AssetName      string `json:"assetName"`
	DownloadURL    string `json:"downloadUrl"`
	ExecutablePath string `json:"executablePath"`
	TemporaryPath  string `json:"temporaryPath"`
	BackupPath     string `json:"backupPath"`
	ReleaseURL     string `json:"releaseUrl"`
	LockPath       string `json:"-"`
	LockToken      string `json:"-"`
	TransactionID  string `json:"transactionId"`
}

type Result struct {
	SchemaVersion int    `json:"schemaVersion"`
	Command       string `json:"command"`
	Outcome       string `json:"outcome"`
	Plan          Plan   `json:"plan"`
	Scheduled     bool   `json:"scheduled"`
	Recovery      string `json:"recovery"`
	Failure       string `json:"failure,omitempty"`
}

type Service struct {
	Releases    *update.Client
	HTTP        *http.Client
	Executable  func() (string, error)
	Replace     func(Plan, string) (bool, error)
	RuntimeGOOS string
}

func New() *Service {
	return &Service{
		Releases:    update.NewClient(),
		HTTP:        &http.Client{Timeout: 2 * time.Minute},
		Executable:  os.Executable,
		Replace:     replaceExecutable,
		RuntimeGOOS: runtime.GOOS,
	}
}

func Target(buildTarget string) string {
	if buildTarget != "" && buildTarget != "development" {
		candidate := strings.TrimSuffix(buildTarget, ".exe")
		switch candidate {
		case "xdocs-linux-amd64", "xdocs-linux-arm64", "xdocs-linux-armv7", "xdocs-linux-armv6",
			"xdocs-darwin-amd64", "xdocs-darwin-arm64",
			"xdocs-windows-amd64", "xdocs-windows-arm64":
			return candidate
		default:
			return ""
		}
	}
	switch runtime.GOOS + "/" + runtime.GOARCH {
	case "linux/amd64":
		return "xdocs-linux-amd64"
	case "linux/arm64":
		return "xdocs-linux-arm64"
	case "linux/arm":
		if os.Getenv("GOARM") == "6" {
			return "xdocs-linux-armv6"
		}
		return "xdocs-linux-armv7"
	case "darwin/amd64":
		return "xdocs-darwin-amd64"
	case "darwin/arm64":
		return "xdocs-darwin-arm64"
	case "windows/amd64":
		return "xdocs-windows-amd64"
	case "windows/arm64":
		return "xdocs-windows-arm64"
	default:
		return ""
	}
}

func AssetName(target string) string {
	if strings.HasPrefix(target, "xdocs-windows-") {
		return target + ".exe"
	}
	return target
}

func (s *Service) Upgrade(currentVersion, buildTarget, requestedVersion string, dryRun bool, progress io.Writer) (Result, error) {
	fallbackVersion := strings.TrimPrefix(currentVersion, "v")
	result := Result{
		SchemaVersion: 1,
		Command:       "xdocs upgrade",
		Outcome:       "failed",
		Plan: Plan{
			CurrentVersion: currentVersion,
			TargetVersion:  fallbackVersion,
		},
		Recovery: recoveryCommand(fallbackVersion),
	}
	target := Target(buildTarget)
	if target == "" {
		return failed(result, apperror.New(apperror.Mutation, fmt.Sprintf("unsupported upgrade target: %s/%s", runtime.GOOS, runtime.GOARCH)))
	}
	assetName := AssetName(target)
	release, asset, err := s.Releases.Resolve(requestedVersion, assetName)
	if err != nil {
		return failed(result, err)
	}
	result.Plan.TargetVersion = release.Version
	result.Recovery = recoveryCommand(release.Version)
	executable, err := s.Executable()
	if err != nil {
		return failed(result, apperror.Wrap(apperror.Mutation, "resolve executable", err))
	}
	executable, _ = filepath.EvalSymlinks(executable)
	transaction, err := newTransactionToken()
	if err != nil {
		return failed(result, apperror.Wrap(apperror.Mutation, "create upgrade transaction", err))
	}
	plan := Plan{
		CurrentVersion: currentVersion, TargetVersion: release.Version,
		BuildTarget: target, AssetName: assetName, DownloadURL: asset.DownloadURL,
		ExecutablePath: executable, TemporaryPath: executable + ".xdocs-new-" + transaction,
		BackupPath: executable + ".xdocs-backup-" + transaction, ReleaseURL: release.ReleaseURL,
		LockPath: executable + ".xdocs-upgrade.lock", LockToken: transaction,
		TransactionID: transaction,
	}
	result = Result{
		SchemaVersion: 1, Command: "xdocs upgrade", Outcome: "dry-run",
		Plan: plan, Recovery: recoveryCommand(release.Version),
	}
	if update.Compare(release.Version, currentVersion) < 0 {
		return failed(result, apperror.New(apperror.Mutation, fmt.Sprintf("refusing to downgrade xdocs from %s to %s", currentVersion, release.Version)))
	}
	if update.Compare(release.Version, currentVersion) == 0 && requestedVersion == "" {
		result.Outcome = "up-to-date"
		return result, nil
	}
	if dryRun {
		return result, nil
	}
	if err := acquireUpgradeLock(plan.LockPath, plan.LockToken); err != nil {
		return failed(result, apperror.Wrap(apperror.Mutation, "acquire upgrade lock", err))
	}
	lockTransferred := false
	defer func() {
		if !lockTransferred {
			releaseUpgradeLock(plan.LockPath, plan.LockToken)
			_ = os.Remove(plan.TemporaryPath)
		}
	}()

	if progress != nil {
		fmt.Fprintf(progress, "Downloading %s\n", asset.DownloadURL)
	}
	expected, err := s.fetchChecksum(asset.DownloadURL, assetName)
	if err != nil {
		return failed(result, err)
	}
	actual, err := s.download(asset.DownloadURL, plan.TemporaryPath, progress)
	if err != nil {
		return failed(result, err)
	}
	if !strings.EqualFold(expected, actual) {
		_ = os.Remove(plan.TemporaryPath)
		return failed(result, apperror.New(apperror.Mutation, fmt.Sprintf("checksum verification failed for %s", assetName)))
	}
	if s.RuntimeGOOS != "windows" {
		if err := os.Chmod(plan.TemporaryPath, 0o755); err != nil {
			return failed(result, apperror.Wrap(apperror.Mutation, "make candidate executable", err))
		}
	}
	scheduled, err := s.Replace(plan, release.Version)
	if err != nil {
		return failed(result, err)
	}
	result.Outcome = "upgraded"
	if scheduled {
		result.Outcome = "scheduled"
		lockTransferred = true
	}
	result.Scheduled = scheduled
	return result, nil
}

func failed(result Result, err error) (Result, error) {
	result.Outcome = "failed"
	result.Failure = err.Error()
	return result, err
}

func refreshResources(executable string) error {
	commands := [][]string{
		{"agent", "instruction", "update"},
		{"agent", "skill", "update"},
	}
	for _, args := range commands {
		command := exec.Command(executable, args...)
		command.Env = append(os.Environ(), "XDOCS_DISABLE_UPDATE_CHECK=1")
		output, err := command.CombinedOutput()
		if err != nil {
			return apperror.New(apperror.Mutation, fmt.Sprintf(
				"refresh installed resources with `%s %s`: %v: %s",
				executable, strings.Join(args, " "), err, strings.TrimSpace(string(output)),
			))
		}
	}
	return nil
}

func (s *Service) fetchChecksum(assetURL, assetName string) (string, error) {
	index := strings.LastIndex(assetURL, "/")
	if index < 0 {
		return "", apperror.New(apperror.Remote, "invalid asset download URL")
	}
	response, err := s.HTTP.Get(assetURL[:index+1] + "checksums.txt")
	if err != nil {
		return "", apperror.Wrap(apperror.Remote, "download checksums", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return "", apperror.New(apperror.Remote, fmt.Sprintf("checksums download returned %s", response.Status))
	}
	scanner := bufio.NewScanner(io.LimitReader(response.Body, 1<<20))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) == 2 && fields[1] == assetName {
			if _, err := hex.DecodeString(fields[0]); err != nil || len(fields[0]) != 64 {
				return "", apperror.New(apperror.Remote, "invalid checksum manifest entry")
			}
			return fields[0], nil
		}
	}
	if err := scanner.Err(); err != nil {
		return "", apperror.Wrap(apperror.Remote, "read checksum manifest", err)
	}
	return "", apperror.New(apperror.Remote, fmt.Sprintf("checksum entry missing for %s", assetName))
}

func (s *Service) download(url, destination string, progress io.Writer) (string, error) {
	request, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return "", apperror.Wrap(apperror.Remote, "create download request", err)
	}
	response, err := s.HTTP.Do(request)
	if err != nil {
		return "", apperror.Wrap(apperror.Remote, "download release asset", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return "", apperror.New(apperror.Remote, fmt.Sprintf("asset download returned %s", response.Status))
	}
	file, err := os.Create(destination)
	if err != nil {
		return "", apperror.Wrap(apperror.Mutation, "create upgrade candidate", err)
	}
	defer file.Close()
	hash := sha256.New()
	reader := io.TeeReader(io.LimitReader(response.Body, 256<<20), hash)
	buffer := make([]byte, 64*1024)
	var received int64
	for {
		count, readErr := reader.Read(buffer)
		if count > 0 {
			if _, err := file.Write(buffer[:count]); err != nil {
				return "", apperror.Wrap(apperror.Mutation, "write upgrade candidate", err)
			}
			received += int64(count)
			if progress != nil {
				if response.ContentLength > 0 {
					fmt.Fprintf(progress, "\rDownloading: %d%%", received*100/response.ContentLength)
				} else {
					fmt.Fprintf(progress, "\rDownloading: %d bytes", received)
				}
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return "", apperror.Wrap(apperror.Remote, "read release asset", readErr)
		}
	}
	if progress != nil {
		fmt.Fprintln(progress)
	}
	if response.ContentLength >= 0 && received != response.ContentLength {
		return "", apperror.New(apperror.Remote, "release asset download was truncated")
	}
	if err := file.Sync(); err != nil {
		return "", apperror.Wrap(apperror.Mutation, "sync upgrade candidate", err)
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func recoveryCommand(version string) string {
	if runtime.GOOS == "windows" {
		return fmt.Sprintf(
			`$script = irm https://raw.githubusercontent.com/CGuiho/xdocs/xdocs%%2Fv%s/devops/install.ps1; & ([scriptblock]::Create($script)) -Version '%s'`,
			version,
			version,
		)
	}
	return fmt.Sprintf(`curl -fsSL https://raw.githubusercontent.com/CGuiho/xdocs/xdocs%%2Fv%s/devops/install.sh | sh -s -- --version %s`, version, version)
}
