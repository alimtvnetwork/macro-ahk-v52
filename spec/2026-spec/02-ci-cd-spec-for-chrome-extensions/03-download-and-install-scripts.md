# 03 — Download & Install Scripts

> One-line download + install contracts (bash + PowerShell), with full reference implementations.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §2. Download script

A *download script* fetches a specific release ZIP for an extension from a
GitHub Release page and writes it to disk.

- **Inputs:** `--extension <name>`, optional `--version vX.Y.Z` (default:
  `latest`), optional `--out <path>`.
- **Behavior:**
  1. Resolve version: explicit value → `releases/latest` API → exit `5` on
     network failure.
  2. Build asset URL:
     `https://github.com/{owner}/{repo}/releases/download/{ver}/{extension}-{ver}.zip`.
  3. `HEAD` the URL; on `404` exit `4` with the missing URL printed.
  4. Stream to `./<out>/<extension>-<ver>.zip`.
  5. Verify SHA-256 against `checksums.txt` from the same release.


---

## §3. Install script

The *install script* is what end-users run. It downloads, verifies, and stages
the extension into an unpacked-load directory (or, on Chromium-managed
deployments, a policy folder).

- One file per shell: `install.sh` (bash) and `install.ps1` (PowerShell 5+).
- **Self-locating version:** if the script's own URL contains
  `/releases/download/vX.Y.Z/`, it is implicitly pinned to that version.
  Otherwise it queries `latest`.
- **Exit codes** (fixed contract):

  | Code | Meaning |
  |------|---------|
  | 0 | Success |
  | 3 | Bad `--version` argument |
  | 4 | Targeted asset missing (404) in strict mode |
  | 5 | Network/tool error |
  | 6 | Integrity failed — SHA-256 mismatch, missing checksum entry, or archive invalid / extraction failed (see §17a) |
  | 8 | Post-publish probe failed — at least one uploaded release asset is missing, zero-byte, or unreachable |
  | 9 | Tag immutability violation — an existing version tag points at a different commit or the channel rule is violated |
  | 10 | Missing `RELEASE_PAT` while split-release mode is enabled |
  | 11 | Missing `CWS_*` secret while Chrome Web Store publishing is enabled |
  | 12 | Missing `MINISIGN_*` secret while installer signing is enabled |
  | 13 | Branch-protection drift — live GitHub protection JSON does not match §41.8 |

- **Discovery vs strict:** explicit `--version` or release-URL invocation = strict
  (no fallback). Bare invocation = discovery (latest → main as last resort).


---

## §18. Download script (full example)

```bash
#!/usr/bin/env bash
# download-extension.sh — fetch one extension ZIP from a GitHub Release.
set -euo pipefail
. "$(dirname "$0")/lib/resolve-repo.sh"   # §2a
. "$(dirname "$0")/lib/verify-sha256.sh"  # §17a
EXT=""; VER="latest"; OUT="./downloads"
while [[ $# -gt 0 ]]; do case "$1" in
  --extension) EXT=$2; shift 2;;
  --version)   VER=$2; shift 2;;
  --out)       OUT=$2; shift 2;;
  --owner)     OWNER=$2; shift 2;;
  --repo)      REPO=$2; shift 2;;
  *) echo "unknown arg: $1" >&2; exit 3;;
esac; done
[[ -z "$EXT" ]] && { echo "missing --extension" >&2; exit 3; }
resolve_owner_repo
mkdir -p "$OUT"
if [[ "$VER" == "latest" ]]; then
  VER=$(curl -fsSL "https://api.github.com/repos/$OWNER/$REPO/releases/latest" \
        | jq -r .tag_name) || exit 5
fi
BASE="https://github.com/$OWNER/$REPO/releases/download/$VER"
ZIP="${EXT}-${VER#v}.zip"
curl -fIsSL "$BASE/$ZIP" >/dev/null || { echo "missing asset: $BASE/$ZIP" >&2; exit 4; }
curl -fL --output "$OUT/$ZIP"           "$BASE/$ZIP"           || exit 5
curl -fL --output "$OUT/checksums.txt"  "$BASE/checksums.txt"  || exit 5
verify_sha256 "$OUT/$ZIP" "$OUT/checksums.txt"   # exit 6 on mismatch
echo "Saved $OUT/$ZIP (sha256 verified)"
```

PowerShell mirror (`download-extension.ps1`) MUST source `Resolve-Repo.ps1`
and `Verify-Sha256.ps1`, download both the asset and `checksums.txt`, then
call `Verify-Sha256` before declaring success. Same exit codes.


---

## §19. Install script (full example)

