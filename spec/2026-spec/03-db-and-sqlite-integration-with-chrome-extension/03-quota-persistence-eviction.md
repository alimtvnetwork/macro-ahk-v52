# Step 03 — Quota, Persistence, and Eviction

> Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md). Previous: [`step-02-four-tier-storage-decision-matrix.md`](./02-four-tier-storage-decision-matrix.md). Next: [`step-04-choose-a-tier-flowchart.md`](./04-choose-a-tier-flowchart.md).

## Goal

Make every storage write predictable by measuring size, checking persistence support, handling browser eviction rules, and routing quota failures into the shared error-management flow.

## Root-cause reasoning from the current codebase

The current codebase already shows why this step must exist:

1. `src/hooks/use-step-library.ts` stores exported SQL bytes in `localStorage` and classifies `StorageRead` / `StorageWrite` failures. That is useful as a UI-facing error pattern, but it is **not** the durable MV3 production pattern for larger data because `localStorage` is synchronous, DOM-only, small, and eviction-prone.
2. `src/hooks/use-storage-surfaces.ts` exposes storage surfaces through message handlers, which proves storage needs to be inspected and surfaced in the UI rather than hidden behind silent catches.
3. `spec/audit/blind-ai-implementation-audit/steps/step-102.md` confirms there is no shipped `navigator.storage.getDirectory()` / OPFS implementation in `src/`. Therefore this spec may describe OPFS as a valid future large-SQLite backend, but an implementer must not claim OPFS is already active unless the code actually contains the file-backed implementation from step 17.
4. The project memory requires Code Red path logging and the mandatory failure-log shape. Quota and eviction failures must therefore include the exact key/path/store, attempted bytes, limit/estimate if known, and the reason code.

## Required packages and exact file paths

No new package is required for this step. Use browser APIs plus the project logger.

| Need | API / package | File to create or update |
|---|---|---|
| Size estimation | `Blob`, `TextEncoder` | `src/background/storage/storage-size.ts` |
| Quota and persistence checks | `navigator.storage.estimate()`, `navigator.storage.persist()`, `navigator.storage.persisted()` | `src/background/storage/storage-quota.ts` |
| `chrome.storage.local` byte guard | `chrome.storage.local` | `src/background/storage/chrome-storage-safe.ts` |
| IndexedDB quota-safe write wrapper | Native `indexedDB` or `idb` from step 7 | `src/background/storage/indexeddb-safe.ts` |
| SQLite export write guard | `sql.js` database export from step 10 | `src/background/db-persistence.ts` |
| Error routing | Existing error manager and logger | `src/background/error-manage/storage-errors.ts` |

## Storage quota rules by tier

| Tier | Quota reality | Eviction behavior | Correct design response |
|---|---|---|---|
| SQLite in memory + small export in `chrome.storage.local` | Extension storage quota applies; large blobs are bad | Usually durable for extension data, but writes fail at quota | Guard exported DB byte size before writing; fail fast with `QuotaExceeded` |
| SQLite + OPFS file backend | Origin quota; can be large, but only if implemented | Browser may evict if persistence is not granted | Request persistent storage; expose status in diagnostics; do not claim OPFS until implemented |
| IndexedDB | Origin quota; usually much larger than `chrome.storage.local` | Best effort unless persistent storage is granted | Store large rebuildable blobs here; keep version keys for invalidation |
| `chrome.storage.local` | JSON key/value quota; practical per-key guard should stay small | Durable extension storage, but hard write failures occur | Store small settings/config only; split or move data above 8 KB |
| `localStorage` | Small synchronous quota per origin | Can throw in private mode or when blocked | Only ephemeral DOM UI state; no logs, no auth, no database bytes |

## Copy-pasteable TypeScript sample

Use this as the generic quota guard before implementing the persistence backends in steps 17 and 18.

```ts
// src/background/storage/storage-size.ts
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface StorageByteReport {
    Key: string;
    Bytes: number;
    LimitBytes: number | null;
    WithinLimit: boolean;
}

export function measureUtf8Bytes(value: string): number {
    return new TextEncoder().encode(value).byteLength;
}

export function measureJsonBytes(value: JsonValue): number {
    return measureUtf8Bytes(JSON.stringify(value));
}

export function measureBinaryBytes(value: Uint8Array): number {
    return value.byteLength;
}

export function buildByteReport(key: string, bytes: number, limitBytes: number | null): StorageByteReport {
    return {
        Key: key,
        Bytes: bytes,
        LimitBytes: limitBytes,
        WithinLimit: limitBytes === null || bytes <= limitBytes,
    };
}
```

