#!/usr/bin/env bash
set -Eeuo pipefail

# === Defaults (overridable via env vars or CLI flags) ===
REPO="${XDOCS_REPO:-CGuiho/xdocs}"
VERSION="${XDOCS_VERSION:-latest}"
INSTALL_DIR="${XDOCS_INSTALL_DIR:-$HOME/.local/bin}"
ARCH_OVERRIDE=""
VARIANT_OVERRIDE=""

# === Usage ===
usage() {
  cat <<EOF
Install GUIHO XDocs — native CLI binary from GitHub Releases.

Usage: install.sh [flags]

Flags:
  -v, --version VERSION   Version to install (default: latest).
                          Examples: latest, alpha, 0.4.4, @guiho/xdocs@0.4.4
  --arch ARCH             Force architecture: x64 | arm64 (default: auto-detect)
  --variant VARIANT       Force variant for x64: baseline | modern (default: baseline)
  --install-dir DIR       Install directory (default: \$HOME/.local/bin)
  -h, --help              Show this help

Environment variables:
  XDOCS_VERSION           Same as --version
  XDOCS_REPO              GitHub repo (default: CGuiho/xdocs)
  XDOCS_INSTALL_DIR       Install directory
EOF
  exit 0
}

# === Parse CLI flags ===
while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--version)
      VERSION="$2"; shift 2 ;;
    --version=*)
      VERSION="${1#*=}"; shift ;;
    --arch)
      ARCH_OVERRIDE="$2"; shift 2 ;;
    --arch=*)
      ARCH_OVERRIDE="${1#*=}"; shift ;;
    --variant)
      VARIANT_OVERRIDE="$2"; shift 2 ;;
    --variant=*)
      VARIANT_OVERRIDE="${1#*=}"; shift ;;
    --install-dir)
      INSTALL_DIR="$2"; shift 2 ;;
    --install-dir=*)
      INSTALL_DIR="${1#*=}"; shift ;;
    -h|--help)
      usage ;;
    *)
      echo "Unknown flag: $1" >&2
      echo "Run with --help for usage." >&2
      exit 1 ;;
  esac
done

# === Detect OS ===
detect_os() {
  case "$(uname -s)" in
    Linux)  echo "linux" ;;
    Darwin) echo "macos" ;;
    *)
      echo "error: unsupported OS: $(uname -s)" >&2
      exit 1 ;;
  esac
}

# === Detect architecture ===
detect_arch() {
  if [[ -n "$ARCH_OVERRIDE" ]]; then
    case "$ARCH_OVERRIDE" in
      x64|arm64) echo "$ARCH_OVERRIDE" ;;
      *)
        echo "error: invalid --arch '$ARCH_OVERRIDE'. Must be x64 or arm64." >&2
        exit 1 ;;
    esac
  fi

  case "$(uname -m)" in
    x86_64|amd64) echo "x64" ;;
    arm64|aarch64) echo "arm64" ;;
    *)
      echo "error: unsupported architecture: $(uname -m)" >&2
      exit 1 ;;
  esac
}

# === Build asset candidates (baseline-first for x64) ===
build_candidates() {
  local os="$1"
  local arch="$2"

  if [[ "$arch" == "x64" ]]; then
    local variant="${VARIANT_OVERRIDE:-baseline}"
    case "$variant" in
      baseline)
        echo "xdocs-${os}-x64-baseline xdocs-${os}-x64 xdocs-${os}-x64-modern" ;;
      modern)
        echo "xdocs-${os}-x64-modern xdocs-${os}-x64 xdocs-${os}-x64-baseline" ;;
      *)
        echo "xdocs-${os}-x64-${variant} xdocs-${os}-x64-baseline xdocs-${os}-x64 xdocs-${os}-x64-modern" ;;
    esac
  else
    echo "xdocs-${os}-${arch}"
  fi
}

