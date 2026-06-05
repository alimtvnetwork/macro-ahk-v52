# Step 21 — IndexedDB When To Choose

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Define the **exact decision rule** for when to reach for IndexedDB instead of SQLite (Steps 09–20), `chrome.storage.local` (Steps 25–26), or `localStorage` (Step 27), so the four-tier matrix from Step 02 is enforced consistently.

## Root cause this prevents

The recurring failure mode is **storage-tier sprawl**: feature code defaults to whichever API the author touched last, leading to bytes-shaped data in `chrome.storage.local` (quota blowups), structured query data in `localStorage` (no indexes, JSON re-parse cost), and ephemeral caches in SQLite (forced flushes that compete with real writes). This step pins down the IndexedDB lane so the other tiers do not get misused.

## Decision rule

Pick IndexedDB **only** when **all** of the following are true:

1. The data is **page-side / content-script side** state that the MV3 service worker should not own.
2. The payload is either **opaque bytes** (script chunks, compiled WASM cache, ZIP blobs) or **structured records ≥ 64 KiB** that would push `chrome.storage.local` toward its 10 MiB cap.
3. Access is **per-origin** and does not need to be shared with the background SW.
4. The data is a **rebuildable cache or a per-tab session**, never the source of truth.

If any rule fails, route the data elsewhere:

| If… | Use instead |
|---|---|
| Source of truth shared across tabs | SQLite via background DB (Steps 10–14) |
| Small key/value, < 8 KiB, shared with SW | `chrome.storage.local` (Step 25) |
| Tiny per-tab UI flag, synchronous read OK | `localStorage` (Step 27) |
| Tabular, multi-row, needs SQL joins | SQLite (Steps 11–20) |

## Allowed IndexedDB use cases (canonical list)

- **Injection cache** — compiled / fetched script bundles keyed by build hash (Step 23).
- **Prompt dual-cache** — `JsonCopy` + `HtmlCopy` blobs per prompt (see memory: `mem://features/prompt-management`).
- **Backup ZIP staging** — temporary bytes during export when payload may exceed `chrome.storage.local` quota.
- **Diagnostic log overflow** — only when SQLite logging table (Step 35) is at its retention cap.

Anything not on this list MUST be discussed before adding a new object store.

## Required files

- `src/shared/storage-tier.ts` — exported helper `pickStorageTier(payload, intent)` returning the chosen tier name.
- `src/shared/storage-tier.test.ts` — unit tests covering the decision matrix.
- `src/background/idb/idb-policy.ts` — re-exports `pickStorageTier` for background callers; throws if SQLite-eligible data is routed to IDB.

## Copy-pasteable TypeScript sample

```ts
export type StorageTier = "sqlite" | "indexeddb" | "chrome-storage-local" | "localstorage";

export type StoragePayloadHint = {
  readonly ApproxByteLength: number;
  readonly IsOpaqueBytes: boolean;
  readonly IsSourceOfTruth: boolean;
  readonly NeedsCrossContextShare: boolean;
  readonly NeedsSqlQueries: boolean;
  readonly Scope: "Background" | "ContentScript" | "PerTab";
};

export function pickStorageTier(hint: StoragePayloadHint): StorageTier {
  if (hint.NeedsSqlQueries || hint.IsSourceOfTruth) return "sqlite";
  if (hint.Scope === "PerTab" && hint.ApproxByteLength < 4_096) return "localstorage";
  if (hint.IsOpaqueBytes || hint.ApproxByteLength >= 64 * 1024) return "indexeddb";
  if (hint.NeedsCrossContextShare && hint.ApproxByteLength < 8 * 1024) return "chrome-storage-local";
  return "indexeddb";
}
```

The function is **pure** and synchronous so it can be unit-tested without a browser environment.

## Error model

| Failure | Logger tag | User-visible surface | Recovery |
|---|---|---|---|
| Caller passes SQLite-eligible data to IDB wrapper | `[idb-policy] tier mismatch` Code-Red | Errors panel row naming the call site | Throw immediately; do not silently write to IDB |
| Payload `ApproxByteLength` is `NaN` or negative | `[storage-tier] invalid hint` Code-Red | None (developer-only) | Throw; bug in caller |
| Tier function called from inside SQLite migration | `[storage-tier] called from migration` warning | None | Migrations must never branch on tier; refactor caller |

All hard failures MUST include `Path`, `Missing`, `Reason`, and `ReasonDetail` per `mem://standards/error-logging-requirements.md`.

## Acceptance

- [ ] `pickStorageTier()` has unit tests for every row in the decision rule.
- [ ] `rg "indexedDB\.open\(" src/` returns only call sites inside `src/**/idb/**` files.
- [ ] No IndexedDB call site stores a value that is also tracked as SQLite source-of-truth.
- [ ] `idb-policy.ts` throws Code-Red when `pickStorageTier()` would return `"sqlite"`.
- [ ] Step 02 decision matrix and this step agree on every cell (cross-checked in review).

## See also

- [step-02](./02-four-tier-storage-decision-matrix.md) — Master four-tier matrix
- [step-22](./22-indexeddb-wrapper-pattern.md) — Wrapper implementation
- [step-23](./23-indexeddb-injection-cache.md) — Canonical IDB consumer
- [step-25](./25-chrome-storage-local-usage.md) — When `chrome.storage.local` wins instead

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
