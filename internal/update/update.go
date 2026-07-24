package update

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/CGuiho/xdocs/internal/apperror"
)

const (
	cacheMaxAge   = 24 * time.Hour
	leaseMaxAge   = 30 * time.Second
	workerTimeout = 15 * time.Second
)

const defaultRepositoryAPI = "https://api.github.com/repos/CGuiho/xdocs/releases"

type Cache struct {
	NewVersionAvailable bool   `json:"newVersionAvailable"`
	LatestVersion       string `json:"latestVersion"`
	UpgradeCommand      string `json:"upgradeCommand,omitempty"`
	LastCheck           string `json:"lastCheck"`
}

type Asset struct {
	Name        string `json:"name"`
	DownloadURL string `json:"browser_download_url"`
	Size        int64  `json:"size"`
}

type githubRelease struct {
	Tag         string  `json:"tag_name"`
	URL         string  `json:"html_url"`
	Prerelease  bool    `json:"prerelease"`
	Draft       bool    `json:"draft"`
	PublishedAt *string `json:"published_at"`
	Assets      []Asset `json:"assets"`
}

type Release struct {
	Version         string  `json:"version"`
	Tag             string  `json:"tag"`
	Channel         string  `json:"channel"`
	Prerelease      bool    `json:"prerelease"`
	PublishedAt     *string `json:"publishedAt"`
	ReleaseURL      string  `json:"releaseUrl"`
	Assets          []Asset `json:"assets"`
	CompatibleAsset *Asset  `json:"compatibleAsset"`
}

type Pagination struct {
	Page            int     `json:"page"`
	Size            int     `json:"size"`
	TotalItems      int     `json:"totalItems"`
	TotalPages      int     `json:"totalPages"`
	HasPreviousPage bool    `json:"hasPreviousPage"`
	HasNextPage     bool    `json:"hasNextPage"`
	PreviousCommand *string `json:"previousCommand"`
	NextCommand     *string `json:"nextCommand"`
}

type ListEnvelope struct {
	SchemaVersion       int        `json:"schemaVersion"`
	Command             string     `json:"command"`
	CurrentVersion      string     `json:"currentVersion"`
	LatestStableVersion *string    `json:"latestStableVersion"`
	Pagination          Pagination `json:"pagination"`
	Releases            []Release  `json:"releases"`
}

type Client struct {
	HTTP *http.Client
	API  string
}

func NewClient() *Client {
	return &Client{
		HTTP: &http.Client{Timeout: 10 * time.Second},
		API:  defaultRepositoryAPI,
	}
}

func CachePath() (string, error) {
	if override := os.Getenv("XDOCS_CACHE_DIR"); override != "" {
		return filepath.Join(override, "cache.json"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".guiho", "xdocs", "cache.json"), nil
}

func ReadNotice(currentVersion string) string {
	path, err := CachePath()
	if err != nil {
		return ""
	}
	content, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var cache Cache
	decoder := json.NewDecoder(strings.NewReader(string(content)))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&cache) != nil {
		return ""
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return ""
	}
	if !cache.NewVersionAvailable ||
		!Newer(cache.LatestVersion, currentVersion) {
		return ""
	}
	checkedAt, err := time.Parse(time.RFC3339, cache.LastCheck)
	if err != nil || time.Since(checkedAt) > cacheMaxAge || checkedAt.After(time.Now().Add(time.Minute)) {
		return ""
	}
	command := cache.UpgradeCommand
	if command == "" {
		command = "xdocs upgrade"
	}
	return fmt.Sprintf("A newer xdocs version is available: %s (current %s). Run `%s`.\n", cache.LatestVersion, currentVersion, command)
}