# === Build download URL ===
build_url() {
  local asset="$1"

  if [[ "$VERSION" == "latest" ]]; then
    echo "https://github.com/${REPO}/releases/latest/download/${asset}"
    return
  fi

  # Convert version to release tag
  local tag
  case "$VERSION" in
    @guiho/xdocs@*) tag="$VERSION" ;;
    @*)              tag="$VERSION" ;;
    *)               tag="@guiho/xdocs@${VERSION}" ;;
  esac

  local encoded_tag
  encoded_tag="$(printf '%s' "$tag" | sed 's/@/%40/g; s#/#%2F#g')"
  echo "https://github.com/${REPO}/releases/download/${encoded_tag}/${asset}"
}

# === Main ===
require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: required command not found: $1" >&2
    exit 1
  }
}

require_command curl

OS="$(detect_os)"
ARCH="$(detect_arch)"

echo "xdocs: ${VERSION}  os=${OS}  arch=${ARCH}${VARIANT_OVERRIDE:+ variant=${VARIANT_OVERRIDE}}"

CANDIDATES="$(build_candidates "$OS" "$ARCH")"
TMP="$(mktemp -d)"
trap 'rm -rf -- "$TMP"' EXIT

for ASSET in $CANDIDATES; do
  URL="$(build_url "$ASSET")"
  echo "  Trying ${URL}"
  if curl -fsSL "$URL" -o "$TMP/xdocs" 2>/dev/null; then
    # Verify it's a real binary, not an HTML error page or text script
    local magic
    magic="$(head -c 4 "$TMP/xdocs" 2>/dev/null || true)"
    case "$magic" in
      $'\x7fELF') ;;  # ELF binary — OK
      $'\xcf\xfa\xed\xfe'|$'\xce\xfa\xed\xfe'|$'\xca\xfe\xba\xbe') ;;  # Mach-O — OK
      'MZ'*) ;;         # Windows PE — OK
      '#!'*)
        echo "error: downloaded file is a script, not a native binary" >&2
        echo "This may be an old release. Try --version to pin a specific version." >&2
        continue ;;
      '<!DO'*|'<html'*)
        echo "error: downloaded file appears to be an HTML page (${ASSET} not found)" >&2
        continue ;;
      *)
        echo "warning: unrecognized file format, proceeding anyway" >&2 ;;
    esac

    mkdir -p "$INSTALL_DIR"
    install -m 0755 "$TMP/xdocs" "$INSTALL_DIR/xdocs"
    echo "Installed xdocs to ${INSTALL_DIR}/xdocs"

    # Post-install checks
    check_path
    check_shadowing

    echo "Run: xdocs --version"
    exit 0
  fi
  echo "  not available, trying next..."
done

echo "error: no compatible xdocs binary found" >&2
echo "Check available assets at: https://github.com/${REPO}/releases" >&2
exit 1

# === Post-install: warn if install dir is not in PATH ===
check_path() {
  case ":$PATH:" in
    *:"$INSTALL_DIR":*) return 0 ;;
  esac

  echo ""
  echo "⚠  ${INSTALL_DIR} is not in your PATH."
  echo "   Add it to your shell profile to use xdocs globally:"
  echo ""
  case "$(basename "$SHELL" 2>/dev/null || echo sh)" in
    zsh)  echo "   echo 'export PATH=\"${INSTALL_DIR}:\$PATH\"' >> ~/.zshrc" ;;
    bash) echo "   echo 'export PATH=\"${INSTALL_DIR}:\$PATH\"' >> ~/.bashrc" ;;
    fish) echo "   fish_add_path ${INSTALL_DIR}" ;;
    *)    echo "   export PATH=\"${INSTALL_DIR}:\$PATH\"" ;;
  esac
  echo ""
}

# === Post-install: warn if another xdocs shadows this one ===
check_shadowing() {
  local shadow
  shadow="$(command -v xdocs 2>/dev/null || true)"

  if [[ -z "$shadow" ]]; then
    return 0
  fi

  if [[ "$shadow" == "$INSTALL_DIR/xdocs" ]]; then
    return 0
  fi

  echo ""
  echo "⚠  Another xdocs was found earlier in your PATH:"
  echo "   ${shadow}"
  echo ""
  echo "   This will shadow the newly installed binary."
  echo "   If this is an old npm/pip installation, remove it first:"
  echo "   npm uninstall -g @guiho/xdocs"
  echo ""
}
