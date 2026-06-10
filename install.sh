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
  echo "Install Bun and run @guiho/xdocs from source, or download a compatible release asset manually." >&2
  exit 1
fi

TAG="${XDOCS_VERSION:-latest}"
ASSET="xdocs-$OS-$ARCH"

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

mkdir -p "$INSTALL_DIR"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

echo "Downloading $URL"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" -o "$TMP_FILE"
elif command -v wget >/dev/null 2>&1; then
  wget -q "$URL" -O "$TMP_FILE"
else
  echo "error: curl or wget is required" >&2
  exit 1
fi

chmod +x "$TMP_FILE"
mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"

echo "Installed xdocs to $INSTALL_DIR/$BINARY_NAME"
echo "Run: xdocs --version"
