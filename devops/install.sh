#!/usr/bin/env sh
set -eu

OWNER="CGuiho"
REPOSITORY="xdocs"
VERSION="${XDOCS_VERSION:-latest}"
INSTALL_DIR="${XDOCS_INSTALL_DIR:-${HOME}/.local/bin}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version) VERSION="${2:?--version requires a value}"; shift 2 ;;
    --install-dir) INSTALL_DIR="${2:?--install-dir requires a value}"; shift 2 ;;
    *) printf 'error: unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

require() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'error: required command not found: %s\n' "$1" >&2
    exit 1
  }
}

require curl
require unzip

OS_NAME="$(uname -s)"
MACHINE="$(uname -m)"
case "${OS_NAME}/${MACHINE}" in
  Linux/x86_64|Linux/amd64) ASSET="xdocs-linux-amd64" ;;
  Linux/aarch64|Linux/arm64) ASSET="xdocs-linux-arm64" ;;
  Linux/armv7l) ASSET="xdocs-linux-armv7" ;;
  Linux/armv6l) ASSET="xdocs-linux-armv6" ;;
  Darwin/x86_64) ASSET="xdocs-darwin-amd64" ;;
  Darwin/arm64|Darwin/aarch64) ASSET="xdocs-darwin-arm64" ;;
  *) printf 'error: unsupported platform: %s/%s\n' "$OS_NAME" "$MACHINE" >&2; exit 1 ;;
esac

if [ "$VERSION" = "latest" ]; then
  printf '%s\n' 'Resolving latest stable XDocs release...'
  TAG="$(curl -fsSL "https://api.github.com/repos/${OWNER}/${REPOSITORY}/releases/latest" |
    sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
  [ -n "$TAG" ] || { printf 'error: could not resolve latest release tag\n' >&2; exit 1; }
  case "$TAG" in
    xdocs/v*) VERSION="${TAG#xdocs/v}" ;;
    *) printf 'error: latest release does not use the XDocs Go tag format: %s\n' "$TAG" >&2; exit 1 ;;
  esac
else
  VERSION="${VERSION#v}"
  TAG="xdocs/v${VERSION}"
fi

TAG_URL="$(printf '%s' "$TAG" | sed 's|/|%2F|g')"
BASE_URL="https://github.com/${OWNER}/${REPOSITORY}/releases/download/${TAG_URL}"
SKILL_ASSET="guiho-s-xdocs.zip"
INSTRUCTION_ASSET="guiho-i-xdocs.md"
TEMP_DIR="$(mktemp -d)"
DESTINATION="${INSTALL_DIR}/xdocs"
CANDIDATE="${INSTALL_DIR}/.xdocs-new-$$"
BINARY_BACKUP="${INSTALL_DIR}/.xdocs-backup-$$"
AGENT_TARGET="${HOME}/.agents/skills/guiho-s-xdocs"
CLAUDE_TARGET="${HOME}/.claude/skills/guiho-s-xdocs"
AGENT_NEW="${AGENT_TARGET}.new-$$"
CLAUDE_NEW="${CLAUDE_TARGET}.new-$$"
AGENT_BACKUP="${AGENT_TARGET}.backup-$$"
CLAUDE_BACKUP="${CLAUDE_TARGET}.backup-$$"
BINARY_SWAPPED=0
AGENT_SWAPPED=0
CLAUDE_SWAPPED=0
AGENT_HAD_OLD=0
CLAUDE_HAD_OLD=0
SUCCESS=0

cleanup() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$SUCCESS" -ne 1 ]; then
    if [ -e "$CLAUDE_BACKUP" ]; then
      rm -rf "$CLAUDE_TARGET"
      mv "$CLAUDE_BACKUP" "$CLAUDE_TARGET"
    elif [ "$CLAUDE_SWAPPED" -eq 1 ]; then
      rm -rf "$CLAUDE_TARGET"
    fi
    if [ -e "$AGENT_BACKUP" ]; then
      rm -rf "$AGENT_TARGET"
      mv "$AGENT_BACKUP" "$AGENT_TARGET"
    elif [ "$AGENT_SWAPPED" -eq 1 ]; then
      rm -rf "$AGENT_TARGET"
    fi
    if [ -f "$BINARY_BACKUP" ]; then
      rm -f "$DESTINATION"
      mv "$BINARY_BACKUP" "$DESTINATION"
    elif [ "$BINARY_SWAPPED" -eq 1 ]; then
      rm -f "$DESTINATION"
    fi
  fi
  rm -rf "$TEMP_DIR" "$AGENT_NEW" "$CLAUDE_NEW"
  rm -f "$CANDIDATE"
  if [ "$SUCCESS" -eq 1 ]; then
    rm -rf "$AGENT_BACKUP" "$CLAUDE_BACKUP"
    rm -f "$BINARY_BACKUP"
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' HUP INT TERM

printf '%s\n' 'Initiating GUIHO CLI Upgrade / Installation Sequence...'
printf 'Target Version: %s\n' "$TAG"
printf 'Architecture:   %s\n' "$MACHINE"
printf 'Target Asset:   %s\n' "$ASSET"
printf 'Source URL:     %s/%s\n' "$BASE_URL" "$ASSET"

