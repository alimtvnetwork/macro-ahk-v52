# Step 04 — Choose a Tier Flowchart

> Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md). Previous: [`step-03-quota-persistence-eviction.md`](./03-quota-persistence-eviction.md). Next: [`step-05-mv3-constraints.md`](./05-mv3-constraints.md).

## Goal

Give any implementer AI a deterministic, code-enforceable flowchart for choosing exactly one storage tier before writing new Chrome extension data.

## Root-cause reasoning from the current codebase

This project has several storage surfaces and a history of storage drift, so the decision must be explicit:

1. `spec/03-decision-tree.md` already says storage work must choose the correct tier: SQLite, IndexedDB, `localStorage`, or `chrome.storage.local`.
2. `src/hooks/use-storage-surfaces.ts` labels a non-SQL surface as `chrome.storage.local (IndexedDB/LocalStorage proxy)`, showing that UI wording can blur implementation details. This flowchart prevents that ambiguity by choosing based on data shape and durability.
3. `src/hooks/use-step-library.ts` is a browser demo using `localStorage` for SQL bytes. That must not become the default for MV3 extension persistence. The correct tier is selected by the data’s shape, size, and rebuildability, not by convenience.
4. Memory requires no Supabase, no role/auth storage shortcuts, and no logs in `localStorage`. Therefore tokens/secrets are routed to neither this four-tier matrix nor app-visible persisted stores.

## Required packages and exact file paths

| Need | API / package | File to create or update |
|---|---|---|
| Decision enum and metadata | TypeScript only | `src/shared/storage/storage-tier.ts` |
| Tier chooser function | TypeScript only | `src/shared/storage/choose-storage-tier.ts` |
| CI guard for forbidden tiers | Node.js script | `scripts/audit-storage-tier-policy.mjs` |
| Tests for the chooser | Current test runner | `src/shared/storage/__tests__/choose-storage-tier.test.ts` |
| Documentation pointer | Markdown | `spec/04-database-conventions/README.md` and this spec folder |

## Human flowchart

Read this from top to bottom and stop at the first matching rule.

```text
START
  |
  |-- Is it an auth token, secret, credential, session cookie, or role claim?
  |       -> DO NOT USE these four tiers. Use the approved auth/token bridge.
  |
  |-- Is it append-only diagnostics, replay history, audit data, or error logs?
  |       -> SQLite. Add retention/prune policy. Never localStorage.
  |
  |-- Does the feature need SQL joins, indexes, filtering, migrations, or aggregates?
  |       -> SQLite.
  |
  |-- Is it a large blob, generated script bundle, cached source, or rebuildable binary/text payload?
  |       -> IndexedDB.
  |
  |-- Is it small extension-wide configuration that popup/options/background must share?
  |       -> chrome.storage.local.
  |
  |-- Is it one-tab UI state that can disappear with no data loss?
  |       -> localStorage, only from DOM contexts.
  |
  |-- Is the data larger than 8 KB after JSON serialization?
  |       -> Do not use chrome.storage.local. Re-evaluate as IndexedDB or SQLite.
  |
  |-- Is the data durable but not relational and not large?
  |       -> chrome.storage.local.
  |
  -> If still unclear, stop and add a spec note. Do not guess.
```

## Machine-enforceable chooser

Use this sample as the source of truth for new features. It intentionally returns a refusal for secrets instead of pretending every data shape belongs to a storage tier.

```ts
// src/shared/storage/storage-tier.ts
export type StorageTier =
    | "SQLite"
    | "IndexedDB"
    | "ChromeStorageLocal"
    | "LocalStorage"
    | "Forbidden";

export type StorageDurability = "Durable" | "Rebuildable" | "Ephemeral";
export type StorageShape = "Relational" | "AppendOnlyLog" | "Blob" | "SmallJson" | "UiState" | "Secret";

export interface StorageTierDecisionInput {
    Shape: StorageShape;
    Durability: StorageDurability;
    EstimatedBytes: number;
    NeedsSql: boolean;
    SharedAcrossExtensionContexts: boolean;
    DomContextOnly: boolean;
}

export interface StorageTierDecision {
    Tier: StorageTier;
    Reason: string;
    ReasonDetail: string;
}
```

```ts
// src/shared/storage/choose-storage-tier.ts
import type { StorageTierDecision, StorageTierDecisionInput } from "./storage-tier";

const CHROME_STORAGE_SAFE_PER_KEY_BYTES = 8 * 1024;

export function chooseStorageTier(input: StorageTierDecisionInput): StorageTierDecision {
    if (input.Shape === "Secret") {
        return {
            Tier: "Forbidden",
            Reason: "SecretStorageForbidden",
            ReasonDetail: "Secrets, auth tokens, credentials, and role claims must not be stored in SQLite, IndexedDB, chrome.storage.local, or localStorage.",
        };
    }

    if (input.Shape === "AppendOnlyLog") {
        return {
            Tier: "SQLite",
            Reason: "AppendOnlyLogNeedsRetention",
            ReasonDetail: "Logs need indexes, pruning, export, and structured failure diagnostics.",
        };
    }

    if (input.Shape === "Relational" || input.NeedsSql) {
        return {
            Tier: "SQLite",
            Reason: "RelationalDataNeedsSql",
            ReasonDetail: "Relational data needs schema migrations, indexes, joins, and prepared statements.",
        };
    }

    if (input.Shape === "Blob") {
        return {
            Tier: "IndexedDB",
            Reason: "BlobUsesStructuredClone",
            ReasonDetail: "Large source, binary, or rebuildable payloads should avoid JSON serialization and use IndexedDB structured clone.",
        };
    }

    if (input.Shape === "UiState" && input.Durability === "Ephemeral" && input.DomContextOnly) {
        return {
            Tier: "LocalStorage",
            Reason: "EphemeralDomUiState",
            ReasonDetail: "One-tab UI state may use localStorage when losing it does not matter and the code runs outside the service worker.",
        };
    }

    if (input.Shape === "SmallJson" && input.EstimatedBytes <= CHROME_STORAGE_SAFE_PER_KEY_BYTES) {
        return {
            Tier: "ChromeStorageLocal",
            Reason: "SmallSharedJsonConfig",
            ReasonDetail: "Small durable JSON config shared across popup, options, and background belongs in chrome.storage.local.",
        };
    }

    if (input.Shape === "SmallJson" && input.EstimatedBytes > CHROME_STORAGE_SAFE_PER_KEY_BYTES) {
        return {
            Tier: "IndexedDB",
            Reason: "JsonTooLargeForChromeStorageLocal",
            ReasonDetail: "JSON above the per-key guard should move to IndexedDB or be normalized into SQLite if relational queries are needed.",
        };
    }

    if (input.Durability === "Rebuildable") {
        return {
            Tier: "IndexedDB",
            Reason: "RebuildableCache",
            ReasonDetail: "Rebuildable caches should prefer IndexedDB and include a version-based invalidation key.",
        };
    }

    return {
        Tier: "Forbidden",
        Reason: "NoSafeDefault",
        ReasonDetail: "No storage tier matched safely. Add a spec note and choose deliberately instead of guessing.",
    };
}
```