```ts
// src/background/storage/storage-quota.ts
export interface StorageEstimateReport {
    UsageBytes: number | null;
    QuotaBytes: number | null;
    Persisted: boolean | null;
    PersistenceRequested: boolean;
    PersistenceGranted: boolean | null;
}

export async function readStorageEstimate(requestPersistence: boolean): Promise<StorageEstimateReport> {
    const storageManager = navigator.storage;
    if (!storageManager?.estimate) {
        return {
            UsageBytes: null,
            QuotaBytes: null,
            Persisted: null,
            PersistenceRequested: requestPersistence,
            PersistenceGranted: null,
        };
    }

    const estimate = await storageManager.estimate();
    const persisted = storageManager.persisted ? await storageManager.persisted() : null;
    const shouldRequest = requestPersistence && storageManager.persist && persisted !== true;
    const granted = shouldRequest ? await storageManager.persist() : persisted;

    return {
        UsageBytes: estimate.usage ?? null,
        QuotaBytes: estimate.quota ?? null,
        Persisted: persisted,
        PersistenceRequested: requestPersistence,
        PersistenceGranted: granted ?? null,
    };
}
```

```ts
// src/background/storage/chrome-storage-safe.ts
import { buildByteReport, measureJsonBytes, type JsonValue } from "./storage-size";

const CHROME_STORAGE_SAFE_PER_KEY_BYTES = 8 * 1024;

export interface ChromeStorageWriteResult {
    Ok: boolean;
    Key: string;
    Bytes: number;
    Reason: "Ok" | "ValueTooLarge" | "ChromeRuntimeError";
    ReasonDetail: string | null;
}

export async function setChromeStorageLocalSafe(key: string, value: JsonValue): Promise<ChromeStorageWriteResult> {
    const report = buildByteReport(key, measureJsonBytes(value), CHROME_STORAGE_SAFE_PER_KEY_BYTES);
    if (!report.WithinLimit) {
        return {
            Ok: false,
            Key: key,
            Bytes: report.Bytes,
            Reason: "ValueTooLarge",
            ReasonDetail: `Refused chrome.storage.local write for ${key}: ${report.Bytes} bytes exceeds ${CHROME_STORAGE_SAFE_PER_KEY_BYTES} byte per-key project guard.`,
        };
    }

    await chrome.storage.local.set({ [key]: value });
    const runtimeError = chrome.runtime.lastError?.message ?? null;
    if (runtimeError !== null) {
        return {
            Ok: false,
            Key: key,
            Bytes: report.Bytes,
            Reason: "ChromeRuntimeError",
            ReasonDetail: runtimeError,
        };
    }

    return {
        Ok: true,
        Key: key,
        Bytes: report.Bytes,
        Reason: "Ok",
        ReasonDetail: null,
    };
}
```

## Error model

| Failure | Error type | Logger tag | Required diagnostic fields | User-visible surface |
|---|---|---|---|---|
| Value too large for chosen tier | `StorageQuotaError` | `CHROME_STORAGE` / `INDEXEDDB` / `SQLITE_PERSISTENCE` | `Reason`, `ReasonDetail`, `StorageTier`, `Key`, `Bytes`, `LimitBytes` | Errors panel row with suggested tier move |
| Browser storage estimate unavailable | `StorageCapabilityError` | `STORAGE_CAPABILITY` | `Reason=EstimateUnavailable`, `StorageTier`, `ApiName` | Diagnostics panel warning, not fatal |
| Persistence request denied | `StoragePersistenceWarning` | `STORAGE_PERSISTENCE` | `Reason=PersistenceDenied`, `UsageBytes`, `QuotaBytes` | Diagnostics panel warning |
| IndexedDB / OPFS eviction suspected | `StorageEvictedError` | `STORAGE_EVICTED` | `Reason=MissingExpectedStore`, `StoreName`, `ExpectedVersion` | Errors panel + rebuild cache action |
| SQLite export write failed | `SqlitePersistenceError` | `SQLITE_PERSISTENCE` | `Reason=ExportWriteFailed`, `DbName`, `Bytes`, `Backend` | Errors panel; BootFailureBanner only if startup cannot continue |

All hard failures must call `RiseupAsiaMacroExt.Logger.error()` or the project-approved logger wrapper. Do not use bare `log()` and do not swallow quota exceptions.

## Acceptance

- [ ] Every storage write has a measured byte count before persistence.
- [ ] `chrome.storage.local` writes reject values above the project per-key guard and recommend IndexedDB or SQLite instead.
- [ ] Large IndexedDB / SQLite backends call `navigator.storage.estimate()` where available and record `usage` / `quota` in diagnostics.
- [ ] Persistent storage is requested only for durable large stores, never for throwaway UI state.
- [ ] The code never claims OPFS is implemented unless `navigator.storage.getDirectory()` and file read/write paths exist in `src/`.
- [ ] Quota and eviction failures produce structured errors with `Reason` and `ReasonDetail`.
- [ ] Tests cover: small allowed write, oversized refused write, unavailable estimate API, denied persistence, and runtime write error.

## Cross-references

- Previous: [`step-02-four-tier-storage-decision-matrix.md`](./02-four-tier-storage-decision-matrix.md)
- Next: [`step-04-choose-a-tier-flowchart.md`](./04-choose-a-tier-flowchart.md)
- Persistence backend details: [`step-17-persistence-backends.md`](./17-persistence-backends.md)
- Flush timing: [`step-18-flush-strategy.md`](./18-flush-strategy.md)
- `chrome.storage.local` quota: [`step-26-chrome-storage-local-quota.md`](./26-chrome-storage-local-quota.md)
- Error model: [`step-31-error-model.md`](./31-error-model.md)

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

