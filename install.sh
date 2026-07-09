#!/usr/bin/env sh
set -eu

REPO="CGuiho/xdocs"
INSTALL_DIR="${XDOCS_INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="xdocs"

detect_os() {
  case "$(uname -s)" in
    Linux*) echo "linux" ;;
    Darwin*) echo "macos" ;;
    *) echo "unsupported" ;;
  esac
}

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "x64" ;;
    arm64|aarch64) echo "arm64" ;;
    *) echo "unsupported" ;;
  esac
}

OS="$(detect_os)"
ARCH="$(detect_arch)"

if [ "$OS" = "unsupported" ] || [ "$ARCH" = "unsupported" ]; then
  echo "error: unsupported platform $(uname -s)/$(uname -m)" >&2
  echo "Download a compatible release asset manually from https://github.com/$REPO/releases" >&2
  exit 1
fi

TAG="${XDOCS_VERSION:-latest}"

# x64 has three variants: baseline → default → modern (try in that order)
if [ "$ARCH" = "x64" ]; then
  CANDIDATES="xdocs-$OS-x64-baseline xdocs-$OS-x64 xdocs-$OS-x64-modern"
else
  CANDIDATES="xdocs-$OS-$ARCH"
fi

download() {
  ASSET="$1"
  if [ "$TAG" = "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/$ASSET"
  else
    case "$TAG" in
      @guiho/xdocs@*) RELEASE_TAG="$TAG" ;;
      *) RELEASE_TAG="@guiho/xdocs@$TAG" ;;
    esac
    ENCODED_TAG="$(printf '%s' "$RELEASE_TAG" | sed 's/@/%40/g; s#/#%2F#g')"
    URL="https://github.com/$REPO/releases/download/$ENCODED_TAG/$ASSET"
  fi

  echo "Trying $URL"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$URL" -o "$TMP_FILE" 2>/dev/null && return 0
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$URL" -O "$TMP_FILE" 2>/dev/null && return 0
  else
    echo "error: curl or wget is required" >&2
    exit 1
  fi
  return 1
}

mkdir -p "$INSTALL_DIR"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

for ASSET in $CANDIDATES; do
  if download "$ASSET"; then
    chmod +x "$TMP_FILE"
    mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
    echo "Installed xdocs to $INSTALL_DIR/$BINARY_NAME"
    echo "Run: xdocs --version"
    exit 0
  fi
done

echo "error: no compatible xdocs binary found for $OS/$ARCH" >&2
exit 1
