<#
.SYNOPSIS
  Install the prompt-creator CLI binary into .\bin (or $env:PROMPT_CREATOR_BIN_DIR).

.EXAMPLE
  iwr https://github.com/aukgit/macro-ahk-v52/releases/latest/download/install-prompt-creator.ps1 | iex
#>
[CmdletBinding()]
param(
  [string]$Repo    = $(if ($env:PROMPT_CREATOR_REPO)    { $env:PROMPT_CREATOR_REPO }    else { 'aukgit/macro-ahk-v52' }),
  [string]$Version = $(if ($env:PROMPT_CREATOR_VERSION) { $env:PROMPT_CREATOR_VERSION } else { 'latest' }),
  [string]$BinDir  = $(if ($env:PROMPT_CREATOR_BIN_DIR) { $env:PROMPT_CREATOR_BIN_DIR } else { (Join-Path (Get-Location) 'bin') })
)

$ErrorActionPreference = 'Stop'
$asset = 'prompt-creator-windows-x64.exe'
$url = if ($Version -eq 'latest') {
  "https://github.com/$Repo/releases/latest/download/$asset"
} else {
  "https://github.com/$Repo/releases/download/$Version/$asset"
}

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
$dest = Join-Path $BinDir 'prompt-creator.exe'
Write-Host "Downloading $url -> $dest"
Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
Write-Host "Installed. Add to PATH:  `$env:PATH = '$BinDir;' + `$env:PATH"
