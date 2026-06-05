# Step 25 — `chrome.storage.local` Usage

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Define the narrow, typed lane for `chrome.storage.local`: small extension-wide JSON state shared by the background service worker, popup, and options UI, with stable camelCase persisted payloads and no large blobs, logs, tokens, or key-shape rewrites.

## Root cause this prevents

The current codebase still has many direct `chrome.storage.local.get/set` call sites (`project-helpers.ts`, `project-handler.ts`, `manifest-seeder.ts`, `storage-migration.ts`, `injection-cache.ts`). That is workable only while every caller remembers the same rules. The recurring failures are: oversized script/config payloads pushing quota, direct writes bypassing diagnostics, and dangerous “cleanup” migrations that would rewrite `StoredProject` keys from camelCase to PascalCase. This step makes the storage lane explicit and keeps `chrome.storage.local` as a shared settings/bootstrap store, not a database replacement.

## What belongs in `chrome.storage.local`

Use `chrome.storage.local` only when all are true:

1. The value is extension-wide, not per-origin or per-tab.
2. The background service worker and at least one UI context need to read it.
3. The value is JSON-cloneable and normally below the Step 26 per-key guard.
4. The value must survive service-worker suspension and browser restart.
5. The value is not a secret, token, role claim, session cookie, append-only log, or large rebuildable cache.

## Canonical current keys

The current extension already uses stable exported constants from `src/shared/constants.ts`. Keep these stable; do not rename values unless a dedicated compatibility migration is approved.

| Constant | Persisted key | Owner | Allowed payload |
|---|---|---|---|
| `STORAGE_KEY_ACTIVE_PROJECT` | `marco_active_project` | `project-handler.ts` / state manager | Active project id string or absent |
| `STORAGE_KEY_ALL_PROJECTS` | `marco_projects` | project handlers / seeders | `StoredProject[]` in camelCase only |
| `STORAGE_KEY_ALL_SCRIPTS` | `marco_scripts` | manifest seeder / script UI | `StoredScript[]`; built-ins hold stub `code` + real `filePath` |
| `STORAGE_KEY_ALL_CONFIGS` | `marco_configs` | manifest seeder / config UI | `StoredConfig[]`; small JSON config records |
| `STORAGE_KEY_CONFIG_OVERRIDES` | `marco_config_overrides` | config override handlers | Small override map |
| `STORAGE_KEY_STATE` | `marco_state` | state manager | Small background state snapshot |
| `STORAGE_KEY_FIRST_RUN` | `marco_first_run` | default-project seeder | First-run/install metadata |
| `STORAGE_KEY_LEGACY_PRUNED` | `marco_legacy_pruned` | legacy cleanup | Boolean/sentinel only |
| `STORAGE_KEY_LAST_BUILD_ID` | `marco_last_build_id` | injection cache | Build-id sentinel only |
| `STORAGE_KEY_AUTO_ATTACH_DECISIONS` | `marco_auto_attach_decisions` | auto-attach runner | Bounded diagnostics for latest decisions |
| `marco_storage_schema_version` | literal in `storage-migration.ts` | storage migration runner | Numeric schema stamp, currently baseline `1` |

## Non-negotiable shape rule

`StoredProject`, `StoredScript`, and `StoredConfig` payloads in `chrome.storage.local` stay in their existing runtime shapes.

- `StoredProject.schemaVersion`, `targetUrls`, `createdAt`, `updatedAt`, etc. remain **camelCase**.
- Phase 2c-storage v2 / PascalCase rewrite is permanently forbidden by `mem://constraints/no-storage-pascalcase-migration`.
- `storage-migration.ts` may stamp the baseline version, but it must not mutate payload key casing.
- SQL tables may use PascalCase column names; this rule is only about persisted `chrome.storage.local` JSON payloads.

## Required files

- `src/shared/constants.ts` — only source for stable storage-key constants.
- `src/shared/project-types.ts` — canonical `StoredProject` camelCase payload shape.
- `src/shared/script-config-types.ts` — canonical `StoredScript` / `StoredConfig` camelCase payload shape.
- `src/background/storage/chrome-storage-local.ts` — typed wrapper for new writes and gradual migration of direct call sites.
- `src/background/storage/chrome-storage-local.test.ts` — wrapper tests with a mocked Chrome API.
- `src/background/handlers/project-helpers.ts` — must migrate to the wrapper first because it owns `marco_projects`.
- `src/background/storage-migration.ts` — keeps the v1 baseline guard and forbids PascalCase rewrite attempts.
- `scripts/check-no-storage-pascalcase-rewrite.mjs` — CI guard for the banned key rewrite.

## Copy-pasteable TypeScript sample

