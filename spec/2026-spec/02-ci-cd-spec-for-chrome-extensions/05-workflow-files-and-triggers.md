# 05 — Workflow Files, Triggers & Runtime Policy

> Workflow inventory, trigger matrix, generic parametrized YAML, SHA-pinning, Node/runner policy.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §5. Workflow files & triggers

Two workflows are mandatory:

- `./.github/workflows/ci.yml` — runs on every `push` and `pull_request` (no
  filters, no paths exclusion).
- `./.github/workflows/release.yml` — runs on `push` to `release/**`, on `v*`
  tags, on the `release` event, and on `workflow_dispatch`.


---

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


---

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
permissions:
  contents: read
concurrency: { group: release-${{ github.ref }}, cancel-in-progress: false }
env:
  NODE_VERSION: "24" # Active LTS as of 2026-06; refresh when Node active LTS changes.

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs: { version: ${{ steps.v.outputs.version }}, exts: ${{ steps.d.outputs.exts }} }
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
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
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with: { node-version: ${{ env.NODE_VERSION }}, cache: npm }
      - run: '[ -f package.json ] && npm ci || true'
      - run: '[ -f "${{ matrix.ext }}/package.json" ] && (cd "${{ matrix.ext }}" && npm ci && npm run build --if-present) || true'
      - run: npx --yes web-ext@8 lint --source-dir "${{ matrix.ext }}" --warnings-as-errors
      - name: Package
        run: |
          mkdir -p release-assets
          name=$(jq -r .name "${{ matrix.ext }}/manifest.json" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
          ver="${{ needs.setup.outputs.version }}"
          src="${{ matrix.ext }}"; [ -d "$src/dist" ] && src="$src/dist"
          (cd "$src" && find . -exec touch -h -d '2020-01-01T00:00:00Z' {} + && TZ=UTC zip -X -r -9 "$GITHUB_WORKSPACE/release-assets/${name}-${ver}.zip" . -x '*.git*' '*.DS_Store' 'node_modules/*' '*.map')
      - uses: actions/upload-artifact@65462800fd760344b1a7b4382951275a0abb4808 # v4.3.3
        with: { name: zip-${{ matrix.ext }}, path: release-assets/*.zip }

  publish:
    needs: [setup, build]
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: actions/download-artifact@65a9edc5881444af0b9093a5e628f2fe47ea3b2e # v4.1.7
        with: { path: release-assets, merge-multiple: true }
      - run: |
          cp scripts/install.{sh,ps1} release-assets/
          echo "${{ needs.setup.outputs.version }}" >release-assets/VERSION.txt
          ( cd release-assets && sha256sum * >checksums.txt )
      - uses: sigstore/cosign-installer@e1523de7571e31dbe865fd2e80c3e0197d95dc41 # v3.5.0
      - run: |
          cd release-assets
          cosign sign-blob --yes --output-signature checksums.txt.sig --output-certificate checksums.txt.pem checksums.txt
      - uses: softprops/action-gh-release@69320dbe05506a9a39fc8ae11030b214ec2d1f87 # v2.0.5
        with:
          tag_name: v${{ needs.setup.outputs.version }}
          files: release-assets/*
          draft: false
          prerelease: ${{ contains(needs.setup.outputs.version, '-') }}
      - run: |
          base="https://github.com/${GITHUB_REPOSITORY}/releases/download/v${{ needs.setup.outputs.version }}"
          for asset in release-assets/*; do
            size=$(curl -fsSLI "$base/$(basename "$asset")" | awk 'tolower($1)=="content-length:" {print $2}' | tr -d '\r')
            [ "${size:-0}" -gt 0 ] || { echo "missing or empty asset: $(basename "$asset")" >&2; exit 8; }
          done
```


---

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


---

## §22b. Node and runner version policy (active LTS only)

The workflow MUST declare Node once at top level and every `setup-node` step
MUST read that value. Inline `node-version` literals with hard-coded majors are
forbidden because they become stale silently when copied into future repositories.

Required workflow shape:

```yaml
env:
  NODE_VERSION: "24" # Active LTS as of 2026-06; refresh at implementation time.

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@<40-char-sha> # vX.Y.Z, see §22a
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
```

Implementation rule: before committing a new workflow, confirm the current
**active LTS** from the Node.js release schedule and set `NODE_VERSION` to that
major. Do not use an EOL major, `node`, `latest`, `current`, or a per-step
literal. When Node promotes a new active LTS, update this single env value in
the same PR that refreshes the `actions/setup-node` SHA pin.

Runner policy: use GitHub-hosted `ubuntu-latest` for the generic release flow
unless the host repo has a documented reason to pin an image. If pinned, use a
supported image such as `ubuntu-24.04` and review it when GitHub announces image
deprecation. Do not use deprecated runner labels.

## Acceptance

- [ ] The implementation satisfies the `05 — Workflow Files, Triggers & Runtime Policy` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
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
