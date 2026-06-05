# 10 — Permissions, Secrets & Token Policy

> GITHUB_TOKEN scopes, PAT-vs-token trigger rule, secret handling.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §25. Permissions & secrets

- Top-level workflow permissions MUST be `contents: read`; only the publish job
  elevates to `contents: write` (plus `id-token: write` / `attestations: write`
  only when provenance or keyless signing is enabled).
- No third-party secrets are required for the default flow. Only add:
  - `CWS_*` (Chrome Web Store) if auto-publishing.
  - `MINISIGN_SECRET_KEY` if signing installers.
- Names must be generic — do **not** hard-code repo-specific secret names.


---

## §25a. GitHub token vs. PAT trigger rule (MANDATORY)

Use the built-in `GITHUB_TOKEN` only for the default safe flow where the release
workflow is triggered directly by one of §5's supported events (`push` to
`release/**`, `v*` tag push, `release`, or `workflow_dispatch`) and then uploads
assets in the same workflow run.

If any workflow creates a GitHub Release through REST, `gh release create`, or a
third-party action and expects a **separate downstream workflow** to run from the
resulting `release` event, `GITHUB_TOKEN` is forbidden for that creation step.
GitHub suppresses workflow-triggering events created by `GITHUB_TOKEN`; the
downstream `release.yml` will not run.

For REST-created releases, use exactly one of these deterministic designs:

1. **Recommended:** do not split creation and publishing. Keep release creation,
   artifact upload, checksums, and installer upload inside the same `release.yml`
   run using `GITHUB_TOKEN`, top-level `contents: read`, and publish-job-only
   elevation to `contents: write`.
2. **Allowed only when split workflows are required:** create the release with a
   fine-grained PAT stored as `RELEASE_PAT`, scoped to the single repository with
   **Contents: Read and write**. Use `RELEASE_PAT` only for the REST release
   creation step; all other steps should continue using `GITHUB_TOKEN`.

Never name this secret after a repository, user, or organization. Never use a
classic broad PAT unless fine-grained tokens are unavailable.

## Acceptance

- [ ] The implementation satisfies the `10 — Permissions, Secrets & Token Policy` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
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