```ts
import { RiseupAsiaMacroExt } from "../../shared/logger";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export type ChromeStorageLocalKey =
  | "marco_active_project"
  | "marco_projects"
  | "marco_scripts"
  | "marco_configs"
  | "marco_config_overrides"
  | "marco_state"
  | "marco_first_run"
  | "marco_legacy_pruned"
  | "marco_last_build_id"
  | "marco_auto_attach_decisions"
  | "marco_storage_schema_version";

export type ChromeStorageReadResult<T extends JsonValue> = {
  readonly Found: boolean;
  readonly Value: T | null;
};

function measureJsonBytes(value: JsonValue): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function assertKnownStorageKey(key: string): asserts key is ChromeStorageLocalKey {
  const allowed: readonly string[] = [
    "marco_active_project",
    "marco_projects",
    "marco_scripts",
    "marco_configs",
    "marco_config_overrides",
    "marco_state",
    "marco_first_run",
    "marco_legacy_pruned",
    "marco_last_build_id",
    "marco_auto_attach_decisions",
    "marco_storage_schema_version",
  ];
  if (!allowed.includes(key)) {
    RiseupAsiaMacroExt.Logger.error("[chrome-storage-local] unknown key", {
      Path: `chrome.storage.local[${key}]`,
      Missing: "Allowed STORAGE_KEY_* constant",
      Reason: "UnknownChromeStorageLocalKey",
      ReasonDetail: "Use src/shared/constants.ts instead of ad-hoc storage keys.",
    });
    throw new Error(`Unknown chrome.storage.local key: ${key}`);
  }
}

export async function readChromeLocal<T extends JsonValue>(
  key: ChromeStorageLocalKey,
): Promise<ChromeStorageReadResult<T>> {
  assertKnownStorageKey(key);
  const result = await chrome.storage.local.get(key);
  const value = result[key];
  if (value === undefined) {
    return { Found: false, Value: null };
  }
  return { Found: true, Value: value as T };
}

export async function writeChromeLocal(
  key: ChromeStorageLocalKey,
  value: JsonValue,
): Promise<void> {
  assertKnownStorageKey(key);
  measureJsonBytes(value); // retained for diagnostics hooks; Step 26 performs the enforced check
  await assertChromeStorageLocalBudget(key, value);
  await chrome.storage.local.set({ [key]: value });
}
```

`assertChromeStorageLocalBudget()` is defined by Step 26. New feature code must use the wrapper; legacy direct calls should be migrated opportunistically, starting with project/script/config handlers.

## Cross-context sync contract

`chrome.storage.onChanged` is the canonical sync signal for small shared JSON state.

```ts
export function listenChromeLocal(
  handler: (key: ChromeStorageLocalKey, nextValue: JsonValue | null) => void,
): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== "local") {
      return;
    }
    for (const [key, change] of Object.entries(changes)) {
      assertKnownStorageKey(key);
      handler(key, (change.newValue ?? null) as JsonValue | null);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
```

Use message handlers for command-style operations (`SAVE_PROJECT`, `DELETE_SCRIPT`, migrations). Use `onChanged` for passive hydration after a storage write.

## Forbidden uses

- No append-only logs, replay traces, selector attempts, variable contexts, or errors. Those go to SQLite.
- No large script bytes, namespace bundles, ZIP staging, WASM bytes, screenshots, or backup files. Those go to IndexedDB, OPFS, or exported artifacts.
- No auth bearer tokens, refresh tokens, session cookies, role claims, private API keys, or long-lived secrets.
- No per-keystroke writes from Options forms. Debounce and save explicit form submissions.
- No PascalCase rewrite of `StoredProject` / `StoredScript` / `StoredConfig` payloads.
- No ad-hoc keys outside `src/shared/constants.ts` unless the key is first added to this step and covered by tests.

## Error model

| Failure | Logger tag | User-visible surface | Recovery |
|---|---|---|---|
| Unknown key | `CHROME_STORAGE` Code-Red | Errors panel | Throw; add a typed constant or reject feature |
| Oversized value | `CHROME_STORAGE` / `STORAGE_TIER` Code-Red | Storage-pressure toast from Step 26 | Refuse write; move to IndexedDB or SQLite |
| `chrome.storage.local.get` failed | `CHROME_STORAGE` Code-Red | Errors panel if user action depended on read | Return typed failure to caller; no silent default except first-run bootstrap |
| `chrome.storage.local.set` failed | `CHROME_STORAGE` Code-Red | Toast for user-initiated writes | Do not retry recursively; caller may expose a manual retry button |
| PascalCase storage rewrite attempted | `BOOT` Code-Red | Boot failure / CI failure | Throw via `assertNoPascalCaseStorageMigration()` |

Every failure must include `Path`, `Missing`, `Reason`, and `ReasonDetail`.

## Acceptance

- [ ] New `chrome.storage.local` writes go through `chrome-storage-local.ts` or an explicitly reviewed legacy wrapper.
- [ ] `StoredProject`, `StoredScript`, and `StoredConfig` remain camelCase in storage.
- [ ] `scripts/check-no-storage-pascalcase-rewrite.mjs` stays in CI and fails forbidden key rewrites.
- [ ] Direct storage writes include a tracked migration plan to the wrapper; no new ad-hoc keys are introduced.
- [ ] Every user-triggered storage write reports quota and runtime failures instead of swallowing them.
- [ ] `chrome.storage.onChanged` listeners return teardown functions and are removed on component unmount / context teardown.

## See also

- [step-02](./02-four-tier-storage-decision-matrix.md) — Tier matrix
- [step-03](./03-quota-persistence-eviction.md) — Quota/error behavior
- [step-21](./21-indexeddb-when-to-choose.md) — Large rebuildable cache lane
- [step-26](./26-chrome-storage-local-quota.md) — Byte guard and pruner
- [step-28](./28-cross-version-storage-migration.md) — Safe storage migration rules

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

