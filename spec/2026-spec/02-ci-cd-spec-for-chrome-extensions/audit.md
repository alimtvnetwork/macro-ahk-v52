# Gap Analysis — CI/CD Spec For Chrome Extensions

> Audit of `spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/README.md`
> against the bar: **"hand this folder + an extension folder to any AI; it
> must ship a working release with zero guesswork."**
>
> Scoring: each axis 0–100. 100 = AI cannot fail. <70 = blocking gap.
>
> **Overall AI-Proof Score: 62 / 100** — usable, but six blocking gaps (G1, G2,
> G4, G6, G7, G9) will cause a generic AI to ship a broken pipeline on first
> try. Fix those six and the score jumps to ~90.

---

## Step 1 — Inventory what the spec already nails (baseline)

| Area | Score | Notes |
|------|-------|-------|
| Workflow trigger matrix (§5, §6) | 92 | `release:` event called out — rare and correct. |
| Exit-code contract (§3) | 95 | Fixed table; AI cannot drift. |
| Zip naming (§13) | 90 | Unambiguous: `<slug>-<version>.zip`, no leading `v`. |
| `.gitignore` enforcement (§26, §27) | 95 | Strict, with a CI gate one-liner. |
| Matrix discovery of extensions (§11, §22, §23) | 88 | `jq` + `find` pattern is copy-pasteable. |
| README template (§30) | 85 | Verbatim block; AI just substitutes `<owner>/<repo>`. |

Baseline contribution: **strong**. The gaps below are about what is *missing*
or *ambiguous*, not what is wrong.

---

## Step 2 — G1 ✅ PATCHED 2026-06-04 — `OWNER`/`REPO` resolution waterfall

§18 and §19 require `OWNER` and `REPO` env vars (`${OWNER:?}`) but the spec
never tells the AI **where they come from**.

- **Failure mode**: AI hard-codes the repo it sees in the current sandbox (e.g.
  `acme/project`) into `install.sh`, breaking it for every fork and rename.
- **Fix**: add §2a "Owner/Repo resolution" with priority order:
  1. `--owner`/`--repo` CLI flags.
  2. `GITHUB_REPOSITORY` env (set by Actions).
  3. `git remote get-url origin` parsed regex `github.com[:/]([^/]+)/([^/.]+)`.
  4. Hard fail with exit 3 if none resolve. **Never** hard-code.

---

## Step 3 — G2 ✅ PATCHED 2026-06-04 — SHA-256 verification wired into §17a + §18 + §19

§2 step 5 says "Verify SHA-256 against `checksums.txt`". §18's example
download script **does not implement this**. §17 ships `checksums.txt` but
§19's installer never reads it.

- **Failure mode**: AI ships an installer that silently accepts tampered ZIPs.
- **Fix**: append a `verify_sha256()` bash function + PowerShell equivalent to
  §18 and §19, with exit code `6` on mismatch (currently `6` is reserved only
  for "extraction failed" — broaden it or add `7`).

---

## Step 4 — G3 ✅ PATCHED 2026-06-04 — Version-agreement check has a reference script

§14 said "all four sources must agree before publishing — fail the build
otherwise" but provided **no script**, so a copy-paste AI would either skip the
check or invent a fragile `grep` that silently passes mismatched majors.

- **Root cause**: principle stated, implementation omitted.
- **Failure mode**: published a release where `manifest.version` ≠ tag, breaking
  Chrome auto-update because the CRX version did not match the listing.
- **Fix applied**: added §14a "Reference implementation:
  `scripts/check-version-agreement.sh`" — a copy-paste bash script that
  compares the `workflow_dispatch` input, the tag ref, the branch ref, and
  every discovered `manifest.json` `version`, exiting `1` on disagreement and
  `2` on insufficient sources. Includes the exact `yaml` step to wire it into
  the publish job before any artifact upload.
- **Time**: ~8 min.


---

## Step 5 — G4 ✅ PATCHED 2026-06-04 — `PREV_TAG` resolution is deterministic

§16 says "Exclude the current tag when picking PREV_TAG" — true, but the
common AI mistake is using `git describe --tags --abbrev=0` which **includes**
the current tag when run after tagging.

- **Failure mode**: empty release notes on every release because the computed
  range becomes `vX.Y.Z..vX.Y.Z`.
- **Root cause**: the original spec stated the principle but did not provide a
  copy-paste command, so generic implementations default to `git describe`.
- **Fix applied**: §16 now pins the exact current-tag exclusion command and the
  first-release fallback:
  ```bash
  PREV_TAG=$(git tag --list 'v*' --sort=-v:refname | grep -vFx "$VER" | head -1)
  ```
  If no prior `v*` tag exists, the range starts at the repository's first commit.
- **Time**: ~10 min.

---

## Step 6 — G5 ✅ PATCHED 2026-06-04 — Concurrency & cancellation rules missing

§22 shows `concurrency: { group: release-${{ github.ref }}, cancel-in-progress: false }`
but doesn't explain why. An AI optimizing for speed will flip
`cancel-in-progress: true`, which kills mid-upload releases and leaves
half-published tags.

- **Failure mode**: a second release run cancels the first after the GitHub
  Release exists but before every ZIP, installer, and checksum has uploaded;
  users see a valid tag with incomplete or inconsistent assets.
- **Root cause**: the original YAML had the correct flag but did not state the
  invariant, so a generic implementation can copy common CI advice and use
  `cancel-in-progress: true` everywhere.
- **Fix applied**: §24a now makes `cancel-in-progress: false` mandatory for
  every release/publish/sign/tag-mutating workflow, while allowing `true` only
  for non-publishing CI jobs.
