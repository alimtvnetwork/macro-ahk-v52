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

**Installer exit-code contract** — `install.sh` / `install.ps1` MUST exit with
exactly the codes defined in [`03-download-and-install-scripts.md` §3](./03-download-and-install-scripts.md#3-install-script).
Quick reference for release-time gates:

| Code | Meaning | Spec anchor |
|------|---------|-------------|
| 0    | Success | §3 |
| 3    | Bad `--version` argument | §3 |
| 4    | Targeted asset missing (404) in strict mode | §3 |
| 5    | Network/tool error | §3 |
| 6    | Integrity failure (SHA-256 mismatch / archive invalid) | §17a |
| 8    | Post-publish probe failed (missing/zero-byte asset) | §41.7 G17 |
| 9    | Tag immutability violation | §41.10 G20 |
| 10   | Missing `RELEASE_PAT` while split-release enabled | §41.11 G21 |
| 11   | Missing `CWS_*` secret while CWS publish enabled | §41.11 G21 |
| 12   | Missing `MINISIGN_*` secret while installer signing enabled | §41.11 G21 |
| 13   | Branch-protection drift vs §41.8 | §41.8 G18 |

The release workflow MUST fail-fast on any of `8 / 9 / 10 / 11 / 12 / 13` —
they signal an unsafe or non-reproducible release page and MUST NOT be retried
(see `mem://constraints/no-retry-policy`).


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

## Acceptance

- [ ] The implementation satisfies the `09 — Release Artifacts & Verification` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
- [ ] Verification passes when `npm run test:cicd-spec` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every CI numeric (timeouts, retries=0, artefact retention days, matrix size, job concurrency) to a named constant in `reference/05-runtime-defaults.md` or repo-level workflow constants. No inline literals in workflow YAML or scripts.
- **MUST** keep `.github/workflows/ci.yml` on bare `on: push:` — no `branches:` or `paths:` filters (see `mem://constraints/ci-push-trigger-unfiltered`). Canary: `ping.yml`. Regression test: `scripts/__tests__/ci-workflow-trigger-policy.test.mjs`.
- **MUST** sign release tags with the project key and embed `version.json` provenance (commit SHA + build epoch) into every uploaded artefact. Unsigned or unstamped releases are rejected by `audit-releases.yml`.
- **MUST** route every CI failure through `Logger.error` + workflow `::error::` annotation — never silent `continue-on-error: true` and never email/Slack/webhook notifications (see `mem://constraints/no-ci-notifications`).

## Pitfalls / Counter-examples

- ❌ Adding `branches: [main]` to `ci.yml` to "speed things up" — silently skips Lovable branch commits; regression has recurred 3× (see canary `ping.yml`). ✅ Keep `on: push:` bare; filter inside jobs with `if:` only.
- ❌ `continue-on-error: true` on the three audit scripts (`check-acceptance`, `check-dangling-links`, `check-must-constants`). ✅ Hard-gate them now that baseline is zero failures.
- ❌ Out-of-band tag creation via the GitHub UI — bypasses `release.yml` and produces an empty release page (`cicd-issues/03`, `05`, `06`). ✅ Use `gh release create` with the workflow dispatch path or rely on the release-watcher self-heal (`mem://cicd/release-watcher-self-heal-tag`).
- ❌ Retrying a failed publish step with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`; surface the failure in the release page and require a human decision.
- ❌ Committing zipped extension artefacts to the repo. ✅ Build in CI, attach to the GitHub Release only (see `11-no-committed-zips.md`).

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

