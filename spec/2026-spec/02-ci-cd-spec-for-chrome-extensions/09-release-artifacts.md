# 09 — Release Artifacts & Verification

> Attaching artifacts, release notes, installer scripts on the release page, SHA-256 contract, preview download, and acceptance checks.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §15. Attaching artifacts to a Release

Use a SHA-pinned `softprops/action-gh-release` action (see §22a):

```yaml
- uses: softprops/action-gh-release@69320dbe05506a9a39fc8ae11030b214ec2d1f87 # v2.0.5
  with:
    tag_name: v${{ needs.setup.outputs.version }}
    files: release-assets/*
    body_path: release-assets/RELEASE_NOTES.md
    draft: false
    prerelease: ${{ contains(needs.setup.outputs.version, '-') }}
    make_latest: ${{ !contains(needs.setup.outputs.version, '-') }}
```


---

## §16. Release notes & changelog

- Maintain `./CHANGELOG.md` in the repo (committed text only — never binaries).
- Generate `release-assets/RELEASE_NOTES.md` at build time from the
  `${PREV_TAG}..${VER}` git range. **Exclude** the current tag from the
  candidate list when picking `PREV_TAG`, otherwise the range is empty.

Deterministic `PREV_TAG` rule (copy exactly; `VER` is the tag name with the
leading `v`, e.g. `v3.49.1`):

```bash
VER="v${VERSION#v}"
PREV_TAG=$(git tag --list 'v*' --sort=-v:refname | grep -vFx "$VER" | head -1 || true)

if [[ -n "$PREV_TAG" ]]; then
  RANGE="$PREV_TAG..$VER"
else
  FIRST_COMMIT=$(git rev-list --max-parents=0 "$VER" | tail -1)
  RANGE="$FIRST_COMMIT..$VER"
fi

{
  echo "# Release $VER"
  echo
  git log --no-merges --format='- %s (%h)' "$RANGE"
} > release-assets/RELEASE_NOTES.md
```

Never use `git describe --tags --abbrev=0` after creating the current tag: it
usually returns the current tag, producing an empty release-note range.


---

## §17. Scripts on the release page

Always upload, in addition to the ZIPs:

- `install.sh`, `install.ps1`
- `VERSION.txt` (plain version, no leading `v`)
- `checksums.txt` (`sha256sum *` over the release-assets folder)
- `CHANGELOG.md` (verbatim copy)
- `RELEASE_NOTES.md` (auto-generated)


---

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


---

## §28. Artifacts live only in releases

The only valid distribution channel is the GitHub Release page (or a mirror
that downloads from it). Branch checkouts must never contain installable
binaries.


---

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


---

## §33. Acceptance checks for a release artifact

- ZIP is non-empty.
- ZIP contains a parseable `manifest.json` with `manifest_version === 3`.
- ZIP contains **no** `.map` files.
- `manifest.version` equals the release tag (minus leading `v`).
- SHA-256 matches `checksums.txt`.
- All asset URLs return `200` (probed before flipping draft → published).