func SpawnWorker(executable, currentVersion string) error {
	if updateDisabled() || os.Getenv("XDOCS_UPDATE_WORKER") == "1" {
		return nil
	}
	cache, err := CachePath()
	if err != nil {
		return nil
	}
	lease := cache + ".lease"
	token, acquired := acquireLease(lease)
	if !acquired {
		return nil
	}
	command := exec.Command(executable, "__update-worker",
		"--current-version", currentVersion,
		"--lease", lease,
		"--lease-token", token,
	)
	command.Env = append(os.Environ(), "XDOCS_UPDATE_WORKER=1")
	command.Stdin = nil
	command.Stdout = nil
	command.Stderr = nil
	prepareDetached(command)
	if err := command.Start(); err != nil {
		releaseLease(lease, token)
		return err
	}
	return command.Process.Release()
}

func RunWorker(currentVersion, lease, token string) error {
	defer releaseLease(lease, token)
	ctx, cancel := context.WithTimeout(context.Background(), workerTimeout)
	defer cancel()
	client := NewClient()
	releases, err := client.fetch(ctx)
	if err != nil {
		return err
	}
	latest := ""
	for _, release := range releases {
		if !release.Prerelease {
			latest = release.Version
			break
		}
	}
	cache := Cache{
		NewVersionAvailable: latest != "" && Newer(latest, currentVersion),
		LatestVersion:       latest,
		UpgradeCommand:      "xdocs upgrade",
		LastCheck:           time.Now().UTC().Format(time.RFC3339),
	}
	path, err := CachePath()
	if err != nil {
		return err
	}
	return atomicJSON(path, cache)
}

func (c *Client) List(currentVersion, target string, page, size int) (ListEnvelope, error) {
	if page < 1 {
		return ListEnvelope{}, apperror.New(apperror.Usage, "--page must be a positive integer")
	}
	if size < 1 || size > 100 {
		return ListEnvelope{}, apperror.New(apperror.Usage, "--size must be between 1 and 100")
	}
	releases, err := c.fetch(context.Background())
	if err != nil {
		return ListEnvelope{}, err
	}
	for index := range releases {
		for assetIndex := range releases[index].Assets {
			if releases[index].Assets[assetIndex].Name == target {
				asset := releases[index].Assets[assetIndex]
				releases[index].CompatibleAsset = &asset
				break
			}
		}
	}
	var latestStable *string
	for _, release := range releases {
		if !release.Prerelease {
			value := release.Version
			latestStable = &value
			break
		}
	}
	totalPages := 0
	if len(releases) > 0 {
		totalPages = (len(releases) + size - 1) / size
	}
	start := (page - 1) * size
	end := start + size
	paged := []Release{}
	if start < len(releases) {
		if end > len(releases) {
			end = len(releases)
		}
		paged = releases[start:end]
	}
	var previous, next *string
	if page > 1 {
		value := fmt.Sprintf("xdocs upgrade list --page %d --size %d", page-1, size)
		previous = &value
	}
	if page < totalPages {
		value := fmt.Sprintf("xdocs upgrade list --page %d --size %d", page+1, size)
		next = &value
	}
	return ListEnvelope{
		SchemaVersion: 2, Command: "xdocs upgrade list", CurrentVersion: currentVersion,
		LatestStableVersion: latestStable,
		Pagination: Pagination{
			Page: page, Size: size, TotalItems: len(releases), TotalPages: totalPages,
			HasPreviousPage: page > 1, HasNextPage: page < totalPages,
			PreviousCommand: previous, NextCommand: next,
		},
		Releases: paged,
	}, nil
}

func (c *Client) Resolve(version, target string) (Release, Asset, error) {
	releases, err := c.fetch(context.Background())
	if err != nil {
		return Release{}, Asset{}, err
	}
	for _, release := range releases {
		if version != "" && release.Version != strings.TrimPrefix(version, "v") {
			continue
		}
		if version == "" && release.Prerelease {
			continue
		}
		for _, asset := range release.Assets {
			if asset.Name == target {
				return release, asset, nil
			}
		}
		if version != "" {
			return Release{}, Asset{}, apperror.New(apperror.Remote, fmt.Sprintf("release %s does not contain %s", version, target))
		}
	}
	return Release{}, Asset{}, apperror.New(apperror.Remote, "no compatible xdocs release found")
}

