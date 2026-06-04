# Step 39 — CI Gates

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

The same storage regressions can pass code review if they look harmless: a CDN fallback for wasm, a direct `localStorage` read in background, a rewritten storage shape, a vague Code Red string, or a missing test. CI must block these before they reach users.

## Goal

Add fail-fast validation gates that enforce the storage, SQLite, error, and workflow rules from this spec.

## Required files

- `package.json` — validation scripts wired into prebuild/test chains.
- `.github/workflows/ci.yml` — must use bare `on: push:` with no branch/path filters.
- `scripts/check-sqlite-remote-fetch.mjs` — rejects remote sql.js/wasm/CDN patterns.
- `scripts/check-no-background-localstorage.mjs` — rejects background `localStorage`.
- `scripts/check-no-storage-pascalcase-rewrite.mjs` — rejects forbidden `StoredProject` casing migration.
- `scripts/check-code-red-diagnostics.mjs` — rejects incomplete Code Red diagnostics.
- `scripts/check-version-sync.mjs` — existing unified version check remains mandatory.
- `scripts/check-axios-version.mjs` — existing security gate remains mandatory.
- `scripts/__tests__/storage-and-ci-guards.test.mjs` — verifies the guards fail on fixtures.

No new runtime package is required. If a script needs file globs, reuse existing repo script patterns rather than adding a new dependency unless already present.

## Required package scripts

```json
{
  "scripts": {
    "check:sqlite-assets": "node scripts/check-sqlite-remote-fetch.mjs",
    "check:storage-local": "node scripts/check-no-background-localstorage.mjs && node scripts/check-no-storage-pascalcase-rewrite.mjs",
    "check:code-red": "node scripts/check-code-red-diagnostics.mjs",
    "check:storage-spec": "npm run check:sqlite-assets && npm run check:storage-local && npm run check:code-red",
    "prebuild": "npm run check:version-sync && npm run check:axios-version && npm run check:storage-spec"
  }
}
```

Use the package manager already used by the project when implementing. The contract is script names and order, not the literal command runner.

## CI workflow requirements

`.github/workflows/ci.yml` must keep this trigger shape:

```yaml
on:
  push:
  pull_request:
```

No `branches`, `paths`, or `paths-ignore` filters under `push`. This is mandatory because filtered push triggers silently skipped Lovable branch commits before.

CI job order:

1. install dependencies,
2. run version/security checks,
3. run storage/spec guards,
4. run lint/type/test commands already present in the repo,
5. build extension artifacts.

## Gate details

| Gate | Fails on | Reason |
|---|---|---|
| `check-sqlite-remote-fetch` | `cdn.jsdelivr`, `unpkg`, remote `sql-wasm.wasm`, wasm URL import fallback | `ForbiddenRemoteSqlJsAsset` |
| `check-no-background-localstorage` | `localStorage` under `src/background/**` | `ForbiddenBackgroundLocalStorage` |
| `check-no-storage-pascalcase-rewrite` | migration code rewriting stored project keys to PascalCase | `ForbiddenStoragePascalCaseRewrite` |
| `check-code-red-diagnostics` | Code Red text without required diagnostic fields | `IncompleteCodeRedDiagnostic` |
| workflow trigger test | filtered `on.push` | `FilteredCiPushTrigger` |
| test-with-features audit | changed source without matching test for storage/error feature | `MissingFeatureTest` |

## Fail-fast output format

Every script must print exact paths and a one-line reason:

```text
❌ Forbidden background localStorage usage
Path: src/background/example.ts
Missing: chrome.storage.local wrapper or SQLite manager call
Reason: ForbiddenBackgroundLocalStorage
ReasonDetail: MV3 background service workers cannot use page localStorage
```

Scripts exit with code `1` on failure and must not try to auto-fix files.

## Error model

| Failure | Reason | Surface |
|---|---|---|
| Guard detects forbidden pattern | gate-specific reason | CI/build failure |
| Guard script crashes | `ValidationScriptFailed` | CI/build failure with script path |
| Workflow trigger filtered | `FilteredCiPushTrigger` | CI test failure |
| Missing test for feature | `MissingFeatureTest` | CI/test failure |

Validation script errors must include `Path`, `Missing`, `Reason`, and `ReasonDetail` just like runtime Code Red logs.

## Acceptance

- [ ] Storage/spec guards are wired into the build validation chain.
- [ ] Guard tests prove each forbidden fixture fails.
- [ ] CI `push` trigger is unfiltered.
- [ ] CI fails on remote sql.js/wasm loading.
- [ ] CI fails on background `localStorage`.
- [ ] CI fails on PascalCase storage rewrites.
- [ ] CI fails on incomplete Code Red diagnostics.
- [ ] CI emits no build notifications.

## Cross-references

- [pipeline/04-validation-scripts.md](../../../pipeline/04-validation-scripts.md) — validation script conventions.
- [step-07](./step-07-required-packages-and-no-remote-fetch.md) — no remote fetch.
- [step-25](./step-25-chrome-storage-local-usage.md) — storage key preservation.
- [step-36](./step-36-code-red-logging-rule.md) — Code Red field requirements.
- [step-38](./step-38-testing.md) — tests that prove the gates work.
- Core memory: CI push trigger unfiltered; no CI notifications; test-with-features.
