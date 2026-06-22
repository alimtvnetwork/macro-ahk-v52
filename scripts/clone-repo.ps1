<#
.SYNOPSIS
  Fast source checkout for this repository without a full-history clone.

.DESCRIPTION
  Uses a shallow, single-branch, blob-filtered, tagless clone first. If GitHub
  resets the git transport, it falls back to downloading the branch source ZIP
  through GitHub's archive endpoint so users are not forced through a 37k-object
  full-history transfer.

.EXAMPLE
  irm https://raw.githubusercontent.com/aukgit/macro-ahk-v51/main/scripts/clone-repo.ps1 | iex
#>

[CmdletBinding()]
param(
    [string]$Repo = $(if ($env:MARCO_REPO_CLONE_REPO) { $env:MARCO_REPO_CLONE_REPO } else { 'aukgit/macro-ahk-v51' }),
    [string]$Target = $(if ($env:MARCO_REPO_CLONE_TARGET) { $env:MARCO_REPO_CLONE_TARGET } else { 'macro-ahk-v51' }),
    [string]$Branch = $(if ($env:MARCO_REPO_CLONE_BRANCH) { $env:MARCO_REPO_CLONE_BRANCH } else { 'main' }),
    [switch]$NoZipFallback
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step([string]$msg) { Write-Host "  [..] $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Err([string]$msg) { Write-Host "  [ER] $msg" -ForegroundColor Red }

function Normalize-Repo([string]$RawRepo) {
    $repoValue = $RawRepo.Trim() -replace '^https://github\.com/', '' -replace '\.git$', ''
    if ($repoValue -ieq 'alimtvnetwork/macro-ahk-v51') {
        Write-Warn "Stale repo owner replaced: alimtvnetwork/macro-ahk-v51 -> aukgit/macro-ahk-v51"
        return 'aukgit/macro-ahk-v51'
    }
    if ($repoValue -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
        Write-Err "Invalid repo '$RawRepo'"
        Write-Err "Reason=InvalidRepo; ReasonDetail=Expected owner/repo or https://github.com/owner/repo.git"
        exit 2
    }
    return $repoValue
}

function Assert-TargetAvailable([string]$TargetPath) {
    if (-not (Test-Path -LiteralPath $TargetPath)) { return }
    $entries = @(Get-ChildItem -LiteralPath $TargetPath -Force)
    if ($entries.Count -eq 0) { return }
    Write-Err "Target path is not empty: $TargetPath"
    Write-Err "Reason=TargetNotEmpty; ReasonDetail=Refusing to overwrite an existing non-empty checkout target."
    exit 1
}

function Download-SourceZip([string]$RepoValue, [string]$BranchValue, [string]$TargetPath) {
    $archiveUrl = "https://github.com/$RepoValue/archive/refs/heads/$BranchValue.zip"
    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("marco-source-" + [System.Guid]::NewGuid().ToString('N'))
    $zipPath = Join-Path $tempRoot 'source.zip'
    $extractRoot = Join-Path $tempRoot 'extract'
    New-Item -ItemType Directory -Path $tempRoot, $extractRoot -Force | Out-Null

    try {
        Write-Step "Downloading source ZIP: $archiveUrl"
        Invoke-WebRequest -Uri $archiveUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 180
        Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force
        $sourceDir = @(Get-ChildItem -LiteralPath $extractRoot -Directory | Select-Object -First 1)[0]
        if (-not $sourceDir) {
            Write-Err "Downloaded archive did not contain a top-level source folder"
            Write-Err "Path=$zipPath; MissingItem=top-level source folder; Reason=ArchiveShapeUnexpected"
            exit 3
        }
        if (Test-Path -LiteralPath $TargetPath) {
            Remove-Item -LiteralPath $TargetPath -Recurse -Force
        }
        Move-Item -LiteralPath $sourceDir.FullName -Destination $TargetPath
        Write-Ok "Source ZIP extracted to $TargetPath"
    } catch {
        Write-Err "Source ZIP fallback failed: $($_.Exception.Message)"
        Write-Err "URL=$archiveUrl; Path=$TargetPath; Reason=ZipFallbackFailed"
        exit 3
    } finally {
        if (Test-Path -LiteralPath $tempRoot) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

$repoValue = Normalize-Repo $Repo
$targetPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Target))
$repoUrl = "https://github.com/$repoValue.git"

Assert-TargetAvailable $targetPath

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Warn "git not found; using source ZIP fallback."
    Download-SourceZip $repoValue $Branch $targetPath
    exit 0
}

Write-Step "Shallow cloning $repoValue into $targetPath"
& git -c http.version=HTTP/1.1 clone --depth=1 --single-branch --filter=blob:none --no-tags --branch $Branch $repoUrl $targetPath
$cloneExit = $LASTEXITCODE
if ($cloneExit -eq 0) {
    Write-Ok "Shallow clone complete: $targetPath"
    exit 0
}

Write-Warn "git clone failed with exit code $cloneExit."
if ($NoZipFallback) {
    Write-Err "NoZipFallback was set; stopping after git clone failure."
    Write-Err "Repo=$repoUrl; Path=$targetPath; Reason=GitCloneFailed"
    exit $cloneExit
}

Write-Step "Removing partial clone, then switching to source ZIP fallback."
if (Test-Path -LiteralPath $targetPath) {
    Remove-Item -LiteralPath $targetPath -Recurse -Force -ErrorAction SilentlyContinue
}
Download-SourceZip $repoValue $Branch $targetPath
exit 0