```bash
#!/usr/bin/env bash
# install.sh — unified installer (URL-pinned or latest).
set -euo pipefail
. "$(dirname "$0")/lib/resolve-repo.sh"   # §2a
. "$(dirname "$0")/lib/verify-sha256.sh"  # §17a
self_url="${BASH_SOURCE[0]:-$0}"
override="${1:-}"
resolve_owner_repo
resolve_version() {
  case "${override:-}" in
    "")        ;;
    latest)    override="";;
    v*.*.*)    echo "$override"; return;;
    *)         echo "bad --version: $override" >&2; exit 3;;
  esac
  if [[ "$self_url" =~ /releases/download/(v[0-9.]+[^/]*)/ ]]; then
    echo "${BASH_REMATCH[1]}"; return
  fi
  curl -fsSL "https://api.github.com/repos/$OWNER/$REPO/releases/latest" \
    | jq -r .tag_name || exit 5
}
VER=$(resolve_version)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
BASE="https://github.com/$OWNER/$REPO/releases/download/$VER"
ZIP="${EXT}-${VER#v}.zip"
curl -fL --output "$TMP/$ZIP"          "$BASE/$ZIP"          || { echo "asset 404: $BASE/$ZIP" >&2; exit 4; }
curl -fL --output "$TMP/checksums.txt" "$BASE/checksums.txt" || exit 5
verify_sha256 "$TMP/$ZIP" "$TMP/checksums.txt"    # exit 6 on mismatch
unzip -q "$TMP/$ZIP" -d "$HOME/.local/share/$EXT/$VER" || exit 6
echo "Installed $EXT $VER → $HOME/.local/share/$EXT/$VER (sha256 verified)"
echo "Load it via chrome://extensions → Developer mode → Load unpacked."
```



---

## §19a. PowerShell installer (full example, Windows-native)

`install.ps1` is the Windows counterpart to §19. It MUST behave identically:
same exit codes (§3), same SHA-256 gate (§17a), same owner/repo waterfall
(§2a). Save as `scripts/install.ps1` and ship it alongside `install.sh` in
every release (§22 `publish` job copies both into `release-assets/`).

```powershell
#!/usr/bin/env pwsh
# install.ps1 — unified Windows installer (URL-pinned or latest).
[CmdletBinding()]
param(
  [string]$Version = '',          # '', 'latest', or 'vX.Y.Z'
  [string]$Ext     = $env:EXT     # extension folder name, required
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

. (Join-Path $PSScriptRoot 'lib/Resolve-Repo.ps1')    # §2a → $Owner,$Repo
. (Join-Path $PSScriptRoot 'lib/Verify-Sha256.ps1')   # §17a → Verify-Sha256
Resolve-OwnerRepo                                     # exit 3 on miss

if (-not $Ext) { Write-Error 'EXT not set'; exit 3 }

function Resolve-Version {
  param([string]$Override, [string]$SelfUrl)
  switch -Regex ($Override) {
    '^$'         { }
    '^latest$'   { $Override = '' }
    '^v\d+\.\d+\.\d+' { return $Override }
    default      { Write-Error "bad -Version: $Override"; exit 3 }
  }
  if ($SelfUrl -match '/releases/download/(v[0-9.]+[^/]*)/') {
    return $Matches[1]
  }
  try {
    $r = Invoke-RestMethod "https://api.github.com/repos/$Owner/$Repo/releases/latest"
    return $r.tag_name
  } catch { Write-Error "latest lookup failed: $_"; exit 5 }
}

$selfUrl = $MyInvocation.MyCommand.Path
$ver     = Resolve-Version -Override $Version -SelfUrl $selfUrl
$tmp     = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "ext-$([guid]::NewGuid())")
try {
  $base = "https://github.com/$Owner/$Repo/releases/download/$ver"
  $zip  = "$Ext-$($ver.TrimStart('v')).zip"
  try {
    Invoke-WebRequest "$base/$zip"          -OutFile (Join-Path $tmp $zip)
    Invoke-WebRequest "$base/checksums.txt" -OutFile (Join-Path $tmp 'checksums.txt')
  } catch {
    Write-Error "download failed: $_"; exit 4
  }

  Verify-Sha256 -File (Join-Path $tmp $zip) -Checksums (Join-Path $tmp 'checksums.txt')  # exit 6 on mismatch

  $dest = Join-Path $env:LOCALAPPDATA "$Ext\$ver"
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  Expand-Archive -Path (Join-Path $tmp $zip) -DestinationPath $dest -Force
  Write-Host "Installed $Ext $ver → $dest (sha256 verified)"
  Write-Host "Load it via chrome://extensions → Developer mode → Load unpacked."
} finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
```

Required helpers (mirror the bash ones):

- `scripts/lib/Resolve-Repo.ps1` — implements §2a waterfall: `-Owner/-Repo`
  flags → `$env:GITHUB_REPOSITORY` → `git remote get-url origin` regex →
  `exit 3`. Exposes `$script:Owner`, `$script:Repo`.
- `scripts/lib/Verify-Sha256.ps1` — implements §17a: reads `checksums.txt`,
  compares `Get-FileHash -Algorithm SHA256`, `exit 6` on mismatch or missing
  entry.

Exit-code parity (§3): 3=bad input, 4=asset 404, 5=network/API,
6=integrity/extract, 8=post-publish probe failed, 9=tag immutability violation.
**Never** swallow errors with `-ErrorAction
SilentlyContinue` outside `finally` cleanup — fail fast per §-no-retry policy.

Self-test in CI: `pwsh -File scripts/install.ps1 -Version v0.0.0-test -Ext demo`
in a `windows-latest` matrix leg of `ci.yml` to catch parser/TLS regressions.