func (c *Client) Check(currentVersion string) (Cache, error) {
	releases, err := c.fetch(context.Background())
	if err != nil {
		return Cache{}, err
	}
	var latest string
	for _, release := range releases {
		if !release.Prerelease {
			latest = release.Version
			break
		}
	}
	return Cache{
		NewVersionAvailable: latest != "" && Newer(latest, currentVersion),
		LatestVersion:       latest, UpgradeCommand: "xdocs upgrade",
		LastCheck: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (c *Client) fetch(ctx context.Context) ([]Release, error) {
	api := c.API
	if api == "" {
		api = defaultRepositoryAPI
	}
	var raw []githubRelease
	for page := 1; page <= 100; page++ {
		separator := "?"
		if strings.Contains(api, "?") {
			separator = "&"
		}
		url := fmt.Sprintf("%s%sper_page=100&page=%d", api, separator, page)
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, apperror.Wrap(apperror.Remote, "create GitHub release request", err)
		}
		request.Header.Set("Accept", "application/vnd.github+json")
		request.Header.Set("User-Agent", "xdocs-go")
		response, err := c.HTTP.Do(request)
		if err != nil {
			return nil, apperror.Wrap(apperror.Remote, "fetch GitHub releases", err)
		}
		if response.StatusCode != http.StatusOK {
			response.Body.Close()
			return nil, apperror.New(apperror.Remote, fmt.Sprintf("GitHub releases returned %s", response.Status))
		}
		var batch []githubRelease
		decoder := json.NewDecoder(io.LimitReader(response.Body, 8<<20))
		decodeErr := decoder.Decode(&batch)
		closeErr := response.Body.Close()
		if decodeErr != nil {
			return nil, apperror.Wrap(apperror.Remote, "decode GitHub releases", decodeErr)
		}
		if closeErr != nil {
			return nil, apperror.Wrap(apperror.Remote, "close GitHub release response", closeErr)
		}
		raw = append(raw, batch...)
		if len(batch) < 100 {
			break
		}
		if page == 100 {
			return nil, apperror.New(apperror.Remote, "GitHub release pagination exceeded 100 pages")
		}
	}
	var releases []Release
	seen := map[string]bool{}
	for _, item := range raw {
		version, ok := VersionFromTag(item.Tag)
		if !ok || item.Draft || seen[item.Tag] {
			continue
		}
		seen[item.Tag] = true
		channel := "stable"
		if strings.Contains(version, "-") {
			channel = strings.SplitN(strings.SplitN(version, "-", 2)[1], ".", 2)[0]
		}
		releases = append(releases, Release{
			Version: version, Tag: item.Tag, Channel: channel,
			Prerelease:  item.Prerelease || strings.Contains(version, "-"),
			PublishedAt: item.PublishedAt, ReleaseURL: item.URL,
			Assets: append([]Asset(nil), item.Assets...),
		})
	}
	sort.Slice(releases, func(i, j int) bool { return Compare(releases[i].Version, releases[j].Version) > 0 })
	return releases, nil
}

func VersionFromTag(tag string) (string, bool) {
	const prefix = "xdocs/v"
	if !strings.HasPrefix(tag, prefix) {
		return "", false
	}
	version := strings.TrimPrefix(tag, prefix)
	if _, ok := parseVersion(version); !ok {
		return "", false
	}
	return version, true
}

func Newer(left, right string) bool {
	return Compare(left, right) > 0
}

func Compare(left, right string) int {
	l, lok := parseVersion(strings.TrimPrefix(left, "v"))
	r, rok := parseVersion(strings.TrimPrefix(right, "v"))
	if !lok || !rok {
		return strings.Compare(left, right)
	}
	for i := 0; i < 3; i++ {
		if l.numbers[i] > r.numbers[i] {
			return 1
		}
		if l.numbers[i] < r.numbers[i] {
			return -1
		}
	}
	if l.pre == r.pre {
		return 0
	}
	if l.pre == "" {
		return 1
	}
	if r.pre == "" {
		return -1
	}
	return comparePrerelease(l.pre, r.pre)
}

type semanticVersion struct {
	numbers [3]int
	pre     string
}

func parseVersion(value string) (semanticVersion, bool) {
	if strings.Count(value, "+") > 1 {
		return semanticVersion{}, false
	}
	if buildIndex := strings.IndexByte(value, '+'); buildIndex >= 0 {
		build := value[buildIndex+1:]
		if !validSemverIdentifiers(build, false) {
			return semanticVersion{}, false
		}
		value = value[:buildIndex]
	}
	parts := strings.SplitN(value, "-", 2)
	core := strings.Split(parts[0], ".")
	if len(core) != 3 {
		return semanticVersion{}, false
	}
	var version semanticVersion
	for i := range core {
		number, err := strconv.Atoi(core[i])
		if err != nil || number < 0 || (len(core[i]) > 1 && core[i][0] == '0') {
			return semanticVersion{}, false
		}
		version.numbers[i] = number
	}
	if len(parts) == 2 {
		if !validSemverIdentifiers(parts[1], true) {
			return semanticVersion{}, false
		}
		version.pre = parts[1]
	}
	return version, true
}

func validSemverIdentifiers(value string, rejectNumericLeadingZero bool) bool {
	if value == "" {
		return false
	}
	for _, identifier := range strings.Split(value, ".") {
		if identifier == "" {
			return false
		}
		numeric := true
		for _, character := range identifier {
			if !((character >= '0' && character <= '9') ||
				(character >= 'A' && character <= 'Z') ||
				(character >= 'a' && character <= 'z') ||
				character == '-') {
				return false
			}
			if character < '0' || character > '9' {
				numeric = false
			}
		}
		if rejectNumericLeadingZero && numeric && len(identifier) > 1 && identifier[0] == '0' {
			return false
		}
	}
	return true
}

func comparePrerelease(left, right string) int {
	l, r := strings.Split(left, "."), strings.Split(right, ".")
	length := len(l)
	if len(r) > length {
		length = len(r)
	}
	for i := 0; i < length; i++ {
		if i >= len(l) {
			return -1
		}
		if i >= len(r) {
			return 1
		}
		ln, lerr := strconv.Atoi(l[i])
		rn, rerr := strconv.Atoi(r[i])
		switch {
		case lerr == nil && rerr == nil && ln != rn:
			if ln > rn {
				return 1
			}
			return -1
		case lerr == nil && rerr != nil:
			return -1
		case lerr != nil && rerr == nil:
			return 1
		case l[i] != r[i]:
			return strings.Compare(l[i], r[i])
		}
	}
	return 0
}

func acquireLease(path string) (string, bool) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", false
	}
	releaseGuard, acquired := tryLeaseGuard(path)
	if !acquired {
		return "", false
	}
	defer releaseGuard()

	if info, err := os.Stat(path); err == nil {
		if time.Since(info.ModTime()) < leaseMaxAge {
			return "", false
		}
		_ = os.Remove(path)
	}
	random := make([]byte, 16)
	if _, err := rand.Read(random); err != nil {
		return "", false
	}
	token := hex.EncodeToString(random)
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return "", false
	}
	if _, err := fmt.Fprintf(file, "%s\n%d\n", token, os.Getpid()); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return "", false
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(path)
		return "", false
	}
	return token, true
}

func releaseLease(path, token string) bool {
	content, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	fields := strings.Fields(string(content))
	if len(fields) < 1 || fields[0] != token {
		return false
	}
	return os.Remove(path) == nil
}

func atomicJSON(path string, value any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	temp, err := os.CreateTemp(filepath.Dir(path), ".xdocs-cache-*")
	if err != nil {
		return err
	}
	name := temp.Name()
	defer os.Remove(name)
	encoder := json.NewEncoder(temp)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(value); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Sync(); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	return os.Rename(name, path)
}

func updateDisabled() bool {
	for _, key := range []string{"XDOCS_DISABLE_UPDATE_CHECK", "XDOCS_NO_UPDATE_CHECK"} {
		value := strings.ToLower(os.Getenv(key))
		if value == "1" || value == "true" {
			return true
		}
	}
	return false
}
