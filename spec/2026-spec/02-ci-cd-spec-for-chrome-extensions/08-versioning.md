# 08 — Versioning

> How version is derived, propagated, and validated across the pipeline.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./readme.md).

---

## §14. Version derivation

Priority order:
1. Explicit input on `workflow_dispatch` (`inputs.version`).
2. Tag ref: `refs/tags/vX.Y.Z` → `X.Y.Z`.
3. Branch ref: `refs/heads/release/vX.Y.Z` → `X.Y.Z`.
4. `manifest.version` of the primary extension.

All four must agree before publishing — fail the build otherwise.

### §14a. Reference implementation: `scripts/check-version-agreement.sh`

Copy this verbatim. It compares the `workflow_dispatch` input (optional), the
tag ref (optional), the branch ref (optional), and **every** discovered
`manifest.json` `version` field under the repo, exiting non-zero with a
mismatch report.

```bash
#!/usr/bin/env bash
# scripts/check-version-agreement.sh
# Usage: check-version-agreement.sh [<input_version>]
# Env:   GITHUB_REF (e.g. refs/tags/v1.2.3 or refs/heads/release/v1.2.3)
set -euo pipefail

INPUT_VERSION="${1:-}"
REF="${GITHUB_REF:-}"

normalize() { sed -E 's/^v//; s/[[:space:]]+//g'; }

declare -a SOURCES=()
add() { [[ -n "${2:-}" ]] && SOURCES+=("$1=$(printf '%s' "$2" | normalize)"); }

add "input"  "$INPUT_VERSION"

case "$REF" in
  refs/tags/v*)          add "tag"    "${REF#refs/tags/v}" ;;
  refs/heads/release/v*) add "branch" "${REF#refs/heads/release/v}" ;;
esac

# Discover every manifest.json (skip node_modules, dist, archives).
while IFS= read -r -d '' f; do
  v=$(node -e "process.stdout.write(require('./'+process.argv[1]).version||'')" "$f" 2>/dev/null || true)
  [[ -n "$v" ]] && add "manifest:$f" "$v"
done < <(find . -type f -name manifest.json \
           -not -path '*/node_modules/*' \
           -not -path '*/dist/*' \
           -not -path '*/.release/*' \
           -not -path '*/skipped/*' -print0)

if [[ ${#SOURCES[@]} -lt 2 ]]; then
  echo "::error::version-agreement: need at least 2 sources, got ${#SOURCES[@]}" >&2
  printf '  %s\n' "${SOURCES[@]}" >&2
  exit 2
fi

UNIQ=$(printf '%s\n' "${SOURCES[@]}" | awk -F= '{print $2}' | sort -u | wc -l)
if [[ "$UNIQ" -ne 1 ]]; then
  echo "::error::version-agreement: sources disagree" >&2
  printf '  %s\n' "${SOURCES[@]}" >&2
  exit 1
fi

echo "version-agreement OK: $(printf '%s\n' "${SOURCES[@]}" | head -1 | cut -d= -f2)"
```

Wire it into the publish job **before** any artifact upload:

```yaml
- name: Verify version agreement
  run: bash scripts/check-version-agreement.sh "${{ inputs.version }}"
  env:
    GITHUB_REF: ${{ github.ref }}
```

Exit codes: `0` agree, `1` mismatch (prints all sources), `2` insufficient
sources. Never replace this with an ad-hoc `grep` — fragile `grep`s have
historically passed mismatched majors.

## Acceptance

- [ ] The implementation satisfies the `08 — Versioning` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](readme.md) for sibling specs and cross-references.
