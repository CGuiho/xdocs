#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${XDOCS_REPO:-CGuiho/xdocs}"
VERSION="${XDOCS_VERSION:-latest}"
INSTALL_DIR="${XDOCS_INSTALL_DIR:-$HOME/.local/bin}"
ARCH_OVERRIDE=""
VARIANT_OVERRIDE=""
OS=""
ARCH=""
CANDIDATES=()
TMP=""

cleanup() {
  if [[ -n "$TMP" ]]; then
    rm -rf -- "$TMP"
  fi
}

trap cleanup EXIT

usage() {
  cat <<EOF
Install GUIHO XDocs as a native CLI binary from GitHub Releases.

Usage: install.sh [flags]

Flags:
  -v, --version VERSION   Version to install (default: latest).
                          Examples: latest, 0.4.7, @guiho/xdocs@0.4.7
  --arch ARCH             Force architecture: x64 | arm64 (default: auto-detect)
  --variant VARIANT       Force x64 variant: baseline | default | modern (default: baseline)
  --install-dir DIR       Install directory (default: \$HOME/.local/bin)
  -h, --help              Show this help

Environment variables:
  XDOCS_VERSION           Same as --version
  XDOCS_REPO              GitHub repo (default: CGuiho/xdocs)
  XDOCS_INSTALL_DIR       Same as --install-dir
EOF
}

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

require_value() {
  local option="$1"
  local value="${2:-}"

  [[ -n "$value" ]] || fail "$option requires a value"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -v | --version)
        require_value "$1" "${2:-}"
        VERSION="$2"
        shift 2
        ;;
      --version=*)
        VERSION="${1#*=}"
        shift
        ;;
      --arch)
        require_value "$1" "${2:-}"
        ARCH_OVERRIDE="$2"
        shift 2
        ;;
      --arch=*)
        ARCH_OVERRIDE="${1#*=}"
        shift
        ;;
      --variant)
        require_value "$1" "${2:-}"
        VARIANT_OVERRIDE="$2"
        shift 2
        ;;
      --variant=*)
        VARIANT_OVERRIDE="${1#*=}"
        shift
        ;;
      --install-dir)
        require_value "$1" "${2:-}"
        INSTALL_DIR="$2"
        shift 2
        ;;
      --install-dir=*)
        INSTALL_DIR="${1#*=}"
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        fail "unknown flag: $1. Run with --help for usage."
        ;;
    esac
  done
}

detect_os() {
  case "$(uname -s)" in
    Linux) printf 'linux\n' ;;
    Darwin) printf 'macos\n' ;;
    *) fail "unsupported OS: $(uname -s)" ;;
  esac
}

detect_arch() {
  if [[ -n "$ARCH_OVERRIDE" ]]; then
    case "$ARCH_OVERRIDE" in
      x64 | arm64) printf '%s\n' "$ARCH_OVERRIDE" ;;
      *) fail "invalid --arch '$ARCH_OVERRIDE'. Must be x64 or arm64." ;;
    esac
    return
  fi

  case "$(uname -m)" in
    x86_64 | amd64) printf 'x64\n' ;;
    arm64 | aarch64) printf 'arm64\n' ;;
    *) fail "unsupported architecture: $(uname -m)" ;;
  esac
}

build_candidates() {
  local variant="${VARIANT_OVERRIDE:-baseline}"

  if [[ "$ARCH" == "arm64" ]]; then
    [[ -z "$VARIANT_OVERRIDE" ]] || fail "--variant is only valid for x64 installs"
    CANDIDATES=("xdocs-${OS}-arm64")
    return
  fi

  case "$variant" in
    baseline)
      CANDIDATES=("xdocs-${OS}-x64-baseline" "xdocs-${OS}-x64" "xdocs-${OS}-x64-modern")
      ;;
    default)
      CANDIDATES=("xdocs-${OS}-x64" "xdocs-${OS}-x64-baseline" "xdocs-${OS}-x64-modern")
      ;;
    modern)
      CANDIDATES=("xdocs-${OS}-x64-modern" "xdocs-${OS}-x64" "xdocs-${OS}-x64-baseline")
      ;;
    *)
      fail "invalid --variant '$variant'. Must be baseline, default, or modern."
      ;;
  esac
}

build_url() {
  local asset="$1"

  if [[ "$VERSION" == "latest" ]]; then
    printf 'https://github.com/%s/releases/latest/download/%s\n' "$REPO" "$asset"
    return
  fi

  local tag
  case "$VERSION" in
    @guiho/xdocs@*) tag="$VERSION" ;;
    @*) tag="$VERSION" ;;
    *) tag="@guiho/xdocs@${VERSION}" ;;
  esac

  local encoded_tag="${tag//@/%40}"
  encoded_tag="${encoded_tag//\//%2F}"
  printf 'https://github.com/%s/releases/download/%s/%s\n' "$REPO" "$encoded_tag" "$asset"
}