- **Time**: ~6 min.

---

## Step 7 — G6 ✅ PATCHED 2026-06-04 — `GITHUB_TOKEN` vs. PAT trigger rule

§25 says "no third-party secrets required" but doesn't mention that the
default `GITHUB_TOKEN` **cannot trigger downstream workflows** (e.g. a `release`
event created via REST in the workflow will not re-trigger `release.yml`).

- **Failure mode**: AI writes a workflow that creates a release via REST with
  `GITHUB_TOKEN`, then expects a downstream `release` event workflow to publish
  assets. GitHub suppresses that trigger, so nothing publishes.
- **Fix**: added §25a with the deterministic rule: keep create+publish in the
  same workflow when using `GITHUB_TOKEN`; only use a fine-grained `RELEASE_PAT`
  with single-repo **Contents: Read and write** when split REST-created release
  workflows are truly required.

---

## Step 8 — G7 (BLOCKER, severity 75/100): No platform / shell-portability matrix ✅ PATCHED 2026-06-04

§18 is bash; §19 is bash; §3 mentions `install.ps1` but the PowerShell mirror
was described as "same flags, same exit codes" — that is **not enough** for an
AI. PowerShell's `$LASTEXITCODE`, `-ErrorAction Stop`, `Invoke-WebRequest`
streaming, and TLS 1.2 defaults all bite.

- **Fix applied**: full **§19a "PowerShell installer (full example,
  Windows-native)"** added — explicit TLS 1.2 pin, `$ErrorActionPreference =
  'Stop'`, `try/catch` mapping to exit codes 3/4/5/6 matching §3, sources
  `Resolve-Repo.ps1` (§2a) and `Verify-Sha256.ps1` (§17a), `Expand-Archive
  -Force`, temp-dir cleanup in `finally`, and a `windows-latest` CI self-test
  recipe.


---

## Step 9 — G8 (HIGH, severity 68/100): Missing rollback / yank guidance

What happens when a bad release ships? No section covers:
- Deleting the tag (`git push --delete origin vX.Y.Z`).
- Marking the GitHub Release as draft via REST.
- Whether `make_latest` auto-rolls back to the previous release (it does, but
  the AI doesn't know).

- **Fix**: new §36a "Rollback procedure" with exact commands.

---

## Step 10 — G9, G10 (BLOCKER + MEDIUM): Last two gaps

**G9 (BLOCKER, severity 80/100) — Action-version pinning** ✅ PATCHED 2026-06-04:
§15, §22 pin `@v4` / `@v2` major tags. Supply-chain best practice (and the only
AI-deterministic approach) is to pin to a **commit SHA**, e.g.
`softprops/action-gh-release@9d7c94cfd0a1f3ed45544c887983e9fa900f0564 # v2.2.1`.
Without this rule, an AI implementing this spec in 2027 may silently consume
`@v2` = `v2.99.0` with breaking changes, or worse, a retagged malicious commit.

- **Fix applied**: new **§22a "SHA-pin all third-party actions"** — every
  `uses:` entry MUST pin to a full 40-char commit SHA with a `# vX.Y.Z`
  trailing comment (including first-party `actions/*`). Ships with example
  pins for checkout/setup-node/upload-artifact/download-artifact/action-gh-release,
  a CI grep gate that fails on any floating ref, and a Dependabot
  (`github-actions` ecosystem) upgrade recipe.


**G10 (MEDIUM, severity 55/100) — No node/runner version policy**: §22 uses
`node-version: 20` inline. If the AI implementing this spec in 18 months
copies the YAML verbatim, it ships an EOL runtime.

- **Fix**: replace inline `20` with a top-level `env: { NODE_VERSION: '20' }`
  block and require this value to track the **active LTS** at implementation
  time.

---

## Failure-likelihood scorecard (factors that will trip a generic AI)

| # | Factor | Likelihood AI fails without fix | Severity | Gap ref |
|---|--------|-------------------------------:|---------:|--------:|
| 1 | Hard-codes owner/repo from sandbox | 95% | 90 | G1 |
| 2 | Skips SHA-256 verification | 90% | 85 | G2 |
| 3 | Empty release notes (PREV_TAG bug) | 80% | 80 | G4 |
| 4 | Uses default `GITHUB_TOKEN` for REST release → no re-trigger | 75% | 78 | G6 |
| 5 | PowerShell installer ships broken (TLS/exit codes) | 70% | 75 | G7 |
| 6 | Floating action major tags break in future | 60% | 80 | G9 |
| 7 | `cancel-in-progress: true` on publish job | 50% | 72 | G5 |
| 8 | Skips version-agreement enforcement | 55% | 70 | G3 |
| 9 | No rollback playbook → manual scramble | 40% | 68 | G8 |
| 10| Stale Node version copied verbatim | 35% | 55 | G10 |

**Composite AI-failure probability on first run, as-is: ~88%.**
After G1, G2, G4, G5, G6, G7, G9 are patched: **~14%**.

---

## Recommended patch order (priority)

1. **G1** — Owner/Repo resolution rule (15 min).
2. **G2** — Wire SHA-256 verify into §18/§19 (30 min).
3. **G6** — Token/PAT guidance in §25 (10 min).
4. **G9** — SHA-pinning rule in §22a (15 min).
5. **G7** — Full PowerShell installer in §19a (45 min).
6. **G4** — `PREV_TAG` exact command in §16 (10 min). ✅ PATCHED 2026-06-04
7. **G3**, **G5**, **G8**, **G10** — sweep in one follow-up pass. G3 and G5 are now patched.

After this patch pass, re-score: target **≥ 90/100 AI-proof**.
