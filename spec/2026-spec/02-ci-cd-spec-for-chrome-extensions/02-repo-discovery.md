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