verify_native_binary() {
  local path="$1"
  local magic2
  local magic4

  magic2="$(LC_ALL=C head -c 2 "$path" 2>/dev/null || true)"
  magic4="$(LC_ALL=C head -c 4 "$path" 2>/dev/null || true)"

  case "$magic4" in
    $'\177ELF' | $'\xcf\xfa\xed\xfe' | $'\xce\xfa\xed\xfe' | $'\xca\xfe\xba\xbe') return 0 ;;
    '<!DO' | '<htm') return 1 ;;
  esac

  case "$magic2" in
    MZ) return 0 ;;
    '#!') return 1 ;;
  esac

  return 2
}

shell_profile_path() {
  local shell_name="${SHELL##*/}"

  case "$shell_name" in
    fish) printf '%s/.config/fish/config.fish\n' "$HOME" ;;
    zsh) printf '%s/.zshrc\n' "$HOME" ;;
    bash)
      if [[ "$OS" == "macos" && -f "$HOME/.bash_profile" ]]; then
        printf '%s/.bash_profile\n' "$HOME"
      else
        printf '%s/.bashrc\n' "$HOME"
      fi
      ;;
    *) printf '%s/.profile\n' "$HOME" ;;
  esac
}

path_contains_install_dir() {
  case ":$PATH:" in
    *:"$INSTALL_DIR":*) return 0 ;;
    *) return 1 ;;
  esac
}

append_path_to_profile() {
  local profile="$1"
  local shell_name="${SHELL##*/}"

  if [[ "$shell_name" == "fish" ]]; then
    mkdir -p "$HOME/.config/fish"
    if [[ -f "$profile" ]] && grep -Fq "$INSTALL_DIR" "$profile"; then
      return 0
    fi
    printf '\n# Added by xdocs installer\nfish_add_path %q\n' "$INSTALL_DIR" >>"$profile"
    return 0
  fi

  if [[ -f "$profile" ]] && grep -Fq "$INSTALL_DIR" "$profile"; then
    return 0
  fi

  printf '\n# Added by xdocs installer\nexport PATH=%q:\$PATH\n' "$INSTALL_DIR" >>"$profile"
}

ensure_path() {
  export PATH="$INSTALL_DIR:$PATH"

  if path_contains_install_dir; then
    printf 'xdocs: %s is available in PATH for this installer process.\n' "$INSTALL_DIR"
  fi

  local profile
  profile="$(shell_profile_path)"
  append_path_to_profile "$profile"

  printf 'xdocs: ensured %s is added to PATH in %s\n' "$INSTALL_DIR" "$profile"
  printf 'xdocs: restart your terminal, or run this for the current shell:\n'
  printf '  export PATH=%q:\$PATH\n' "$INSTALL_DIR"
}

check_shadowing() {
  local installed="$INSTALL_DIR/xdocs"
  local resolved

  resolved="$(command -v xdocs 2>/dev/null || true)"
  [[ -n "$resolved" ]] || return 0
  [[ "$resolved" == "$installed" ]] && return 0

  printf '\nwarning: another xdocs appears earlier in PATH:\n' >&2
  printf '  %s\n' "$resolved" >&2
  printf 'The newly installed binary is at:\n' >&2
  printf '  %s\n' "$installed" >&2
}

install_binary() {
  TMP="$(mktemp -d)"

  for asset in "${CANDIDATES[@]}"; do
    local url
    url="$(build_url "$asset")"
    printf '  Trying %s\n' "$url"

    if curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 "$url" --output "$TMP/xdocs"; then
      if ! verify_native_binary "$TMP/xdocs"; then
        printf '  %s was not a native binary, trying next candidate...\n' "$asset" >&2
        continue
      fi

      mkdir -p "$INSTALL_DIR"
      install -m 0755 "$TMP/xdocs" "$INSTALL_DIR/xdocs"
      printf 'Installed xdocs to %s/xdocs\n' "$INSTALL_DIR"
      ensure_path
      check_shadowing
      printf 'Run: xdocs --version\n'
      return 0
    fi

    printf '  not available, trying next...\n'
  done

  fail "no compatible xdocs binary found. Check available assets at: https://github.com/${REPO}/releases"
}

main() {
  parse_args "$@"
  require_command curl
  require_command grep
  require_command head
  require_command install
  require_command mktemp
  require_command uname

  OS="$(detect_os)"
  ARCH="$(detect_arch)"
  build_candidates

  local variant_label=""
  [[ -z "$VARIANT_OVERRIDE" ]] || variant_label=" variant=${VARIANT_OVERRIDE}"
  printf 'xdocs: %s  os=%s  arch=%s%s\n' "$VERSION" "$OS" "$ARCH" "$variant_label"
  install_binary
}

main "$@"
