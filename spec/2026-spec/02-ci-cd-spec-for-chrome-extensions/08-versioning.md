# 08 — Versioning

> How version is derived, propagated, and validated across the pipeline.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

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
