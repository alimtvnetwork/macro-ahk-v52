# 02 — CI/CD Spec For Chrome Extensions

> **Audience:** any AI agent or human engineer given **only this folder + an
> extension folder**. The goal: produce a working GitHub-Actions release
> pipeline, downloadable release artifacts, and a one-line installer — with
> zero repository-specific knowledge.

This spec is **generic** and **repo-agnostic**. All paths are relative to the
host repository root. It supports **one or many** Chrome extensions in the same
repo.

---

## §0. The Forty Planning Steps (write spec to match these)

These forty steps are the **outline**. The detailed spec below (§1–§40) maps
1:1 onto them.

1.  Read every file in the host repo relevant to CI/CD and packaging.
2.  Read and understand the download script end-to-end.
3.  Read and understand the install script end-to-end.
4.  Read and understand the probing feature end-to-end.
5.  Identify existing GitHub workflow/action files and their triggers.
6.  Document trigger conditions (push, tag, release, manual dispatch).
7.  Create the target spec folder at the agreed relative path.
8.  Define the spec's purpose and the "hand to any AI" mindset.
9.  Describe the generic extension folder shape an AI should expect.
10. Define Manifest V3 requirements for any extension.
11. Describe how to detect/enumerate one or many extension folders.
12. Define the build/package step that zips an extension (relative paths only).
13. Specify zip naming convention per extension and per version.
14. Specify how the version is derived (manifest version / tag).
15. Define how release artifacts (zips) are attached to a GitHub Release.
16. Define how release notes / changelog entries are generated and added.
17. Specify which scripts are published to the release page and how.
18. Provide the full download-script spec with an example implementation.
19. Provide the full install-script spec with an example implementation.
20. Provide the probing-feature spec with an example implementation.
21. Show the relative-path layout for scripts, build output, and artifacts.
22. Provide an example GitHub Actions workflow YAML (generic, parametrized).
23. Show how to matrix-build across multiple extensions.
24. Define caching / dependency steps.
25. Define permissions/secrets the workflow needs (generic names).
26. State the strict rule: never commit any asset ZIP to the repository.
27. Show `.gitignore` entries that enforce no-committed-zips.
28. Describe how artifacts live only in releases, not in commits.
29. Define how the README for the release/extension is written.
30. Provide a README template with example sections and placeholders.
31. Include unpacked-load install instructions in the README template.
32. Document the download-link approach (fetch + blob) for previews.
33. Define acceptance checks for a correct release artifact.
34. Define failure/log handling and where logs are written.
35. Pre-tag checklist an AI runs before tagging a release.
36. Post-workflow checklist an AI runs after the workflow completes.
37. Examples for adding a second/third extension with no rework.
38. Troubleshooting section with common failures and fixes.
39. Glossary of terms used in the spec.
40. Acceptance criteria covering every step above.

---

## §1. Read the host repo

Before doing anything, the implementing AI must enumerate:

- `./.github/workflows/*.yml` — existing pipelines.
- `./scripts/**` — installer/download/probe helpers.
- `./package.json` (or equivalent) — scripts and dependencies.
- Any folder containing a `manifest.json` with `"manifest_version": 3` — these
  are **extension folders**.

If a workflow already exists, treat this spec as **additive**: extend, don't
replace.

## §2a. Owner/Repo resolution (MANDATORY, never hard-code)

Every script (`download-extension.*`, `install.*`, `probe-*`) and every
workflow step that talks to GitHub MUST resolve `OWNER` and `REPO` through
this exact waterfall — in this order, fail-fast, no retry:

1. **Explicit CLI flags** — `--owner <o> --repo <r>` (highest precedence).
2. **`GITHUB_REPOSITORY` env var** — set automatically inside GitHub Actions
   as `owner/repo`; split on `/`.
3. **`git remote get-url origin`** — parse with regex
   `github\.com[:/]([^/]+)/([^/.]+?)(\.git)?$`; group 1 = owner, group 2 = repo.
4. **Fail with exit code `3`** and the message
   `owner/repo unresolved: pass --owner/--repo, set GITHUB_REPOSITORY, or run inside a git checkout with an origin remote`.