for item in "$ASSET" "checksums.txt" "$SKILL_ASSET" "$INSTRUCTION_ASSET"; do
  curl -fL --progress-bar -o "${TEMP_DIR}/${item}" "${BASE_URL}/${item}"
done

verify_asset() {
  name="$1"
  expected="$(awk -v asset="$name" '$2 == asset { print $1 }' "${TEMP_DIR}/checksums.txt")"
  [ -n "$expected" ] || { printf 'error: checksum entry missing for %s\n' "$name" >&2; exit 1; }
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "${TEMP_DIR}/${name}" | awk '{print $1}')"
  else
    require shasum
    actual="$(shasum -a 256 "${TEMP_DIR}/${name}" | awk '{print $1}')"
  fi
  [ "$expected" = "$actual" ] || { printf 'error: checksum verification failed for %s\n' "$name" >&2; exit 1; }
}
verify_asset "$ASSET"
verify_asset "$SKILL_ASSET"
verify_asset "$INSTRUCTION_ASSET"
printf '%s\n' '[OK] SHA-256 verification complete for binary and agent assets.'

chmod 0755 "${TEMP_DIR}/${ASSET}"
PREFLIGHT="$(XDOCS_DISABLE_UPDATE_CHECK=1 "${TEMP_DIR}/${ASSET}" --version)"
[ "$PREFLIGHT" = "xdocs v${VERSION}" ] || {
  printf 'error: candidate version mismatch: %s\n' "$PREFLIGHT" >&2
  exit 1
}

mkdir -p "$INSTALL_DIR" "$(dirname "$AGENT_TARGET")" "$(dirname "$CLAUDE_TARGET")"
unzip -q "${TEMP_DIR}/${SKILL_ASSET}" -d "${TEMP_DIR}/skill"
SOURCE="${TEMP_DIR}/skill/guiho-s-xdocs"
[ -f "${SOURCE}/SKILL.md" ] || { printf 'error: invalid skill archive\n' >&2; exit 1; }
SKILL_VERSION_COUNT="$(awk -F: -v expected="$VERSION" '
  /^[[:space:]]*version:/ {
    value=$2
    gsub(/[[:space:]"]/, "", value)
    if (value == expected) count++
  }
  END { print count + 0 }
' "${SOURCE}/SKILL.md")"
[ "$SKILL_VERSION_COUNT" -eq 2 ] || {
  printf 'error: skill metadata does not match xdocs v%s\n' "$VERSION" >&2
  exit 1
}
rm -rf "$AGENT_NEW" "$CLAUDE_NEW" "$AGENT_BACKUP" "$CLAUDE_BACKUP"
cp -R "$SOURCE" "$AGENT_NEW"
cp -R "$SOURCE" "$CLAUDE_NEW"
install -m 0755 "${TEMP_DIR}/${ASSET}" "$CANDIDATE"

if [ -f "$DESTINATION" ]; then
  rm -f "$BINARY_BACKUP"
  mv "$DESTINATION" "$BINARY_BACKUP"
fi
mv "$CANDIDATE" "$DESTINATION"
BINARY_SWAPPED=1

if [ -e "$AGENT_TARGET" ]; then
  AGENT_HAD_OLD=1
  mv "$AGENT_TARGET" "$AGENT_BACKUP"
fi
mv "$AGENT_NEW" "$AGENT_TARGET"
AGENT_SWAPPED=1

if [ -e "$CLAUDE_TARGET" ]; then
  CLAUDE_HAD_OLD=1
  mv "$CLAUDE_TARGET" "$CLAUDE_BACKUP"
fi
mv "$CLAUDE_NEW" "$CLAUDE_TARGET"
CLAUDE_SWAPPED=1

XDOCS_DISABLE_UPDATE_CHECK=1 "$DESTINATION" agent instruction update
FINAL_VERSION="$(XDOCS_DISABLE_UPDATE_CHECK=1 "$DESTINATION" --version)"
[ "$FINAL_VERSION" = "xdocs v${VERSION}" ] || {
  printf 'error: final version mismatch: %s\n' "$FINAL_VERSION" >&2
  exit 1
}

if [ "${XDOCS_SKIP_PATH_UPDATE:-0}" != "1" ]; then
  case ":${PATH}:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
      PROFILE="${HOME}/.profile"
      printf '\nexport PATH="%s:$PATH"\n' "$INSTALL_DIR" >> "$PROFILE"
      printf '[OK] Added installation directory to %s\n' "$PROFILE"
      ;;
  esac
fi

SUCCESS=1
printf '[OK] Installed binary: %s\n' "$DESTINATION"
printf '[OK] Installed skill: %s/SKILL.md\n' "$AGENT_TARGET"
printf '[OK] Installed skill: %s/SKILL.md\n' "$CLAUDE_TARGET"
printf '[OK] Installed and verified XDocs %s at %s\n' "$VERSION" "$DESTINATION"
