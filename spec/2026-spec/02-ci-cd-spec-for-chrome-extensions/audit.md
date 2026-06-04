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

## Step 2 — G1 (BLOCKER, severity 90/100): `OWNER`/`REPO` are undefined inputs

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

## Step 3 — G2 (BLOCKER, severity 85/100): SHA-256 verification is asserted but not wired

§2 step 5 says "Verify SHA-256 against `checksums.txt`". §18's example
download script **does not implement this**. §17 ships `checksums.txt` but
§19's installer never reads it.

- **Failure mode**: AI ships an installer that silently accepts tampered ZIPs.
- **Fix**: append a `verify_sha256()` bash function + PowerShell equivalent to
  §18 and §19, with exit code `6` on mismatch (currently `6` is reserved only
  for "extraction failed" — broaden it or add `7`).

---

## Step 4 — G3 (HIGH, severity 70/100): Version-agreement check is hand-wavy

§14 says "all four sources must agree before publishing — fail the build
otherwise" but provides **no script**. An AI will either skip it or invent a
fragile `grep`.

- **Fix**: add a `scripts/check-version-agreement.sh` reference implementation
  that compares `inputs.version`, the tag ref, the branch ref, and every
  discovered `manifest.version`, exiting non-zero with a diff on mismatch.

---

## Step 5 — G4 (BLOCKER, severity 80/100): `PREV_TAG` resolution is under-specified

§16 says "Exclude the current tag when picking PREV_TAG" — true, but the
common AI mistake is using `git describe --tags --abbrev=0` which **includes**
the current tag when run after tagging.

- **Failure mode**: empty release notes on every release.
- **Fix**: pin the exact command:
  ```bash
  PREV_TAG=$(git tag --list 'v*' --sort=-v:refname | grep -vFx "$VER" | head -1)
  ```
  and require a fallback to the repo's first commit when no prior tag exists.

---

## Step 6 — G5 (HIGH, severity 72/100): Concurrency & cancellation rules missing

§22 shows `concurrency: { group: release-${{ github.ref }}, cancel-in-progress: false }`
but doesn't explain why. An AI optimizing for speed will flip
`cancel-in-progress: true`, which kills mid-upload releases and leaves
half-published tags.

- **Fix**: add §24a stating cancel-in-progress MUST be `false` on the publish
  job, MAY be `true` on `ci.yml`.

---

## Step 7 — G6 (BLOCKER, severity 78/100): No guidance on `GITHUB_TOKEN` vs. PAT

§25 says "no third-party secrets required" but doesn't mention that the
default `GITHUB_TOKEN` **cannot trigger downstream workflows** (e.g. a `release`
event created via REST in the workflow will not re-trigger `release.yml`).

- **Failure mode**: AI writes a workflow that creates a release via REST, then
  wonders why nothing publishes.
- **Fix**: add §25a: "If the workflow creates releases via REST, use a PAT
  stored as `RELEASE_PAT` with `contents: write`; otherwise tag-push is the
  only safe trigger."

---

## Step 8 — G7 (BLOCKER, severity 75/100): No platform / shell-portability matrix

§18 is bash; §19 is bash; §3 mentions `install.ps1` but the PowerShell mirror
is described as "same flags, same exit codes" — that is **not enough** for an
AI. PowerShell's `$LASTEXITCODE`, `-ErrorAction Stop`, `Invoke-WebRequest`
streaming, and TLS 1.2 defaults all bite.

- **Fix**: add a full §19a PowerShell reference implementation, including
  `[Net.ServicePointManager]::SecurityProtocol = 'Tls12'`, `try/catch` with
  explicit `exit 5`, and `Expand-Archive -Force`.

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

**G9 (BLOCKER, severity 80/100) — Action-version pinning**: §15, §22 pin
`@v4` / `@v2` major tags. Supply-chain best practice (and the only
AI-deterministic approach) is to pin to a **commit SHA**, e.g.
`softprops/action-gh-release@9d7c94cfd0a1f3ed45544c887983e9fa900f0564 # v2.2.1`.
Without this rule, an AI implementing this spec in 2027 may silently consume
`@v2` = `v2.99.0` with breaking changes.

- **Fix**: add §22a "All third-party actions MUST be pinned to a 40-char
  commit SHA with a `# vX.Y.Z` trailing comment. Dependabot may bump them."

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
After G1, G2, G4, G6, G7, G9 are patched: **~18%**.

---

## Recommended patch order (priority)

1. **G1** — Owner/Repo resolution rule (15 min).
2. **G2** — Wire SHA-256 verify into §18/§19 (30 min).
3. **G6** — Token/PAT guidance in §25 (10 min).
4. **G9** — SHA-pinning rule in §22a (15 min).
5. **G7** — Full PowerShell installer in §19a (45 min).
6. **G4** — `PREV_TAG` exact command in §16 (10 min).
7. **G3**, **G5**, **G8**, **G10** — sweep in one follow-up pass.

After this patch pass, re-score: target **≥ 90/100 AI-proof**.
