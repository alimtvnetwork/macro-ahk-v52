# 16 — Hardening Addenda (G11–G20)

> Path-to-100 hardening rules layered on top of the base spec.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §41. Hardening addenda (G11–G20) — path to 100/100

These ten addenda close the residual 8-point gap identified after G1–G10. Each
is mandatory; copy verbatim.

### §41.1 G11 — Minimum-permissions `GITHUB_TOKEN` (top-level + per-job)

Every workflow MUST declare `permissions:` at the top level set to
`contents: read`, and ONLY the publish job may elevate to `contents: write`.
Never use the legacy repo-wide "Read and write" default.

```yaml
permissions:
  contents: read
jobs:
  publish:
    permissions:
      contents: write   # for release upload only
      id-token: write   # only if using OIDC (see §41.4)
```

### §41.2 G12 — Manifest V3 + web-ext lint gate (pre-package)

Before any `zip`, the publish job MUST run `web-ext lint --self-hosted` against
each discovered extension folder and fail on any error or warning of severity
`error`. This catches MV2 leftovers, invalid `content_security_policy`,
disallowed `permissions`, and missing icons that the Chrome Web Store will
later reject.

```yaml
- run: npx --yes web-ext@8 lint --source-dir "$EXT_DIR" --warnings-as-errors
```

### §41.3 G13 — Reproducible ZIP (deterministic mtime + sorted entries)

ZIPs MUST be byte-identical for identical sources. Use:

```bash
# inside ext dir
find . -exec touch -h -d '2020-01-01T00:00:00Z' {} +
TZ=UTC zip -X -r -9 "../$slug-$ver.zip" . \
  -x '*.git*' '*.DS_Store' 'node_modules/*'
```

Rationale: lets users diff two releases and lets `checksums.txt` stay stable
across re-runs of the same tag.

### §41.4 G14 — SLSA build provenance (`actions/attest-build-provenance`)

The publish job MUST emit SLSA v1 provenance for every ZIP, installer, and
`checksums.txt`. Pin by SHA per §22a.

```yaml
- uses: actions/attest-build-provenance@<SHA> # v2.x
  with:
    subject-path: |
      dist/*.zip
      dist/checksums.txt
      install.sh
      install.ps1
```

Requires `id-token: write` (see §41.1) and `attestations: write`.

### §41.5 G15 — Cosign keyless signing of `checksums.txt`

Sign `checksums.txt` with Sigstore cosign keyless (OIDC). Publish
`checksums.txt.sig` and `checksums.txt.pem` alongside it. Installers (§18, §19)
SHOULD verify when `cosign` is available and MUST NOT fail when it is absent
(graceful degrade — never block install on missing local tool).

```yaml
- uses: sigstore/cosign-installer@<SHA> # v3.x
- run: cosign sign-blob --yes --output-signature checksums.txt.sig \
         --output-certificate checksums.txt.pem checksums.txt
```

### §41.6 G16 — SBOM per extension (CycloneDX JSON)

For every extension that has a `package.json`, generate
`<slug>-<version>.sbom.cdx.json` with `@cyclonedx/cdxgen` and upload as a
release asset. Required for downstream vuln scanning and CWS review evidence.

```yaml
- run: npx --yes @cyclonedx/cdxgen@10 -t js -o "dist/$slug-$ver.sbom.cdx.json" "$EXT_DIR"
```

### §41.7 G17 — Post-publish smoke probe (must pass before job exits green)

After upload, the publish job MUST `curl -fsSLI` every uploaded asset URL
(ZIP, installer, checksums, sig, sbom) and verify HTTP 200 + non-zero
`Content-Length`. Fail the job (exit 8 — new code, append to §3) if any asset
404s. This catches partial uploads that §24a's no-cancel rule cannot.

### §41.8 G18 — Branch protection + required-status invariants (enforced)

The repo hosting an extension MUST configure on the default branch the exact
ruleset below. Verification is **enforced in CI** (not just documented) — the
`assert-branch-protection` job runs on every PR and on `main` push and exits
non-zero with code **13** if any invariant drifts.

Required invariants (canonical JSON shape returned by
`gh api repos/{owner}/{repo}/branches/main/protection`):

| Field | Required value |
|---|---|
| `required_pull_request_reviews.required_approving_review_count` | `>= 1` |
| `required_pull_request_reviews.dismiss_stale_reviews` | `true` |
| `required_status_checks.strict` | `true` |
| `required_status_checks.contexts` ⊇ | `["ci","version-agreement","web-ext-lint","actions-sha-pin-gate","preflight-secrets"]` |
| `enforce_admins.enabled` | `true` |
| `required_linear_history.enabled` | `true` |
| `allow_force_pushes.enabled` | `false` |
| `allow_deletions.enabled` | `false` |
| `block_creations.enabled` | `true` |

