<#
.SYNOPSIS
  Download the Marco Chrome Extension release ZIP and extract it (flat name)
  into the current working directory.

.DESCRIPTION
  Lightweight companion to scripts/install.ps1. Unlike the full installer,
  this script does NOT:
    - install into $HOME\marco-extension
    - manage profiles, manifest patches, or auto-update wiring
    - resolve cross-repo update channels

  It simply:
    1. Resolves a version (explicit -Version flag, else GitHub `latest`).
    2. Downloads `marco-extension-<version>.zip` **into the current working
       directory** (kept as a backup — NOT deleted, NOT placed in temp).
    3. Removes the target extracted folder if it already exists (full overwrite
       of the unpacked tree only; the ZIP backup is preserved).
    4. Extracts into `<CWD>\<FolderName>` — a flat name with NO `v` prefix
       and NO version hyphen segment (default: "marco-extension").
    5. Leaves the ZIP in place at `<CWD>\marco-extension-<version>.zip`.

  Useful for quick local testing where you want the unpacked extension in
  the folder you are currently standing in, without touching $HOME.

.PARAMETER Version
  Version to download. Accepts `v3.15.3`, `3.15.3`, or `latest`.
  Default: `latest` (resolved via GitHub Releases API).

.PARAMETER Repo
  GitHub owner/repo. Default: alimtvnetwork/macro-ahk-v50

.PARAMETER FolderName
  Name of the extracted folder, created under the current directory.
  Default: `marco-extension` (flat — no `v`, no hyphen-version suffix).

.EXAMPLE
  # Latest release into .\marco-extension
  .\scripts\download-extension.ps1

.EXAMPLE
  # Specific version into .\marco-extension
  .\scripts\download-extension.ps1 -Version 3.15.3

.EXAMPLE
  # Custom folder name
  .\scripts\download-extension.ps1 -Version v3.15.3 -FolderName macro

.NOTES
  Exit codes:
    0  success
    2  resolution / network error
    3  archive corrupt or extraction failure
    4  invalid argument
#>

[CmdletBinding()]
param(
    [string]$Version    = $(if ($env:MARCO_DL_VERSION) { $env:MARCO_DL_VERSION } else { 'latest' }),
    [string]$Repo       = $(if ($env:MARCO_DL_REPO)    { $env:MARCO_DL_REPO }    else { 'alimtvnetwork/macro-ahk-v50' }),
    [string]$FolderName = $(if ($env:MARCO_DL_FOLDER)  { $env:MARCO_DL_FOLDER }  else { 'marco-extension' })
)

$ErrorActionPreference = 'Stop'
# NOTE: Do NOT enable `Set-StrictMode -Version Latest` here. When this script
# is run via `irm ... | iex`, strict mode is inherited by the caller session
# and turns every later missing-property access in the user's shell into a
# hard error. It also broke our own `$rsp.tag_name` access when the GitHub
# API response shape varies slightly (e.g. rate-limited HTML response).

function Write-Step([string]$msg) { Write-Host "  [..] $msg" -ForegroundColor Cyan }
function Write-Ok  ([string]$msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Err ([string]$msg) { Write-Host "  [!!] $msg" -ForegroundColor Red }

# ----------------------------------------------------------------------
# 1. Validate FolderName (no path separators, no leading dot/dash)
# ----------------------------------------------------------------------
if ($FolderName -match '[\\/:*?"<>|]' -or $FolderName.StartsWith('.') -or $FolderName.StartsWith('-')) {
    Write-Err "Invalid -FolderName '$FolderName' (no separators, no leading dot/dash)."
    exit 4
}

# ----------------------------------------------------------------------
# 2. Resolve version → canonical `vX.Y.Z[-pre]`
# ----------------------------------------------------------------------
function Resolve-Version([string]$raw, [string]$repo) {
    if ([string]::IsNullOrWhiteSpace($raw) -or $raw -ieq 'latest') {
        Write-Step "Querying GitHub Releases API for latest of $repo"
        $api = "https://api.github.com/repos/$repo/releases/latest"
        try {
            $rsp = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'marco-download-extension' } -TimeoutSec 20
        } catch {
            Write-Err "Failed to query $api : $($_.Exception.Message)"
            exit 2
        }
        $tagName = $null
        if ($rsp -and ($rsp.PSObject.Properties.Name -contains 'tag_name')) {
            $tagName = [string]$rsp.tag_name
        }
        if ([string]::IsNullOrWhiteSpace($tagName)) {
            Write-Err "Latest release response missing tag_name (Reason=ApiShapeUnexpected; ReasonDetail=$api)"
            exit 2
        }
        return $tagName
    }

    $candidate = $raw.Trim()
    if ($candidate -notmatch '^v?\d+\.\d+\.\d+(-[\w.-]+)?$') {
        Write-Err "Invalid -Version '$raw'. Expected vX.Y.Z[-pre] or X.Y.Z[-pre] or 'latest'."
        exit 4
    }
    if ($candidate -notmatch '^v') { $candidate = "v$candidate" }
    return $candidate
}

