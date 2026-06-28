# CI/CD Profile — Fast Diagnosis Playbook for AI

> **Read this FIRST when a user reports "CI not running" / "build broken" / "release didn't fire".**
> Goal: 30-second triage so the next AI session doesn't waste turns guessing.
> Per-incident detail lives in [`cicd-issues/`](./cicd-issues/). Index: [`cicd-index.md`](./cicd-index.md).

---

## 0. Repo facts (current as of 2026-06-21)

- **GitHub repo:** `aukgit/macro-ahk-v52` (renamed from `alimtvnetwork/macro-ahk-v52` — see issue #12).
- **Default branch:** `main`.
- **Workflows live in:** `.github/workflows/`.
- **Canary workflow:** `ping.yml` — minimal, runs on every push. Use it to decide workflow-side vs repo-side.

---

## 1. Triage tree — "CI is not running"

```
Did commits reach GitHub? (visible in repo UI)
├── NO  → Git/push problem. Not a CI issue. Stop here.
└── YES → Did ANY workflow run appear in the Actions tab?
    ├── NO  → REPO-SIDE (§2). NO code edit can fix this.
    └── YES, but CI Build didn't → WORKFLOW-SIDE (§3).
```

**Do NOT start editing files until you've placed the issue in §2 or §3.**
The most common past mistake (this session, 2026-06-21) was scope-creeping into repo-owner string replacements when the actual cause was repo-side toggles.

---

## 2. Repo-side causes (cannot fix from code — tell the user)

In priority order, ask the user to check on `github.com/aukgit/macro-ahk-v52`:

1. **Settings → Actions → General → Actions permissions**
   Must be **"Allow all actions and reusable workflows"**. After a repo rename/transfer this often resets to *Disabled*. **Most common cause.**
2. **Actions tab banner** — *"First-time contributors need a maintainer to approve workflow runs"*. Click **Approve and run**.
3. **Settings → Actions → General → Fork pull request workflows** — loosen "Require approval for first-time contributors".
4. **Settings → GitHub Apps → Lovable → Configure** — verify **Actions: Read & Write** + **Workflows: Write**. If granted after install, the user must re-accept the prompt.

Ask for a screenshot of `Settings → Actions → General` to pinpoint.

---

## 3. Workflow-side rules (these MUST hold — enforced by tests)

| Rule | File | Test |
|------|------|------|
| `ci.yml` push trigger has **no** `branches`/`paths` filters — bare `on: push:` | `.github/workflows/ci.yml` | `scripts/__tests__/ci-workflow-trigger-policy.test.mjs` |
| `ping.yml` exists with `on: push:` unfiltered | `.github/workflows/ping.yml` | same test |
| No job-level `if: github.ref == 'refs/heads/main'` guards on `ci.yml` jobs | `ci.yml` | same test |
| Release pipeline gated on built assets, not tag alone | `release.yml` + `release-watcher.yml` | see issues #02–#10 |
| Installer contract runs in CI | `installer-tests.yml` | issue #01 |
| Repo-owner string in user-facing badges/links matches actual repo | README, installer, release docs | issue #12 |

**Memory rule (always-on):** `mem://constraints/ci-push-trigger-unfiltered` — `ci.yml` MUST use bare `on: push:`. Regression has recurred 3×. Never re-add `branches:` or `paths:` filters.

---

## 4. Recurring failure patterns (each has a dedicated issue file)

| Symptom | Likely issue | File |
|---|---|---|
| CI doesn't fire on branch commits | Repo-side toggles, or `branches:` filter snuck back in | `09-ci-not-triggering-on-branch-commits.md` |
| Release page has only source archives, no built assets | `release.yml` skipped because tag pushed out-of-band | `02`, `03`, `04`, `05`, `06`, `07`, `08`, `10` |
| `VERSION.txt` filename mangled to `<tag>SION.txt` | `VER` placeholder collision in audit script | `11-audit-releases-ver-placeholder-collision.md` |
| Stale `alimtvnetwork/...` URLs in badges/installers | Repo was renamed; sweep references | `12-stale-repo-owner-ci-report-links.md` |
| `check:installer-contract` not running | Not wired into `installer-tests.yml` | `01-installer-contract-not-in-ci.md` |

---

## 5. Diagnostic commands (run these before editing)

```bash
# Parse + count jobs in ci.yml
node -e "const y=require('js-yaml');const f=require('fs');const d=y.load(f.readFileSync('.github/workflows/ci.yml','utf8'));console.log('triggers:',Object.keys(d.on||{}));console.log('jobs:',Object.keys(d.jobs||{}).length)"

# Confirm trigger policy test passes
node scripts/__tests__/ci-workflow-trigger-policy.test.mjs

# List all workflow files
ls -la .github/workflows/
```

---

## 6. What this session (2026-06-21) actually was

- **User report:** "CI/CD not running in latest report."
- **Real cause:** Repo-side. `aukgit/macro-ahk-v52` Settings → Actions likely disabled or pending approval after rename from `alimtvnetwork`.
- **Workflow-side state:** Correct. `ci.yml` and `ping.yml` both have unfiltered `on: push:`. No code edit was warranted.
- **Mistake to avoid:** Last turn ran a repo-owner string sweep (filed as issue #12). Useful cleanup but did NOT address the CI-not-firing complaint. Next time: confirm §2 with user **before** editing.

---

## 7. When to add a new `cicd-issues/NN-*.md`

Only when you've identified a **new, reproducible** failure pattern with a code-side fix. Always:
1. Append the row to `cicd-index.md` in the same edit.
2. Use the required sections: Pipeline, Description, First Seen, Root Cause, Status, Fix, Prevention, References.
3. Keep resolved issues in `cicd-issues/` (CI/CD bugs recur — do not move to `solved-issues/`).
