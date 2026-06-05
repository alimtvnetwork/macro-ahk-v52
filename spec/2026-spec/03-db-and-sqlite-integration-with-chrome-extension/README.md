# 03 — DB & SQLite Integration with Chrome Extension

> Generic, AI-implementable spec for using **SQLite (sql.js)**, **IndexedDB**, **localStorage**, and **chrome.storage.local** inside any Manifest V3 Chrome extension — with explicit error-management contracts.

This folder is written so a blind AI agent (no prior context) can read it top-to-bottom and reproduce a production-grade storage layer for any Chrome extension. It mirrors the pattern used in this repo (see `src/background/db-manager.ts`, `src/background/sqlite-bind-safety.ts`, `src/background/injection-cache.ts`) but is parametrized so it is **not** tied to this product.

## How to read this folder

1. Start with [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) — the ordered outline of all forty steps.
2. Each `step-NN-*.md` file expands one step in detail, with:
   - **Goal** — one sentence.
   - **Required packages / files** — exact npm names, exact paths.
   - **Code sample** — copy-pasteable TypeScript.
   - **Error model** — which error type, which logger tag, what the user sees.
   - **Acceptance** — testable conditions.
3. The final step ([`step-40-acceptance-criteria.md`](./40-acceptance-criteria.md)) is a hand-off checklist.

## Scope

| Layer | Quota | Persistence | Typical use |
|---|---|---|---|
| SQLite (sql.js + wasm) | Unlimited* | Survives browser cleanup if persisted to OPFS or `chrome.storage.local` | Relational data, logs, audit trails, joins |
| IndexedDB | GBs | Removed by browser cleanup | Large blobs, cached script code, namespace blobs |
| `chrome.storage.local` | 10 MB (or Unlimited with permission) | Survives browser cleanup | Small JSON config, cross-context state |
| `localStorage` | ~5 MB | Removed by browser cleanup | Bounded UI-only state. **Never** logs/tokens. |

*Subject to disk space and the persistence backing chosen (see step 17).

## Companion folders

- [`../02-ci-cd-spec-for-chrome-extensions/`](../02-ci-cd-spec-for-chrome-extensions/) — packaging/release pipeline for extensions written against this spec.
- [`../01-prompt-spec/`](../01-prompt-spec/) — prompt authoring rules.

## Versioning

Edits to this spec must bump the version footer in [`step-40-acceptance-criteria.md`](./40-acceptance-criteria.md) and add a row to the change log in [`step-01-purpose-and-mindset.md`](./01-purpose-and-mindset.md).

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, quotas, retention, byte caps, chunk sizes) to a named constant declared in `spec/2026-spec/01-prompt-spec/reference/05-runtime-defaults.md` or a local `reference/*-defaults.md` file. Inline literals are rejected.
- **MUST** keep `chrome.storage.local` per-key payloads ≤ `CHROME_STORAGE_LOCAL_PER_KEY_BYTES` (8 192) and aggregate writes ≤ `CHROME_STORAGE_LOCAL_TOTAL_BYTES` (10 485 760). Larger payloads route to IndexedDB or SQLite.
- **MUST** await `navigator.storage.persist()` once at boot, log the resolved boolean via `RiseupAsiaMacroExt.Logger.info`, and surface `{ persisted, usage, quota }` in diagnostics — no fire-and-forget.
- **MUST** classify every DB failure with a stable `Reason` code (see `31-error-model.md`) plus `ReasonDetail`, and route it through `Logger.error` — never `console.error` and never silently swallow.

## Pitfalls / Counter-examples

- ❌ `catch (e) { /* ignored */ }` around `db.exec()` — masks corruption; the error-swallow audit (`public/error-swallow-audit.json`) will fail CI. ✅ Re-throw after `Logger.error` with full SQL + bind context.
- ❌ Calling `db.run` on a new-tab/blank URL because the auto-injector did not gate the URL. ✅ Use `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` before scheduling any DB-bound work.
- ❌ Hardcoding `Asia/Kuala_Lumpur` (or any zone) when persisting timestamps. ✅ Store `Date.now()` as UTC ms; render with `Intl.DateTimeFormat(undefined, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })`.
- ❌ Treating `chrome.storage.local.set` as synchronous and reading back in the next line. ✅ Always `await` the Promise (MV3) and verify the write via `storage.local.get` in tests.
- ❌ Retrying a failed migration with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy` — surface a Boot Failure Banner (`34-boot-failure-banner.md`) and require user action.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

## Acceptance

- [ ] Every sibling `*.md` listed below this index also declares its own `## Acceptance` block (verified by `scripts/audit/check-acceptance.mjs`).
- [ ] All relative links in this file resolve (verified by `scripts/audit/check-dangling-links.mjs`).
- [ ] No operational numeric constant is hardcoded here without binding to `reference/05-runtime-defaults.md` (verified by `scripts/audit/check-must-constants.mjs --strict`).
- [ ] Composite audit score for this folder is `100 / 100` (verified by `scripts/audit/audit-scan.py`).