Reference verifier (`scripts/assert-branch-protection.sh`, copy verbatim):

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${GITHUB_REPOSITORY:?}"; : "${BRANCH:=main}"
J=$(gh api "repos/$GITHUB_REPOSITORY/branches/$BRANCH/protection" 2>/dev/null) || {
  echo "::error::branch protection not configured on $BRANCH — see spec §41.8"; exit 13; }
req() { # req <jq-expr> <expected> <label>
  got=$(jq -r "$1" <<<"$J")
  [ "$got" = "$2" ] || { echo "::error::§41.8 drift: $3 = $got (want $2)"; exit 13; }
}
req '.required_pull_request_reviews.dismiss_stale_reviews' true 'dismiss_stale_reviews'
req '.enforce_admins.enabled'                              true 'enforce_admins'
req '.required_linear_history.enabled'                     true 'required_linear_history'
req '.allow_force_pushes.enabled'                          false 'allow_force_pushes'
req '.allow_deletions.enabled'                             false 'allow_deletions'
req '.required_status_checks.strict'                       true 'strict_status_checks'
n=$(jq -r '.required_pull_request_reviews.required_approving_review_count' <<<"$J")
[ "$n" -ge 1 ] || { echo "::error::§41.8 drift: approvals=$n (want >=1)"; exit 13; }
for c in ci version-agreement web-ext-lint actions-sha-pin-gate preflight-secrets; do
  jq -e --arg c "$c" '.required_status_checks.contexts|index($c)' <<<"$J" >/dev/null \
    || { echo "::error::§41.8 missing required check: $c"; exit 13; }
done
echo "branch protection OK"
```

Reference CI job (drop into `.github/workflows/ci.yml`):

```yaml
assert-branch-protection:
  runs-on: ubuntu-24.04
  permissions: { contents: read }
  steps:
    - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
    - env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: bash scripts/assert-branch-protection.sh
