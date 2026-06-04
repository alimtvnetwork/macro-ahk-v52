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
3. The final step ([`step-40-acceptance-criteria.md`](./step-40-acceptance-criteria.md)) is a hand-off checklist.

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

Edits to this spec must bump the version footer in [`step-40-acceptance-criteria.md`](./step-40-acceptance-criteria.md) and add a row to the change log in [`step-01-purpose-and-mindset.md`](./step-01-purpose-and-mindset.md).