## Example calls

```ts
chooseStorageTier({
    Shape: "AppendOnlyLog",
    Durability: "Durable",
    EstimatedBytes: 1200,
    NeedsSql: true,
    SharedAcrossExtensionContexts: false,
    DomContextOnly: false,
});
// -> SQLite / AppendOnlyLogNeedsRetention

chooseStorageTier({
    Shape: "SmallJson",
    Durability: "Durable",
    EstimatedBytes: 640,
    NeedsSql: false,
    SharedAcrossExtensionContexts: true,
    DomContextOnly: false,
});
// -> ChromeStorageLocal / SmallSharedJsonConfig

chooseStorageTier({
    Shape: "Secret",
    Durability: "Durable",
    EstimatedBytes: 180,
    NeedsSql: false,
    SharedAcrossExtensionContexts: true,
    DomContextOnly: false,
});
// -> Forbidden / SecretStorageForbidden
```

## Decision table for common Chrome extension data

| Data | Tier | Reason |
|---|---|---|
| Session logs, replay runs, selector attempts, variable contexts | SQLite | Queryable, prunable, exportable, structured diagnostics |
| Recorder steps, projects, namespaces, migrations | SQLite | Relational domain model with schema versions |
| Generated script source cache | IndexedDB | Large rebuildable payload; structured clone; version invalidation |
| Injection cache keyed by extension version | IndexedDB | Cold-start performance and rebuildable state |
| Options page settings | `chrome.storage.local` | Small shared JSON; cross-context change notifications |
| Last selected tab/filter | `chrome.storage.local` if shared, `localStorage` if one-tab only | Depends on whether the background/popup needs it |
| Collapsed panel state in one DOM surface | `localStorage` | Ephemeral UI state only |
| Auth bearer token, refresh token, user role | Forbidden here | Must use the approved auth/token contract, not these stores |

## Error model

| Failure | Error type | Logger tag | Required diagnostic fields | User-visible surface |
|---|---|---|---|---|
| No safe tier selected | `StorageTierDecisionError` | `STORAGE_TIER` | `Reason=NoSafeDefault`, full decision input | Spec/test failure; do not ship feature |
| Secret routed to persisted app store | `StoragePolicyViolation` | `STORAGE_POLICY` | `Reason=SecretStorageForbidden`, target tier, key name | CI failure + Errors panel if runtime-detected |
| Oversized config routed to `chrome.storage.local` | `StorageTierDecisionError` | `STORAGE_TIER` | `Reason=JsonTooLargeForChromeStorageLocal`, estimated bytes | Test failure; recommend IndexedDB or SQLite |
| `localStorage` selected for service worker code | `StoragePolicyViolation` | `LOCALSTORAGE` | `Reason=DomOnlyApiInServiceWorker`, file path | CI failure |

Every policy violation must include the exact file path and key/store name when known, following the Code Red file/path logging rule.

## Acceptance

- [ ] New features choose a tier by calling or mirroring `chooseStorageTier()` before implementation.
- [ ] Unit tests cover all storage shapes: `Secret`, `AppendOnlyLog`, `Relational`, `Blob`, `UiState`, `SmallJson`, oversized JSON, and no-safe-default.
- [ ] CI rejects `localStorage` usage from background/service-worker files.
- [ ] CI rejects known secret/token key names in `localStorage`, IndexedDB, SQLite migrations, and `chrome.storage.local` writes.
- [ ] Docs and code comments do not describe OPFS as active unless the OPFS backend from step 17 exists in source.
- [ ] Error routing uses `Reason` and `ReasonDetail`, never a vague message alone.

## Cross-references

- Previous: [`step-03-quota-persistence-eviction.md`](./03-quota-persistence-eviction.md)
- Next: [`step-05-mv3-constraints.md`](./05-mv3-constraints.md)
- Decision matrix: [`step-02-four-tier-storage-decision-matrix.md`](./02-four-tier-storage-decision-matrix.md)
- IndexedDB selection: [`step-21-indexeddb-when-to-choose.md`](./21-indexeddb-when-to-choose.md)
- `chrome.storage.local` usage: [`step-25-chrome-storage-local-usage.md`](./25-chrome-storage-local-usage.md)
- `localStorage` usage: [`step-27-localstorage-usage.md`](./27-localstorage-usage.md)
- CI gates: [`step-39-ci-gates.md`](./39-ci-gates.md)

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
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