Hard-coding any literal `owner/repo` string anywhere in `scripts/**` or
`.github/workflows/**` is a **CI-blocking violation**. Enforce with a grep
gate in `ci.yml`:

```bash
if grep -RInE 'github\.com[:/][A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+' scripts/ .github/workflows/ \
     | grep -vE '(<owner>|<repo>|\$\{?OWNER\}?|\$\{?REPO\}?|\$\{?GITHUB_REPOSITORY\}?)'; then
  echo "Hard-coded owner/repo detected — use the §2a waterfall." >&2; exit 1
fi
```

Reference bash helper (drop into `scripts/lib/resolve-repo.sh`):

```bash
resolve_owner_repo() {                # sets OWNER, REPO; exits 3 on failure
  if [[ -n "${OWNER:-}" && -n "${REPO:-}" ]]; then return 0; fi
  if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    OWNER="${GITHUB_REPOSITORY%%/*}"; REPO="${GITHUB_REPOSITORY##*/}"; return 0
  fi
  local url; url=$(git remote get-url origin 2>/dev/null) || true
  if [[ "$url" =~ github\.com[:/]([^/]+)/([^/.]+?)(\.git)?$ ]]; then
    OWNER="${BASH_REMATCH[1]}"; REPO="${BASH_REMATCH[2]}"; return 0
  fi
  echo "owner/repo unresolved: pass --owner/--repo, set GITHUB_REPOSITORY, or run inside a git checkout with an origin remote" >&2
  exit 3
}
```

PowerShell mirror (`scripts/lib/Resolve-Repo.ps1`):

```powershell
function Resolve-OwnerRepo {
  if ($env:OWNER -and $env:REPO) { return @($env:OWNER, $env:REPO) }
  if ($env:GITHUB_REPOSITORY) {
    $p = $env:GITHUB_REPOSITORY -split '/', 2
    return @($p[0], $p[1])
  }
  $url = (git remote get-url origin 2>$null)
  if ($url -match 'github\.com[:/]([^/]+)/([^/.]+?)(\.git)?$') {
    return @($Matches[1], $Matches[2])
  }
  Write-Error 'owner/repo unresolved: pass -Owner/-Repo, set GITHUB_REPOSITORY, or run inside a git checkout with an origin remote'
  exit 3
}
```

§18 and §19 examples MUST source these helpers instead of `${OWNER:?}`.

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

- **Discovery vs strict:** explicit `--version` or release-URL invocation = strict
  (no fallback). Bare invocation = discovery (latest → main as last resort).

## §4. Probing feature

*Probing* = parallel HEAD requests to discover sibling repos or assets without
downloading them.

- Use cases: detect highest-version sibling repo (`project-v2`, `project-v3`);
  verify all expected assets exist on a release page before publishing.
- Defaults: depth ≤ 20, parallelism ≤ 8, wall-clock cap 5 s.
- Implementation: `curl -I -o /dev/null -w "%{http_code}"` (bash) or
  `Invoke-WebRequest -Method Head` (PowerShell).
- **Never** retry on failure — sequential fail-fast.

## §5. Workflow files & triggers

Two workflows are mandatory:

- `./.github/workflows/ci.yml` — runs on every `push` and `pull_request` (no
  filters, no paths exclusion).
- `./.github/workflows/release.yml` — runs on `push` to `release/**`, on `v*`
  tags, on the `release` event, and on `workflow_dispatch`.

## §6. Trigger matrix

| Event | ci.yml | release.yml |
|-------|--------|-------------|
| `push` to any branch | ✅ | only `release/**` |
| `pull_request` | ✅ | ❌ |
| `v*` tag | ✅ | ✅ |
| `release` (REST/UI) | ❌ | ✅ |
| `workflow_dispatch` | ✅ | ✅ |

> **Critical:** the `release` event is the only reliable hook for REST-API or
> web-UI created releases. Without it, server-side tag creation produces an
> empty release page.

## §7. Target spec location

`./spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/` (this folder). Use the
same `NN-name` lowercase hyphen pattern for future 2026 specs.

## §8. Purpose statement

