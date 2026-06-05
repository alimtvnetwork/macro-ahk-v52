# 13 — Failure Handling, Checklists, Rollback & Troubleshooting

> Failure logging policy, pre-tag/post-workflow checklists, rollback playbook, adding extensions, troubleshooting.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §34. Failure & log handling

- All scripts log to `./logs/<script>-<UTC-ISO>.log` with full stderr.
- On failure, log includes: exit code, exact URL attempted, missing-asset
  filename, and the reason classifier (`AssetMissing`, `NetworkError`,
  `InvalidArchive`, `VersionMismatch`).
- Never silently retry — sequential fail-fast.


---

## §35. Pre-tag checklist

- [ ] `manifest.version` bumped on every changed extension.
- [ ] `CHANGELOG.md` has a new section dated today.
- [ ] All tests/lints green on `main`.
- [ ] No `*.zip` or `dist/` tracked by git.
- [ ] Release branch created: `release/vX.Y.Z`.


---

## §36. Post-workflow checklist

- [ ] Release page lists every expected ZIP + `install.sh` + `install.ps1` +
      `checksums.txt` + `VERSION.txt` + `RELEASE_NOTES.md`.
- [ ] `checksums.txt` SHA-256s match.
- [ ] One-line install commands from §30 actually work end-to-end.
- [ ] Probe job reported `200` for every asset URL.


---

## §36a. Rollback / yank playbook (mandatory)

A published GitHub Release is **immutable from the user's perspective** — `install.sh`/`install.ps1` may have already fetched the ZIP, browsers may have auto-updated, and mirrors/caches may serve stale assets for hours. Never delete a tag or release silently; always supersede.

**Decision tree:**

1. **Bad ZIP, never installed by users (< 15 min since publish, zero downloads in Insights):**
   - Delete the GitHub Release (keep the tag).
   - Delete the tag: `git push origin :refs/tags/vX.Y.Z`.
   - Fix → bump patch → re-tag `vX.Y.(Z+1)`. **Never reuse `vX.Y.Z`.**

2. **Bad ZIP, already downloaded / mirrored (default assumption):**
   - **Do not delete** the tag or release. Doing so breaks already-installed clients that re-probe `checksums.txt`.
   - Edit the release notes in place: prepend `> ⚠️ YANKED — see vX.Y.(Z+1)` and link forward.
   - Publish `vX.Y.(Z+1)` immediately with the fix. Release notes MUST contain a `## Supersedes` section naming the yanked tag and the one-line reason.
   - If the extension is published to Chrome Web Store, push the fixed version there in the same hour to stop the auto-update fan-out.

3. **Security incident (leaked secret, malicious dependency, RCE):**
   - Rotate the leaked secret **first** (before any git action) — deleting the release does not invalidate a leaked token.
   - Follow path (2) — supersede, never delete. Add `## Security` section to the new release notes with CVE/CWE if applicable.
   - Open a GitHub Security Advisory referencing both tags.

**Hard rules:**

- Never force-push over an existing tag (`git push -f origin vX.Y.Z`) — breaks checksum verification for every existing installer.
- Never reuse a version number — Chrome's auto-updater keys on `version` and silently ignores a re-published lower-or-equal version.
- Yank notice MUST stay at the top of the old release notes forever; do not "clean it up" later.
- Every supersede release MUST bump at least the patch component, even for a one-character fix.




---

## §37. Adding a second/third extension

1. Drop the new folder anywhere (e.g. `./my-new-ext/`) with a Manifest V3
   `manifest.json`.
2. Add an entry in the root `CHANGELOG.md`.
3. Commit — the matrix in §22 auto-discovers it.
4. Tag `vX.Y.Z` → both extensions ship side-by-side on the same Release page.

No workflow edits required.


---

## §38. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Release page has only "Source code" archives | `release.yml` didn't run, or ran on wrong ref | Re-dispatch with the exact `vX.Y.Z` tag |
| `install.sh` exits 4 | Asset name mismatch | Check zip naming (`<slug>-<ver>.zip`, no leading `v`) |
| `install.sh` exits 5 | GitHub API rate limit | Pass `--version vX.Y.Z` explicitly |
| Workflow never triggers on REST-API release | Missing `release:` trigger | Add `on: release: { types: [created, published] }` |
| CI fails "zip committed" | Binary tracked in git | `git rm --cached **/*.zip`, add to `.gitignore` |
| `manifest.version` ≠ tag | Forgot to bump | Bump manifest, re-tag |

## Acceptance

- [ ] The implementation satisfies the `13 — Failure Handling, Checklists, Rollback & Troubleshooting` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
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
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