$tag = Resolve-Version -raw $Version -repo $Repo
Write-Ok "Resolved version: $tag"

# ----------------------------------------------------------------------
# 3. Compute paths and download URL
# ----------------------------------------------------------------------
$assetName  = "marco-extension-$tag.zip"
$downloadUrl = "https://github.com/$Repo/releases/download/$tag/$assetName"
$cwd        = if ($PWD.ProviderPath) { $PWD.ProviderPath } else { (Get-Location).Path }
$zipPath    = Join-Path $cwd $assetName
$targetDir  = Join-Path $cwd $FolderName

# ----------------------------------------------------------------------
# 4. Download ZIP into CWD (backup kept; never written to temp)
# ----------------------------------------------------------------------
if (Test-Path $zipPath) {
    Write-Step "Backup ZIP already present — overwriting: $zipPath"
}
Write-Step "Downloading $downloadUrl"
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 120
} catch {
    Write-Err "Download failed: $($_.Exception.Message)"
    Write-Err "URL: $downloadUrl"
    Write-Err "Reason=DownloadFailed; ReasonDetail=Asset '$assetName' may not exist for tag '$tag'."
    if (Test-Path $zipPath) { Remove-Item -Force $zipPath -ErrorAction SilentlyContinue }
    exit 2
}
$zipSize = (Get-Item $zipPath).Length
if ($zipSize -lt 1024) {
    Write-Err "Downloaded ZIP is suspiciously small ($zipSize bytes) at $zipPath"
    Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
    exit 3
}
Write-Ok "Downloaded $assetName ($([math]::Round($zipSize / 1MB, 2)) MB) -> $zipPath"

# ----------------------------------------------------------------------
# 5. Remove existing extracted folder (ZIP backup preserved) and extract
# ----------------------------------------------------------------------
if (Test-Path $targetDir) {
    Write-Step "Target folder exists — removing: $targetDir"
    try {
        Remove-Item -Recurse -Force $targetDir
    } catch {
        Write-Err "Failed to remove existing $targetDir : $($_.Exception.Message)"
        exit 3
    }
}

Write-Step "Extracting to $targetDir"
try {
    Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force
} catch {
    Write-Err "Extraction failed: $($_.Exception.Message)"
    Write-Err "ZIP: $zipPath  Target: $targetDir  Reason=ArchiveCorrupt"
    exit 3
}


# ----------------------------------------------------------------------
# 6. Sanity check + summary
# ----------------------------------------------------------------------
$manifest = Join-Path $targetDir 'manifest.json'
if (-not (Test-Path $manifest)) {
    Write-Err "Extracted folder missing manifest.json"
    Write-Err "  Path: $manifest"
    Write-Err "  Reason=ManifestMissing; ReasonDetail=ZIP did not contain manifest.json at root."
    exit 3
}

Write-Host ''
Write-Ok "Marco Extension $tag extracted to:"
Write-Host "       $targetDir" -ForegroundColor White
Write-Ok "Backup ZIP retained at:"
Write-Host "       $zipPath" -ForegroundColor White
Write-Host ''
Write-Host "  Next step (Chrome): chrome://extensions -> Load unpacked -> select the folder above." -ForegroundColor DarkGray
exit 0