> Given this folder and any folder containing a Manifest V3 `manifest.json`,
> an AI agent must be able to (a) wire a CI workflow that lints/tests, (b)
> wire a release workflow that builds, packages, and publishes downloadable
> ZIPs to a GitHub Release, and (c) publish installer scripts on the release
> page — all without committing any binary artifact to the repository.

## §9. Generic extension folder shape

```
<ext-root>/
├── manifest.json          # required, Manifest V3
├── icons/                 # optional
├── popup.html             # optional
├── background.{js,ts}     # optional
├── content/               # optional
├── src/ or dist/          # build inputs/outputs
└── package.json           # optional, with `build` script if compiled
```

Detection rule: any directory whose `manifest.json` parses with
`manifest_version === 3` is an extension folder.

## §10. Manifest V3 requirements

Required keys: `manifest_version` (=3), `name`, `version` (semver `X.Y.Z`),
`description`, plus at least one of `action`, `background`, `content_scripts`.
`icons.128` recommended for the Chrome Web Store.

## §11. Enumerate extensions

```bash
# bash
mapfile -t EXTS < <(find . -name manifest.json -not -path '*/node_modules/*' \
  | xargs -I{} sh -c 'jq -e ".manifest_version==3" "{}" >/dev/null && dirname "{}"')
```

```pwsh
# PowerShell
$exts = Get-ChildItem -Recurse -Filter manifest.json `
  | Where-Object { $_.FullName -notmatch 'node_modules' } `
  | Where-Object { (Get-Content $_ -Raw | ConvertFrom-Json).manifest_version -eq 3 } `
  | ForEach-Object { $_.Directory.FullName }