```

`GITHUB_TOKEN` has sufficient read scope for the `branches/*/protection`
endpoint on private repos when the workflow is in the same repo; no PAT is
required for verification. §3 exit-code table extends:
`13 = branch-protection drift`.



### §41.9 G19 — Chrome Web Store publish path (optional but specified)

When `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, and
`CWS_EXTENSION_ID_<SLUG>` secrets are present, the publish job MUST also
upload the same byte-identical ZIP to CWS via `chrome-webstore-upload-cli` and
move it to `publish` (trusted-tester track if `CWS_TRACK=trustedTesters`).
Absence of any secret SKIPS this step cleanly — never fails the release.

```yaml
- if: ${{ env.CWS_CLIENT_ID != '' }}
  run: npx --yes chrome-webstore-upload-cli@3 upload \
        --source "dist/$slug-$ver.zip" --extension-id "$CWS_EXTENSION_ID" \
        --auto-publish
```

### §41.10 G20 — Tag immutability + semver+prerelease channel rules

- Tags matching `v[0-9]+.[0-9]+.[0-9]+` are **stable**; publish to `latest`.
- Tags matching `v[0-9]+.[0-9]+.[0-9]+-(alpha|beta|rc).[0-9]+` are
  **prerelease**; create the GitHub Release with `prerelease: true` and DO NOT
  update CWS `publish`; route to `trustedTesters` only.
- Re-tagging an existing version is FORBIDDEN at workflow level: add a job
  step that runs `gh api repos/$GITHUB_REPOSITORY/git/refs/tags/$VER` and exits
  9 if the tag already exists with a different SHA.
- §3 exit-code table extends: `8 = post-publish probe failed`,
  `9 = tag immutability violation`.

### §41.11 G21 — Secrets provisioning checklist (deterministic, per-repo)

To remove the residual "org-level secret provisioning" variance noted in §42,
every host repo MUST run the following provisioning checklist **once** before
the first release. The release workflow MUST fail fast with the exit codes
below when a referenced secret is missing at job start (do not defer to the
API call).

Required (always):

| Secret | Scope | Purpose | Missing-exit |
|---|---|---|---|
| `GITHUB_TOKEN` | auto (built-in) | Default release upload, attestation | n/a |

Conditionally required (only when the matching feature is enabled in
`release.yml`):

| Secret | Enables | Provisioning | Missing-exit |
|---|---|---|---|
| `RELEASE_PAT` | §25a split-workflow release creation | Fine-grained PAT, single repo, Contents: R/W, 90-day expiry | 10 |
| `CWS_CLIENT_ID` | §41.9 Chrome Web Store publish | Google Cloud OAuth client (Desktop) | 11 |
| `CWS_CLIENT_SECRET` | §41.9 CWS publish | Same OAuth client | 11 |
| `CWS_REFRESH_TOKEN` | §41.9 CWS publish | `chrome-webstore-upload-cli token` | 11 |
| `CWS_EXTENSION_ID_<SLUG>` | §41.9 CWS publish per ext | CWS dashboard → extension ID | 11 |
| `MINISIGN_SECRET_KEY` | §25 installer signing | `minisign -G` (password-protected) | 12 |
| `MINISIGN_PASSWORD` | §25 installer signing | Password for the key above | 12 |

Rules:

- Secret names above are **canonical** — host repos MUST use these exact names.
  Do NOT prefix with repo/org names; do NOT rename.
- Store at **org level** when shared by ≥2 repos; otherwise repo level. Never
  store in environment-scoped secrets unless §41.8 environment protection is
  also configured.
- The release workflow MUST contain a `preflight-secrets` job (no-op when the
  corresponding feature flag is off) that maps every secret to a boolean
  `HAS_*: ${{ secrets.NAME != '' }}` env var, then asserts only those booleans
  in shell. Do NOT loop over dynamic secret names such as
  `${{ secrets[ s ] }}` inside `run:` — GitHub Actions expressions are resolved
  before the shell starts, so that pattern is invalid and non-deterministic.
  Print only remediation hints; never log secret values.
- Rotation: `RELEASE_PAT` ≤ 90 days; `CWS_REFRESH_TOKEN` on Google revocation
  events; `MINISIGN_*` only on key compromise. Rotation events MUST be recorded
  in the repo's `CHANGELOG.md` under a `Security` heading (date + secret name,
  never the value).
- §3 exit-code table extends: `10 = missing RELEASE_PAT`,
  `11 = missing CWS_* secret`, `12 = missing MINISIGN_* secret`.

Reference preflight step (copy verbatim):

```yaml
preflight-secrets:
  runs-on: ubuntu-24.04
  steps:
    - name: Assert required secrets
      env:
        NEED_CWS: ${{ vars.PUBLISH_CWS == 'true' }}
        NEED_MINISIGN: ${{ vars.SIGN_INSTALLER == 'true' }}
        NEED_PAT: ${{ vars.SPLIT_RELEASE == 'true' }}
        HAS_RELEASE_PAT: ${{ secrets.RELEASE_PAT != '' }}
        HAS_CWS_CLIENT_ID: ${{ secrets.CWS_CLIENT_ID != '' }}
        HAS_CWS_CLIENT_SECRET: ${{ secrets.CWS_CLIENT_SECRET != '' }}
        HAS_CWS_REFRESH_TOKEN: ${{ secrets.CWS_REFRESH_TOKEN != '' }}
        HAS_CWS_EXTENSION_ID_MY_EXTENSION: ${{ secrets.CWS_EXTENSION_ID_MY_EXTENSION != '' }}
        HAS_MINISIGN_SECRET_KEY: ${{ secrets.MINISIGN_SECRET_KEY != '' }}
        HAS_MINISIGN_PASSWORD: ${{ secrets.MINISIGN_PASSWORD != '' }}
      run: |
        set -e
        require_secret() {
          name="$1"; present="$2"; code="$3"
          [ "$present" = "true" ] || { echo "::error::$name missing — see spec §41.11"; exit "$code"; }
        }
        if [ "$NEED_PAT" = "true" ]; then
          require_secret RELEASE_PAT "$HAS_RELEASE_PAT" 10
        fi
        if [ "$NEED_CWS" = "true" ]; then
          require_secret CWS_CLIENT_ID "$HAS_CWS_CLIENT_ID" 11
          require_secret CWS_CLIENT_SECRET "$HAS_CWS_CLIENT_SECRET" 11
          require_secret CWS_REFRESH_TOKEN "$HAS_CWS_REFRESH_TOKEN" 11
          require_secret CWS_EXTENSION_ID_MY_EXTENSION "$HAS_CWS_EXTENSION_ID_MY_EXTENSION" 11
        fi
        if [ "$NEED_MINISIGN" = "true" ]; then
          require_secret MINISIGN_SECRET_KEY "$HAS_MINISIGN_SECRET_KEY" 12
          require_secret MINISIGN_PASSWORD "$HAS_MINISIGN_PASSWORD" 12
        fi
```

Replace `MY_EXTENSION` with the canonical extension slug. For multiple
extensions, generate one `HAS_CWS_EXTENSION_ID_<SLUG>` env line and one
`require_secret CWS_EXTENSION_ID_<SLUG> ... 11` line per canonical slug. `<SLUG>`
MUST be uppercased and normalized to `[A-Z0-9_]` before use in the secret name.

All downstream jobs MUST list `needs: preflight-secrets` so a missing secret
short-circuits the run before any build, sign, or publish step executes.

---

