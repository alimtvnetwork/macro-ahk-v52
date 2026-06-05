# 06 — Spec Location & Extension Folder Shape

> Where this spec lives, purpose statement, MV3 folder shape, and relative-path layout.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §7. Target spec location

`./spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/` (this folder).
This dated 2026 spec folder is the canonical content location for the generic
Chrome-extension CI/CD spec. The `spec/12-cicd-pipeline-workflows/` module must
merge it by linking/indexing it, not by moving or duplicating the content.


---

## §8. Purpose statement

> Given this folder and any folder containing a Manifest V3 `manifest.json`,
> an AI agent must be able to (a) wire a CI workflow that lints/tests, (b)
> wire a release workflow that builds, packages, and publishes downloadable
> ZIPs to a GitHub Release, and (c) publish installer scripts on the release
> page — all without committing any binary artifact to the repository.


---

## §9. Generic extension folder shape

```
<ext-root>/
├── manifest.json          # required, Manifest V3
├── icons/                 # optional
├── popup.html             # optional
├── background.{js,ts}     # optional
├── content/               # optional
├── src/ or dist/          # build inputs/outputs
└── package.json           # optional, with `build` script if compiled
```

Detection rule: any directory whose `manifest.json` parses with
`manifest_version === 3` is an extension folder.


---

## §10. Manifest V3 requirements

Required keys: `manifest_version` (=3), `name`, `version` (semver `X.Y.Z`),
`description`, plus at least one of `action`, `background`, `content_scripts`.
`icons.128` recommended for the Chrome Web Store.


---

## §21. Relative-path layout

```
./
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── scripts/
│   ├── install.sh
│   ├── install.ps1
│   ├── download-extension.sh
│   ├── download-extension.ps1
│   └── probe-siblings.sh
├── <extension-1>/manifest.json
├── <extension-2>/manifest.json        # any number of siblings
├── release-assets/                    # ❌ git-ignored, build output
└── CHANGELOG.md
```

## Acceptance

- [ ] The implementation satisfies the `06 — Spec Location & Extension Folder Shape` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
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
