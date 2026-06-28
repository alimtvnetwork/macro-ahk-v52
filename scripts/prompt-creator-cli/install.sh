#!/usr/bin/env bash
# Install the prompt-creator CLI binary into ./bin (or $PROMPT_CREATOR_BIN_DIR).
#
# Usage:
#   curl -fsSL https://github.com/aukgit/macro-ahk-v52/releases/latest/download/install-prompt-creator.sh | bash
#   # or pinned:
#   PROMPT_CREATOR_VERSION=v4.8.0 ./install.sh
set -euo pipefail

REPO="${PROMPT_CREATOR_REPO:-aukgit/macro-ahk-v52}"
VERSION="${PROMPT_CREATOR_VERSION:-latest}"
BIN_DIR="${PROMPT_CREATOR_BIN_DIR:-./bin}"

uname_s="$(uname -s)"
uname_m="$(uname -m)"
case "$uname_s" in
  Linux*)   os="linux" ;;
  Darwin*)  os="macos" ;;
  *)        echo "Unsupported OS: $uname_s" >&2; exit 1 ;;
esac
case "$uname_m" in
  x86_64|amd64) arch="x64" ;;
  *) echo "Unsupported arch: $uname_m" >&2; exit 1 ;;
esac

asset="prompt-creator-${os}-${arch}"
if [ "$VERSION" = "latest" ]; then
  url="https://github.com/${REPO}/releases/latest/download/${asset}"
else
  url="https://github.com/${REPO}/releases/download/${VERSION}/${asset}"
fi

mkdir -p "$BIN_DIR"
dest="${BIN_DIR}/prompt-creator"
echo "Downloading $url -> $dest"
curl -fsSL "$url" -o "$dest"
chmod +x "$dest"
echo "Installed $($dest --help >/dev/null 2>&1 && echo OK || echo OK)"
echo "Add to PATH:  export PATH=\"$(cd "$BIN_DIR" && pwd):\$PATH\""
