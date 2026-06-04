#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Marco Extension — install.ps1 checksum/signature static contract
#
# Pins v0.2/v0.3 installer hardening for the PowerShell installer without
# requiring a Windows runner or PowerShell runtime. Bash mock-server tests
# already execute AC-21/22/23 end-to-end; this file prevents install.ps1
# from drifting away from that same checksum/signature contract.
# ─────────────────────────────────────────────────────────────────────

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INSTALLER="${REPO_ROOT}/scripts/install.ps1"
CONTRACT="${REPO_ROOT}/scripts/installer-contract.json"

if [ ! -f "${INSTALLER}" ]; then
    printf '\033[31m✗ install.ps1 not found at %s\033[0m\n' "${INSTALLER}" >&2
    exit 2
fi
if [ ! -f "${CONTRACT}" ]; then
    printf '\033[31m✗ installer contract not found at %s\033[0m\n' "${CONTRACT}" >&2
    exit 2
fi

PASS_COUNT=0
FAIL_COUNT=0
FAIL_LINES=()

assert_grep_file() {
    local label="$1" file="$2" pattern="$3"
    if grep -qE "${pattern}" "${file}"; then
        printf '  \033[32m✓\033[0m %s\n' "${label}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf '  \033[31m✗\033[0m %s\n' "${label}"
        printf '      file: %s\n' "${file}"
        printf '      pattern not found: %s\n' "${pattern}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        FAIL_LINES+=("${label}")
    fi
}

assert_no_grep_file() {
    local label="$1" file="$2" pattern="$3"
    if grep -qE "${pattern}" "${file}"; then
        printf '  \033[31m✗\033[0m %s\n' "${label}"
        printf '      forbidden pattern present: %s\n' "${pattern}"
        grep -nE "${pattern}" "${file}" | sed 's/^/        /' >&2
        FAIL_COUNT=$((FAIL_COUNT + 1))
        FAIL_LINES+=("${label}")
    else
        printf '  \033[32m✓\033[0m %s\n' "${label}"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
}

printf '\n\033[36m▸ Contract declares checksum/signature ACs\033[0m\n'

assert_grep_file "AC-21 checksum verification declared" "${CONTRACT}" '"AC-21"'
assert_grep_file "AC-22 checksum mismatch abort declared" "${CONTRACT}" '"AC-22"'
assert_grep_file "AC-23 missing checksums soft-warn declared" "${CONTRACT}" '"AC-23"'
assert_grep_file "AC-24 signature verification declared" "${CONTRACT}" '"AC-24"'
assert_grep_file "AC-25 signature mismatch abort declared" "${CONTRACT}" '"AC-25"'
assert_grep_file "AC-26 signature precondition soft-warn declared" "${CONTRACT}" '"AC-26"'
assert_grep_file "checksums.txt filename is contract-owned" "${CONTRACT}" '"fileName"[[:space:]]*:[[:space:]]*"checksums\.txt"'
assert_grep_file "minisign public key env var is contract-owned" "${CONTRACT}" '"publicKeyEnvVar"[[:space:]]*:[[:space:]]*"MARCO_MINISIGN_PUBKEY"'

printf '\n\033[36m▸ install.ps1 checksum verifier\033[0m\n'

assert_grep_file "Test-Checksum function defined" "${INSTALLER}" 'function[[:space:]]+Test-Checksum'
assert_grep_file "Get-Asset invokes Test-Checksum before signature/install" "${INSTALLER}" 'Test-Checksum -Version \$version -AssetName \$assetName -ZipPath \$zipPath -TmpDir \$tmpDir'
assert_grep_file "checksums downloaded from same release" "${INSTALLER}" '\$checksumsUrl = "\$script:DownloadBase/\$Repo/releases/download/\$Version/checksums\.txt"'
assert_grep_file "checksums.txt fetched via Invoke-WebRequest" "${INSTALLER}" 'Invoke-WebRequest -Uri \$checksumsUrl -OutFile \$checksumsPath'
assert_grep_file "sha256sum line parser accepts optional binary marker" "${INSTALLER}" '\^\(\[0-9a-fA-F\]\{64\}\)\\s\+\\\*\?\(\.\+\)\$'
assert_grep_file "Get-FileHash SHA256 computes local digest" "${INSTALLER}" 'Get-FileHash -Algorithm SHA256 -LiteralPath \$ZipPath'
assert_grep_file "successful checksum logs verified" "${INSTALLER}" 'Checksum verified \(\$AssetName\)'
assert_grep_file "checksum mismatch logs hard error" "${INSTALLER}" 'Checksum MISMATCH for \$AssetName'
assert_grep_file "checksum mismatch exits invalid-archive code" "${INSTALLER}" 'exit 6'
assert_grep_file "missing checksums soft-warns" "${INSTALLER}" 'Skipping checksum verification \(older release predating v0\.2 hardening\)'
assert_no_grep_file "missing checksums path does not hard-abort" "${INSTALLER}" 'checksums\.txt not found[\s\S]*exit[[:space:]]+6'

printf '\n\033[36m▸ install.ps1 minisign verifier\033[0m\n'

assert_grep_file "Test-Signature function defined" "${INSTALLER}" 'function[[:space:]]+Test-Signature'
assert_grep_file "Get-Asset invokes Test-Signature after checksum" "${INSTALLER}" 'Test-Signature -Version \$version -TmpDir \$tmpDir'
assert_grep_file "signature public key read from env" "${INSTALLER}" '\$pubkey = \$env:MARCO_MINISIGN_PUBKEY'
assert_grep_file "signature file defaults to checksums.txt.minisig" "${INSTALLER}" "'checksums\.txt\.minisig'"
assert_grep_file "signature downloaded from same release" "${INSTALLER}" '\$sigUrl = "\$script:DownloadBase/\$Repo/releases/download/\$Version/\$sigFile"'
assert_grep_file "minisign command is discovered" "${INSTALLER}" 'Get-Command minisign'
assert_grep_file "minisign verifies checksums.txt" "${INSTALLER}" '\$minisign\.Source -V -P \$pubkey -m \$checksumsPath -x \$sigPath'
assert_grep_file "signature success logs verified" "${INSTALLER}" 'Signature verified \(checksums\.txt\)'
assert_grep_file "signature mismatch hard-aborts" "${INSTALLER}" 'Signature MISMATCH for checksums\.txt'
assert_grep_file "missing minisign soft-warns" "${INSTALLER}" 'minisign CLI not found — skipping signature verification'

echo ""
echo "────────────────────────────────────────────────────"
printf 'install.ps1 checksum/signature tests: \033[32m%d passed\033[0m, \033[31m%d failed\033[0m\n' \
    "${PASS_COUNT}" "${FAIL_COUNT}"
echo "────────────────────────────────────────────────────"

if [ "${FAIL_COUNT}" -gt 0 ]; then
    echo ""
    echo "Failed assertions:"
    for line in "${FAIL_LINES[@]}"; do
        printf '  • %s\n' "${line}"
    done
    exit 1
fi
exit 0