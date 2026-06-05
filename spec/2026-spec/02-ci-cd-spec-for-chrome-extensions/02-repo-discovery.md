# 02 — Repo Discovery & Owner/Repo Resolution

> How any agent reads the host repo and resolves owner/repo without hard-coding.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §1. Read the host repo

Before doing anything, the implementing AI must enumerate:

- `./.github/workflows/*.yml` — existing pipelines.
- `./scripts/**` — installer/download/probe helpers.
- `./package.json` (or equivalent) — scripts and dependencies.
- Any folder containing a `manifest.json` with `"manifest_version": 3` — these
  are **extension folders**.

If a workflow already exists, treat this spec as **additive**: extend, don't
replace.


---

## §2a. Owner/Repo resolution (MANDATORY, never hard-code)

Every script (`download-extension.*`, `install.*`, `probe-*`) and every
workflow step that talks to GitHub MUST resolve `OWNER` and `REPO` through
this exact waterfall — in this order, fail-fast, no retry:

1. **Explicit CLI flags** — `--owner <o> --repo <r>` (highest precedence).
2. **`GITHUB_REPOSITORY` env var** — set automatically inside GitHub Actions
   as `owner/repo`; split on `/`.
3. **`git remote get-url origin`** — parse with regex
   `github\.com[:/]([^/]+)/([^/.]+?)(\.git)?$`; group 1 = owner, group 2 = repo.
4. **Fail with exit code `3`** and the message
   `owner/repo unresolved: pass --owner/--repo, set GITHUB_REPOSITORY, or run inside a git checkout with an origin remote`.

Hard-coding any literal `owner/repo` string anywhere in `scripts/**` or
`.github/workflows/**` is a **CI-blocking violation**. Enforce with a grep
gate in `ci.yml`:

```bash
if grep -RInE 'github\.com[:/][A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+' scripts/ .github/workflows/ \
     | grep -vE '(<owner>|<repo>|\$\{?OWNER\}?|\$\{?REPO\}?|\$\{?GITHUB_REPOSITORY\}?)'; then
  echo "Hard-coded owner/repo detected — use the §2a waterfall." >&2; exit 1
fi
```

Reference bash helper (drop into `scripts/lib/resolve-repo.sh`):

```bash
resolve_owner_repo() {                # sets OWNER, REPO; exits 3 on failure
  if [[ -n "${OWNER:-}" && -n "${REPO:-}" ]]; then return 0; fi
  if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    OWNER="${GITHUB_REPOSITORY%%/*}"; REPO="${GITHUB_REPOSITORY##*/}"; return 0
  fi
  local url; url=$(git remote get-url origin 2>/dev/null) || true
  if [[ "$url" =~ github\.com[:/]([^/]+)/([^/.]+?)(\.git)?$ ]]; then
    OWNER="${BASH_REMATCH[1]}"; REPO="${BASH_REMATCH[2]}"; return 0
  fi
  echo "owner/repo unresolved: pass --owner/--repo, set GITHUB_REPOSITORY, or run inside a git checkout with an origin remote" >&2
  exit 3
}
```

PowerShell mirror (`scripts/lib/Resolve-Repo.ps1`):

```powershell
function Resolve-OwnerRepo {
  if ($env:OWNER -and $env:REPO) { return @($env:OWNER, $env:REPO) }
  if ($env:GITHUB_REPOSITORY) {
    $p = $env:GITHUB_REPOSITORY -split '/', 2
    return @($p[0], $p[1])
  }
  $url = (git remote get-url origin 2>$null)
  if ($url -match 'github\.com[:/]([^/]+)/([^/.]+?)(\.git)?$') {
    return @($Matches[1], $Matches[2])
  }
  Write-Error 'owner/repo unresolved: pass -Owner/-Repo, set GITHUB_REPOSITORY, or run inside a git checkout with an origin remote'
  exit 3
}
```

§18 and §19 examples MUST source these helpers instead of `${OWNER:?}`.

## Acceptance

- [ ] The implementation satisfies the `02 — Repo Discovery & Owner/Repo Resolution` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
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