```

## §12. Build & package step

```bash
package_extension() {           # $1 = ext dir, $2 = version, $3 = out dir
  local name; name=$(jq -r .name "$1/manifest.json" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
  ( cd "$1" && zip -r "$3/${name}-${2}.zip" . \
      -x '*/node_modules/*' '*.map' '*.log' '.DS_Store' )
}
```

Rules: build first (`npm run build` if present) → zip the **output** folder
(`dist/` if present, else the extension root) → write to **`./release-assets/`**
(git-ignored).

## §13. Zip naming convention

`<slug>-<version>.zip` where `<slug>` is the lowercase, hyphenated extension
name. Example: `marco-extension-3.49.1.zip`. Never include the leading `v`.

## §14. Version derivation

Priority order:
1. Explicit input on `workflow_dispatch` (`inputs.version`).
2. Tag ref: `refs/tags/vX.Y.Z` → `X.Y.Z`.
3. Branch ref: `refs/heads/release/vX.Y.Z` → `X.Y.Z`.
4. `manifest.version` of the primary extension.

All four must agree before publishing — fail the build otherwise.

## §15. Attaching artifacts to a Release

Use `softprops/action-gh-release@v2`:

```yaml
- uses: softprops/action-gh-release@v2
  with:
    tag_name: v${{ needs.setup.outputs.version }}
    files: release-assets/*
    body_path: release-assets/RELEASE_NOTES.md
    draft: false
    prerelease: ${{ contains(needs.setup.outputs.version, '-') }}
    make_latest: ${{ !contains(needs.setup.outputs.version, '-') }}
```

## §16. Release notes & changelog

- Maintain `./CHANGELOG.md` in the repo (committed text only — never binaries).
- Generate `release-assets/RELEASE_NOTES.md` at build time from the
  `${PREV_TAG}..${VER}` git range. **Exclude** the current tag from the
  candidate list when picking `PREV_TAG`, otherwise the range is empty.

## §17. Scripts on the release page

Always upload, in addition to the ZIPs:

- `install.sh`, `install.ps1`
- `VERSION.txt` (plain version, no leading `v`)
- `checksums.txt` (`sha256sum *` over the release-assets folder)
- `CHANGELOG.md` (verbatim copy)
- `RELEASE_NOTES.md` (auto-generated)

## §17a. SHA-256 verification contract (MANDATORY)

Every downloader and installer MUST verify each downloaded asset against the
release's `checksums.txt` before extracting or executing it. Skipping this
check is a CI-blocking violation — silent acceptance of a tampered ZIP is the
single worst failure mode of a release pipeline.

- **Source of truth**: `checksums.txt` generated at publish time via
  `( cd release-assets && sha256sum * > checksums.txt )` and uploaded with
  the release (see §17).
- **Format**: GNU coreutils `sha256sum` lines — `<64-hex>  <filename>`. The
  filename is the basename only (no path).
- **Failure**: exit code `6` (broadened from "extraction failed" to
  "integrity failed"), printing `sha256 mismatch: expected <hex> got <hex>`
  with the asset name. Never retry.
- **Tooling**: `sha256sum` (Linux), `shasum -a 256` (macOS),
  `Get-FileHash -Algorithm SHA256` (PowerShell). Always normalize to
  lowercase hex before compare.

Reference bash helper (`scripts/lib/verify-sha256.sh`):

```bash
verify_sha256() {                       # $1=file, $2=checksums.txt
  local file=$1 sums=$2 base expected actual
  base=$(basename "$file")
  expected=$(awk -v f="$base" '$2==f {print tolower($1)}' "$sums" | head -1)
  [[ -z "$expected" ]] && { echo "no checksum entry for $base in $sums" >&2; exit 6; }
  actual=$(sha256sum "$file" 2>/dev/null | awk '{print tolower($1)}')
  [[ -z "$actual" ]] && actual=$(shasum -a 256 "$file" | awk '{print tolower($1)}')
  [[ "$expected" != "$actual" ]] && { echo "sha256 mismatch: expected $expected got $actual ($base)" >&2; exit 6; }
}
```

PowerShell mirror (`scripts/lib/Verify-Sha256.ps1`):

```powershell
function Verify-Sha256 {                # -File <path> -Sums <path>
  param([string]$File, [string]$Sums)
  $base = Split-Path $File -Leaf
  $expected = (Get-Content $Sums | ForEach-Object {
    $p = $_ -split '\s+', 2; if ($p[1] -eq $base) { $p[0].ToLower() }
  } | Select-Object -First 1)
  if (-not $expected) { Write-Error "no checksum entry for $base in $Sums"; exit 6 }
  $actual = (Get-FileHash -Algorithm SHA256 -Path $File).Hash.ToLower()
  if ($expected -ne $actual) { Write-Error "sha256 mismatch: expected $expected got $actual ($base)"; exit 6 }
}
```

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
6=integrity/extract. **Never** swallow errors with `-ErrorAction
SilentlyContinue` outside `finally` cleanup — fail fast per §-no-retry policy.

Self-test in CI: `pwsh -File scripts/install.ps1 -Version v0.0.0-test -Ext demo`
in a `windows-latest` matrix leg of `ci.yml` to catch parser/TLS regressions.

## §20. Probing feature (full example)

```bash

```bash
# probe-siblings.sh — find the highest-numbered sibling repo (project-v2, -v3 …)
probe_max=20; concurrency=8; deadline=5
base="$1"  # e.g. https://github.com/acme/project
seq 2 "$probe_max" | xargs -P "$concurrency" -I{} -t bash -c '
  url="'"$base"'-v{}"
  code=$(curl -s -o /dev/null -w "%{http_code}" -m '"$deadline"' "$url")
  [[ "$code" == "200" ]] && echo "{}"
' | sort -n | tail -1
```

The same algorithm is used during release publication to verify every required
asset URL returns `200` before flipping `draft: false`.

## §21. Relative-path layout

```
./
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── scripts/
│   ├── install.sh
│   ├── install.ps1
│   ├── download-extension.sh
│   ├── download-extension.ps1
│   └── probe-siblings.sh
├── <extension-1>/manifest.json
├── <extension-2>/manifest.json        # any number of siblings
├── release-assets/                    # ❌ git-ignored, build output
└── CHANGELOG.md
```

## §22. Example workflow YAML (generic, parametrized)

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: ["release/**"]
    tags: ["v*"]
  release:
    types: [created, published]
  workflow_dispatch:
    inputs:
      version: { description: "vX.Y.Z", required: true }
permissions: { contents: write }
concurrency: { group: release-${{ github.ref }}, cancel-in-progress: false }

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs: { version: ${{ steps.v.outputs.version }}, exts: ${{ steps.d.outputs.exts }} }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - id: v
        run: |
          ref="${GITHUB_REF#refs/tags/}"; ref="${ref#refs/heads/release/}"
          v="${{ inputs.version || ref }}"; echo "version=${v#v}" >>"$GITHUB_OUTPUT"
      - id: d
        run: |
          exts=$(find . -name manifest.json -not -path '*/node_modules/*' \
            -exec sh -c 'jq -e ".manifest_version==3" "$1" >/dev/null && dirname "$1"' _ {} \; \
            | jq -R -s -c 'split("\n")|map(select(length>0))')
          echo "exts=$exts" >>"$GITHUB_OUTPUT"

  build:
    needs: setup
    runs-on: ubuntu-latest
    strategy: { matrix: { ext: ${{ fromJSON(needs.setup.outputs.exts) }} } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: '[ -f package.json ] && npm ci || true'
      - run: '[ -f "${{ matrix.ext }}/package.json" ] && (cd "${{ matrix.ext }}" && npm ci && npm run build --if-present) || true'
      - name: Package
        run: |
          mkdir -p release-assets
          name=$(jq -r .name "${{ matrix.ext }}/manifest.json" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
          ver="${{ needs.setup.outputs.version }}"
          src="${{ matrix.ext }}"; [ -d "$src/dist" ] && src="$src/dist"
          (cd "$src" && zip -r "$GITHUB_WORKSPACE/release-assets/${name}-${ver}.zip" . -x '*.map')
      - uses: actions/upload-artifact@v4
        with: { name: zip-${{ matrix.ext }}, path: release-assets/*.zip }

  publish:
    needs: [setup, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { path: release-assets, merge-multiple: true }
      - run: |
          cp scripts/install.{sh,ps1} release-assets/
          echo "${{ needs.setup.outputs.version }}" >release-assets/VERSION.txt
          ( cd release-assets && sha256sum * >checksums.txt )
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ needs.setup.outputs.version }}
          files: release-assets/*
          draft: false
          prerelease: ${{ contains(needs.setup.outputs.version, '-') }}
```

## §22a. SHA-pin all third-party actions (supply-chain hard rule)

Floating tags like `@v2`, `@v4`, or `@main` are mutable — the action publisher
(or an attacker who compromises their account) can retag a poisoned commit and
silently inject malicious code into every subsequent run. **Every `uses:` entry
in `.github/workflows/**` MUST pin to a full 40-char commit SHA, with the
human-readable version as a trailing comment.**

Scope: pin **every** `uses:` step, including first-party `actions/*`. GitHub's
own actions have shipped breaking changes within a major tag before; the SHA
is the only immutable reference.

Required form:

```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
- uses: actions/upload-artifact@65462800fd760344b1a7b4382951275a0abb4808 # v4.3.3
- uses: actions/download-artifact@65a9edc5881444af0b9093a5e628f2fe47ea3b2e # v4.1.7
- uses: softprops/action-gh-release@69320dbe05506a9a39fc8ae11030b214ec2d1f87 # v2.0.5
```

Resolve a SHA with: `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha` or
`git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag>`.

CI gate (add to `ci.yml`):

```yaml
- name: Ban floating action refs
  run: |
    if grep -RnE 'uses:\s+[^@]+@(v?[0-9]+(\.[0-9]+)*|main|master|latest)\b' \
         .github/workflows; then
      echo "::error::All actions must be SHA-pinned (§22a)"; exit 1
    fi
```

Upgrade workflow: enable Dependabot (`.github/dependabot.yml` with
`package-ecosystem: github-actions`); it opens PRs that bump both the SHA and
the trailing `# vX.Y.Z` comment together, preserving auditability.

The §22 YAML uses floating tags for readability only; **production workflows
MUST be SHA-pinned** per this section.

## §23. Matrix-build across multiple extensions

The `strategy.matrix.ext` in §22 already auto-discovers every Manifest V3 folder
and builds them in parallel. Adding a new extension = adding a folder. No
workflow edits needed.

## §24. Caching & dependency steps

- `actions/setup-node@v4` with `cache: npm` (or `pnpm`).
- Cache the package-manager store keyed on the lockfile hash.
- Use `actions/cache@v4` for any heavyweight per-extension build dirs.
- Use `actions/upload-artifact@v4` / `download-artifact@v4` (1-day retention)
  to pass ZIPs between `build` and `publish` jobs.

## §25. Permissions & secrets

- `permissions: { contents: write }` is required on the publish job.
- No third-party secrets are required for the default flow. Only add:
  - `CWS_*` (Chrome Web Store) if auto-publishing.
  - `MINISIGN_SECRET_KEY` if signing installers.
- Names must be generic — do **not** hard-code repo-specific secret names.

## §25a. GitHub token vs. PAT trigger rule (MANDATORY)

Use the built-in `GITHUB_TOKEN` only for the default safe flow where the release
workflow is triggered directly by one of §5's supported events (`push` to
`release/**`, `v*` tag push, `release`, or `workflow_dispatch`) and then uploads
assets in the same workflow run.

If any workflow creates a GitHub Release through REST, `gh release create`, or a
third-party action and expects a **separate downstream workflow** to run from the
resulting `release` event, `GITHUB_TOKEN` is forbidden for that creation step.
GitHub suppresses workflow-triggering events created by `GITHUB_TOKEN`; the
downstream `release.yml` will not run.

For REST-created releases, use exactly one of these deterministic designs:

1. **Recommended:** do not split creation and publishing. Keep release creation,
   artifact upload, checksums, and installer upload inside the same `release.yml`
   run using `GITHUB_TOKEN` plus `permissions: { contents: write }`.
2. **Allowed only when split workflows are required:** create the release with a
   fine-grained PAT stored as `RELEASE_PAT`, scoped to the single repository with
   **Contents: Read and write**. Use `RELEASE_PAT` only for the REST release
   creation step; all other steps should continue using `GITHUB_TOKEN`.

Never name this secret after a repository, user, or organization. Never use a
classic broad PAT unless fine-grained tokens are unavailable.

## §26. ⛔ Strict rule — never commit asset ZIPs

> **No `.zip`, `.crx`, `.xpi`, or built `dist/` artifact may ever be committed
> to the repository.** Artifacts live only on the GitHub Release page.
> Violations must fail CI immediately.

Rationale: binary diffs bloat history, leak unsigned builds, and cause
confusion about which artifact is authoritative.

## §27. `.gitignore` enforcement

```gitignore
# build/release outputs — release artifacts live only on the Releases page
release-assets/
*.zip
*.crx
*.xpi
dist/
node_modules/
```

Add a CI gate: `git ls-files | grep -E '\.(zip|crx|xpi)$' && exit 1`.

## §28. Artifacts live only in releases

The only valid distribution channel is the GitHub Release page (or a mirror
that downloads from it). Branch checkouts must never contain installable
binaries.

## §29. README writing rules

Each extension's README must:
- Lead with one-line install commands (PowerShell + Bash).
- Show the unpacked-load steps verbatim.
- Link to the latest Release page.
- Never reference a specific version — use `latest` so the doc never goes stale.
- Use a hero image (`./assets/hero.png`) above the install block.

## §30. README template

```markdown
# <Extension Name>

> <one-sentence value prop>

![hero](./assets/hero.png)

## Install (one line)

**Windows (PowerShell):**
\`\`\`powershell
iwr -useb https://github.com/<owner>/<repo>/releases/latest/download/install.ps1 | iex
\`\`\`

**macOS / Linux (Bash):**
\`\`\`bash
curl -fsSL https://github.com/<owner>/<repo>/releases/latest/download/install.sh | bash
\`\`\`

## Manual install (unpacked)

1. Download `<slug>-<version>.zip` from the [latest release](https://github.com/<owner>/<repo>/releases/latest).
2. Unzip it.
3. Open `chrome://extensions`, enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder.

## About
…
```

## §31. Unpacked-load instructions (canonical)

Always include the four-step block from §30 verbatim — same wording across
every extension README so users learn the flow once.

## §32. Preview download via fetch + blob

Direct `<a download>` links can fail under auth-gated previews. Use:

```ts
const r = await fetch('/my-extension.zip');
if (!r.ok) throw new Error(`download failed: ${r.status}`);
const a = Object.assign(document.createElement('a'), {
  href: URL.createObjectURL(await r.blob()),
  download: 'my-extension.zip',
});
a.click(); URL.revokeObjectURL(a.href);
```

## §33. Acceptance checks for a release artifact

- ZIP is non-empty.
- ZIP contains a parseable `manifest.json` with `manifest_version === 3`.
- ZIP contains **no** `.map` files.
- `manifest.version` equals the release tag (minus leading `v`).
- SHA-256 matches `checksums.txt`.
- All asset URLs return `200` (probed before flipping draft → published).

## §34. Failure & log handling

- All scripts log to `./logs/<script>-<UTC-ISO>.log` with full stderr.
- On failure, log includes: exit code, exact URL attempted, missing-asset
  filename, and the reason classifier (`AssetMissing`, `NetworkError`,
  `InvalidArchive`, `VersionMismatch`).
- Never silently retry — sequential fail-fast.

## §35. Pre-tag checklist

- [ ] `manifest.version` bumped on every changed extension.
- [ ] `CHANGELOG.md` has a new section dated today.
- [ ] All tests/lints green on `main`.
- [ ] No `*.zip` or `dist/` tracked by git.
- [ ] Release branch created: `release/vX.Y.Z`.

## §36. Post-workflow checklist

- [ ] Release page lists every expected ZIP + `install.sh` + `install.ps1` +
      `checksums.txt` + `VERSION.txt` + `RELEASE_NOTES.md`.
- [ ] `checksums.txt` SHA-256s match.
- [ ] One-line install commands from §30 actually work end-to-end.
- [ ] Probe job reported `200` for every asset URL.

## §37. Adding a second/third extension

1. Drop the new folder anywhere (e.g. `./my-new-ext/`) with a Manifest V3
   `manifest.json`.
2. Add an entry in the root `CHANGELOG.md`.
3. Commit — the matrix in §22 auto-discovers it.
4. Tag `vX.Y.Z` → both extensions ship side-by-side on the same Release page.

No workflow edits required.

## §38. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Release page has only "Source code" archives | `release.yml` didn't run, or ran on wrong ref | Re-dispatch with the exact `vX.Y.Z` tag |
| `install.sh` exits 4 | Asset name mismatch | Check zip naming (`<slug>-<ver>.zip`, no leading `v`) |
| `install.sh` exits 5 | GitHub API rate limit | Pass `--version vX.Y.Z` explicitly |
| Workflow never triggers on REST-API release | Missing `release:` trigger | Add `on: release: { types: [created, published] }` |
| CI fails "zip committed" | Binary tracked in git | `git rm --cached **/*.zip`, add to `.gitignore` |
| `manifest.version` ≠ tag | Forgot to bump | Bump manifest, re-tag |

## §39. Glossary

- **Strict mode** — installer was given an explicit version or downloaded from a
  release URL; no fallback allowed.
- **Discovery mode** — installer was run bare; may fall through to latest.
- **Probe** — non-downloading HEAD request, parallel and capped.
- **Slug** — lowercase hyphenated extension name from `manifest.json`.
- **Release artifact** — any file uploaded to a GitHub Release page.
- **Unpacked load** — installing a directory via `chrome://extensions`.

## §40. Acceptance criteria (binds the whole spec)

1. `./spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/` exists.
2. Spec is generic and repo-agnostic; all paths are relative.
3. The forty planning steps (§0) are written before the detailed sections.
4. Download script, install script, and probing feature are documented with
   runnable examples (§18, §19, §20).
5. Example GitHub Actions workflow YAML is included and supports one or many
   extensions via `strategy.matrix` (§22, §23).
6. The "never commit any asset ZIP" rule is stated as a strict guideline (§26)
   and enforced via `.gitignore` (§27).
7. README writing guidance plus a template is included (§29, §30).
8. Any AI agent, given only this folder plus an extension folder, can implement
   the CI/CD and produce downloadable release artifacts with no gaps.
