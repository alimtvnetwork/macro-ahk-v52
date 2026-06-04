#!/usr/bin/env bash
# download-extension.sh — fetch ONE Chrome-extension release ZIP from a
# GitHub Release. Generic mirror of scripts/download-extension.ps1.
#
# Spec: spec/2026/02 - CI-CD Spec For Chrome Extensions/README.md §18
# Exit codes (fixed contract — see §3):
#   0 ok | 3 bad args | 4 asset 404 (strict) | 5 network/tool | 6 archive invalid
#
# Usage:
#   OWNER=acme REPO=my-ext ./download-extension.sh \
#       --extension marco-extension [--version vX.Y.Z] [--out ./downloads] \
#       [--verify-sha256]
set -euo pipefail

EXT=""
VER="latest"
OUT="./downloads"
VERIFY=0

usage() {
  sed -n '2,12p' "$0" >&2
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --extension)     EXT="${2:-}"; shift 2 ;;
    --version)       VER="${2:-}"; shift 2 ;;
    --out)           OUT="${2:-}"; shift 2 ;;
    --verify-sha256) VERIFY=1; shift ;;
    -h|--help)       usage 0 ;;
    *) echo "[download-extension] unknown arg: $1" >&2; exit 3 ;;
  esac
done

[[ -z "$EXT" ]]                 && { echo "[download-extension] missing --extension" >&2; exit 3; }
[[ -z "${OWNER:-}" ]]           && { echo "[download-extension] env OWNER required"  >&2; exit 3; }
[[ -z "${REPO:-}"  ]]           && { echo "[download-extension] env REPO required"   >&2; exit 3; }
command -v curl >/dev/null      || { echo "[download-extension] curl not found"      >&2; exit 5; }

# §14: validate --version shape (anything but `latest` must look like vX.Y.Z[-pre])
if [[ "$VER" != "latest" && ! "$VER" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9.+-]+)?$ ]]; then
  echo "[download-extension] bad --version: $VER (expected vX.Y.Z)" >&2
  exit 3
fi

mkdir -p "$OUT"

# Resolve version (no retries — see mem://constraints/no-retry-policy)
if [[ "$VER" == "latest" ]]; then
  api="https://api.github.com/repos/${OWNER}/${REPO}/releases/latest"
  resolved=$(curl -fsSL -H 'Accept: application/vnd.github+json' "$api" \
              | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1) \
    || { echo "[download-extension] network/tool failure resolving latest from $api" >&2; exit 5; }
  [[ -z "$resolved" ]] && { echo "[download-extension] latest tag missing in API response from $api" >&2; exit 5; }
  VER="$resolved"
fi

bare="${VER#v}"
zip_name="${EXT}-${bare}.zip"
url="https://github.com/${OWNER}/${REPO}/releases/download/${VER}/${zip_name}"

# Strict-mode 404 → exit 4 with full path + missing item (Code Red rule)
code=$(curl -sI -o /dev/null -w '%{http_code}' "$url" || true)
if [[ "$code" != "200" && "$code" != "302" ]]; then
  echo "[download-extension] AssetMissing http=$code url=$url file=$zip_name reason=release-asset-not-found" >&2
  exit 4
fi

dest="${OUT%/}/${zip_name}"
curl -fL --output "$dest" "$url" \
  || { echo "[download-extension] NetworkError url=$url dest=$dest" >&2; exit 5; }

# §33 acceptance: ZIP must be non-empty
[[ -s "$dest" ]] || { echo "[download-extension] InvalidArchive empty file=$dest" >&2; exit 6; }

if [[ "$VERIFY" -eq 1 ]]; then
  sums_url="https://github.com/${OWNER}/${REPO}/releases/download/${VER}/checksums.txt"
  expected=$(curl -fsSL "$sums_url" 2>/dev/null \
              | awk -v f="$zip_name" '$2==f{print $1}') \
    || { echo "[download-extension] NetworkError fetching $sums_url" >&2; exit 5; }
  [[ -z "$expected" ]] && { echo "[download-extension] InvalidArchive missing sha256 for $zip_name in checksums.txt" >&2; exit 6; }
  actual=$(sha256sum "$dest" | awk '{print $1}')
  if [[ "$expected" != "$actual" ]]; then
    echo "[download-extension] InvalidArchive sha256 mismatch file=$dest expected=$expected actual=$actual" >&2
    exit 6
  fi
fi

echo "[download-extension] ok file=$dest version=$VER"
