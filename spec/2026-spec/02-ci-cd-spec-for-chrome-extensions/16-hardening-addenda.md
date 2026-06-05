# 16 — Hardening Addenda (G11–G24)

> Path-to-100 hardening rules layered on top of the base spec.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §41. Hardening addenda (G11–G24) — path to 100/100

These addenda close the residual gap identified after G1–G10 and the follow-up
audit gaps G21–G24. Each is mandatory; copy verbatim.

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

---

## §41 — Follow-up audit (G21–G24)

The four subsections below (§41.11–§41.14) close the residual gaps surfaced by
the independent follow-up audit. They are tracked as **G21–G24** in
[`audit.md`](./audit.md) and in [`99-consistency-report.md`](./99-consistency-report.md).

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

### §41.12 G22 — Installer contract test workflow (`installer-tests.yml`)

The §3 exit-code contract (`0 / 3 / 4 / 5 / 6 / 8 / 9 / 10 / 11 / 12 / 13`) and
the §18/§19 download/install scripts are non-negotiable end-user surfaces. They
MUST be enforced by a dedicated companion workflow — `installer-tests.yml` —
that runs on every PR touching the installer scripts, the contract JSON, or
this spec folder.

**Required structure:**

```yaml
name: Installer Tests

on:
  push:
    branches: [main]
    paths:
      - 'scripts/install.*'                        # install.sh + install.ps1
      - 'scripts/installer-contract.json'           # §3 exit-code contract
      - 'scripts/installer-constants.*'             # generated constants
      - 'scripts/check-installer-contract.mjs'      # contract verifier
      - 'tests/installer/**'                        # bash + pwsh suites
      - 'spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/**'
      - '.github/workflows/installer-tests.yml'
  pull_request:
    paths: *paths   # same set
  workflow_dispatch:

jobs:
  linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y powershell           # pwsh for .ps1 suites
      - run: npm run test:installer                       # runs all 5 suites

  windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:installer:windows               # real MoveFileEx E2E
```

**Mandatory test suites (every host repo MUST ship all five):**

| # | File | Purpose |
|---|------|---------|
| 1 | `tests/installer/resolver.test.sh` | Unit: `resolve_version`, `decide_sibling_discovery` |
| 2 | `tests/installer/mock-server.test.sh` | Full pipeline vs. local Node mock — asserts every §3 exit code |
| 3 | `tests/installer/deferred-delete.test.sh` | Sharing-violation / locked-file logic |
| 4 | `tests/installer/deferred-delete-sim.test.sh` | P/Invoke surface mocks |
| 5 | `tests/installer/resolver.ps1.test.ps1` | `install.ps1` parity (200+empty, 404, 500, network, happy-tag) |

**Acceptance:** the workflow MUST fail-fast (no retry) the moment any suite
prints a non-zero exit. A green `installer-tests.yml` run is a required status
check under §41.8 G18 branch protection (`required-status: installer-tests`).

### §41.13 G25 — Release watcher self-heal contract (`release-watcher.yml`)

**Root cause:** The `release.yml` workflow is triggered by `push: tags: v*`
plus `release` and `workflow_dispatch` (§6). In real operations, tags arrive
out-of-band — created by the web UI, the REST API, or external tooling that
lands a `.gitmap/release/vX.Y.Z.json` descriptor on `main`. In those paths the
`push: tags: v*` event does **not** always fire, so the Release page is
created with only the auto-generated source archives and the built ZIPs +
`install.sh` / `install.ps1` / `VERSION.txt` / `checksums.txt` (§17) are
never uploaded. Without a self-heal workflow, this regression is invisible
until a user reports a broken install.

**Required workflow:** every host repo MUST ship `release-watcher.yml` with
the contract below. It is a non-negotiable companion of `release.yml` (see
`pipeline/03-release-workflow.md` — Companion Workflows).

```yaml
name: Release Watcher

on:
  push:
    branches: [main]
    paths:
      - '.gitmap/release/v*.json'
      - '.gitmap/release/latest.json'
      - '.github/workflows/release.yml'
      - '.github/workflows/release-watcher.yml'
  release:
    types: [published, created, edited]     # catches any out-of-band release
  workflow_dispatch:

permissions:
  contents: write
  actions: write

concurrency:
  group: release-watcher-${{ github.ref }}
  cancel-in-progress: false                  # never cancel an in-flight heal

jobs:
  resolve-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Read version from .gitmap descriptor
        id: ver
        run: echo "version=$(jq -r .version .gitmap/release/latest.json)" >> "$GITHUB_OUTPUT"
      - name: Verify tag exists on origin
        run: git ls-remote --tags origin "refs/tags/v${{ steps.ver.outputs.version }}" | grep .
      - name: Call canonical release.yml in-process
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner, repo: context.repo.repo,
              workflow_id: 'release.yml', ref: 'main',
              inputs: { version: 'v${{ steps.ver.outputs.version }}' }
            });
```

**Mandatory invariants:**

1. **Self-heal trigger set** — `push: paths: .gitmap/release/**`, `release:
   [published, created, edited]`, and `workflow_dispatch` are ALL required.
   Omitting `release:` re-opens the source-only Release page regression.
2. **In-process dispatch** — call `release.yml` via `workflow_dispatch` (or
   `workflow_call`) with the resolved version. Never queue an async
   `gh workflow run` against stale workflow logic — the watcher could pass
   while the Release page remains source-only.
3. **No cancel-in-progress** — `concurrency.cancel-in-progress: false`. A
   second descriptor push must NOT abort a heal already uploading assets.
4. **`.gitmap/` descriptor is the source of truth** — version is read from
   `.gitmap/release/latest.json` (or the specific `vX.Y.Z.json` for direct
   dispatch). No version is ever parsed out of `manifest.json` or commit
   messages by this workflow.
5. **Fail-fast on missing tag** — if `git ls-remote --tags` does not return
   the resolved tag, the job MUST fail (exit non-zero). The watcher never
   creates tags itself; tag creation is handled by the release-tagger memory
   `mem://cicd/release-watcher-self-heal-tag` (separate concern).
6. **No retry policy** — the heal is single-attempt per trigger event. Re-run
   only via a new descriptor push or explicit `workflow_dispatch`.

**Acceptance:** a green `release-watcher.yml` run for a given `vX.Y.Z` MUST
result in `release.yml` re-uploading every §17 asset, and the §41.7 G17
post-publish smoke probe MUST pass against the resulting Release page. If
either condition is false, the host repo is non-compliant with the spec.

---

## Acceptance

- [ ] The implementation satisfies the `16 — Hardening Addenda (G11–G24)` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
- [ ] Verification passes when `npm run test:cicd-spec` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
