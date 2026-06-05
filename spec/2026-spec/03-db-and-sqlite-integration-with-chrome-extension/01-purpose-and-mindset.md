# Step 01 — Purpose and Mindset

> Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./readme.md). See [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full outline.

## Goal

Establish the **"hand to any AI" mindset**: every other file in this folder must be readable in isolation by an agent that has never seen this project, and the agent must be able to implement a production-grade storage layer (SQLite + IndexedDB + `chrome.storage.local` + `localStorage`) for **any** Manifest V3 Chrome extension without asking follow-up questions.

## Why this spec exists

Browser extensions routinely lose user data because authors:

1. Pick the wrong storage tier (e.g. logs in `localStorage`, blobs in `chrome.storage.local`).
2. Bind `undefined` to SQLite and crash silently in the service worker.
3. Fetch `sql-wasm.wasm` from a CDN, which is blocked by MV3 CSP.
4. Skip schema versioning, then ship a breaking migration with no rollback.
5. Swallow storage errors instead of surfacing them in an Errors panel.

This spec encodes the **defaults that prevent each failure**, with a copy-pasteable code sample for every decision.

## Audience

| Reader | What they should do |
|---|---|
| New AI agent (no repo context) | Read `README.md`, then `01-forty-planning-steps.md`, then each `step-NN-*.md` in order. Stop and implement when the agent has enough to write the storage layer. |
| Human reviewer | Use the **Acceptance** block at the bottom of each step file as a PR checklist. |
| Maintainer of this spec | Update the change log below on every edit. Bump the version in [`step-40-acceptance-criteria.md`](./40-acceptance-criteria.md). |

## The "hand to any AI" mindset — rules

1. **No implicit context.** Every step names the exact npm package, the exact file path under `src/`, and the exact `chrome.*` API used. No "you know what I mean."
2. **Copy-pasteable samples only.** If a sample needs an import, list the import. If it needs a Vite config tweak, show the diff. No prose-only steps.
3. **One decision per step.** A step that says "use SQLite *or* IndexedDB depending on…" is split into two steps with a flowchart in step 04.
4. **Errors are first-class.** Every step that touches storage names: the error class (step 31), the logger tag (step 32), the user-visible surface (step 33 or 34), and the acceptance test (step 38).
5. **No remote runtime fetches.** `sql-wasm.wasm` and any binary asset must ship inside the extension `dist/` — never fetched from a CDN at runtime (step 7).
6. **No `undefined` to SQLite, ever.** All binds go through the guards in step 15 and the Proxy net in step 16. This is not optional.
7. **No logs in `localStorage`.** Logs go to the SQLite session-log table (step 35) or OPFS. `localStorage` is reserved for bounded UI-only state (step 27).
8. **Test-with-features.** Every implementation step has a matching vitest case in step 38. A PR that adds storage code without a test is rejected by the CI gate in step 39.

## Out of scope

- Sync across devices (no Supabase, no remote DB — see Core memory "No Supabase").
- Encryption at rest (left to the implementer; this spec assumes browser-level isolation).
- Native messaging hosts.

## Change log

| Version | Summary |
|---|---|
| 0.1.0 | Initial scaffold (README + 40 stubs). |
| 0.2.0 | Step 01 + Step 02 fully written. |

## Acceptance

- [ ] A new AI agent given only this folder can name the four storage tiers and the rule for choosing between them without reading source code.
- [ ] Every subsequent step file in this folder follows the eight "hand to any AI" rules above.
- [ ] The change log is updated on every edit.

## Cross-references

- Next: [`step-02-four-tier-storage-decision-matrix.md`](./02-four-tier-storage-decision-matrix.md)
- Hand-off checklist: [`step-40-acceptance-criteria.md`](./40-acceptance-criteria.md)

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Data storage layers](mem://architecture/data-storage-layers) for the authoritative rule backing the MUST/SHALL statements in this file.
