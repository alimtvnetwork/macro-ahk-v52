# Step 26 — `chrome.storage.local` Quota

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Make `chrome.storage.local` writes quota-aware by measuring JSON bytes before every write, refusing oversized values, surfacing storage pressure, and pruning only approved disposable keys without retry/backoff loops.

## Root cause this prevents

`chrome.storage.local` is convenient enough that large data can drift into it: scripts have `MAX_SCRIPT_SIZE_BYTES = 5 MiB`, configs have `MAX_CONFIG_SIZE_BYTES = 1 MiB`, and project/script/config arrays are currently stored as whole-list JSON values. A few large custom scripts or configs can push the 10 MiB default quota and turn unrelated writes (active project, build id, first-run flag) into failures. The root fix is not “retry”; it is byte accounting, tier refusal, and deliberate pruning/migration to IndexedDB or SQLite.

## Quota policy

| Limit | Value | Meaning |
|---|---:|---|
| Default Chrome local quota | `10 * 1024 * 1024` bytes | Assumed cap when `unlimitedStorage` is absent or unknown |
| Project safe total warning | `50%` of default cap | Log diagnostic warning |
| Project storage-pressure threshold | `80%` of default cap | Show E-12 warning toast / diagnostics row |
| Project full threshold | `100%` of default cap | Refuse non-critical writes that would grow storage |
| Normal per-key guard | `8 * 1024` bytes | New small JSON config/settings must stay below this |
| Legacy allowlisted collection guard | explicit allowlist only | `marco_projects`, `marco_scripts`, `marco_configs` remain until migrated |

`unlimitedStorage` appears in `manifest.json`, but code must still behave safely when the permission is missing, revoked, unavailable in tests, or not effective for a specific browser/profile.

## Prunable vs non-prunable keys

Never delete authoritative user data automatically just to make quota space.

| Key | Class | Auto-prune? | Reason |
|---|---|---|---|
| `marco_active_project` | critical pointer | No | User selection / state manager |
| `marco_projects` | authoritative | No | User/project data; export first |
| `marco_scripts` | authoritative | No | User/script library; may include custom code |
| `marco_configs` | authoritative | No | User/config library |
| `marco_config_overrides` | authoritative small config | No | User choices |
| `marco_state` | derived state snapshot | Yes, if rebuildable | Can rehydrate defaults |
| `marco_first_run` | install sentinel | No | Bootstrap behavior |
| `marco_legacy_pruned` | migration sentinel | No | Prevents repeated legacy cleanup |
| `marco_last_build_id` | cache sentinel | Yes | Cache can rebuild from current build meta |
| `marco_auto_attach_decisions` | diagnostics cache | Yes | Latest decisions can be recomputed on save/evaluation |
| `marco_storage_schema_version` | migration stamp | No | Prevents migration loops |

If quota is exceeded by authoritative keys, stop and surface an export/migration action. Do not silently delete projects, scripts, configs, logs, or prompt data.

## Required files

- `src/background/storage/chrome-storage-quota.ts` — byte accounting, `getBytesInUse()`, pressure classifier.
- `src/background/storage/chrome-storage-local.ts` — Step 25 wrapper calls quota guard before writes.
- `src/background/storage/chrome-storage-pruner.ts` — approved disposable-key pruning only.
- `src/background/storage/__tests__/chrome-storage-quota.test.ts` — byte/classifier tests.
- `src/background/storage/__tests__/chrome-storage-pruner.test.ts` — no-authoritative-delete tests.
- `src/components/options/StoragePressureToast.tsx` or existing toast host — E-12 UI surface.
- `scripts/audit-storage-tier-policy.mjs` — rejects new oversized direct `chrome.storage.local.set` patterns in CI.

## Copy-pasteable TypeScript sample

```ts
import { RiseupAsiaMacroExt } from "../../shared/logger";
import type { ChromeStorageLocalKey, JsonValue } from "./chrome-storage-local";

const CHROME_STORAGE_DEFAULT_QUOTA_BYTES = 10 * 1024 * 1024;
const CHROME_STORAGE_SAFE_PER_KEY_BYTES = 8 * 1024;
const STORAGE_WARN_RATIO = 0.50;
const STORAGE_PRESSURE_RATIO = 0.80;

const LEGACY_COLLECTION_KEYS = new Set<ChromeStorageLocalKey>([
  "marco_projects",
  "marco_scripts",
  "marco_configs",
]);

export type ChromeStoragePressure = "ok" | "warn" | "pressure" | "full";

export type ChromeStorageQuotaReport = {
  readonly Key: ChromeStorageLocalKey;
  readonly ValueBytes: number;
  readonly TotalBytesInUse: number | null;
  readonly QuotaBytes: number;
  readonly ProjectedBytesInUse: number | null;
  readonly Pressure: ChromeStoragePressure;
};

function measureJsonBytes(value: JsonValue): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function classifyPressure(projectedBytes: number, quotaBytes: number): ChromeStoragePressure {
  const ratio = projectedBytes / quotaBytes;
  if (ratio >= 1) return "full";
  if (ratio >= STORAGE_PRESSURE_RATIO) return "pressure";
  if (ratio >= STORAGE_WARN_RATIO) return "warn";
  return "ok";
}

export async function buildQuotaReport(
  key: ChromeStorageLocalKey,
  value: JsonValue,
): Promise<ChromeStorageQuotaReport> {
  const valueBytes = measureJsonBytes(value);
  let totalBytesInUse: number | null = null;
  try {
    totalBytesInUse = await chrome.storage.local.getBytesInUse(null);
  } catch (err) {
    RiseupAsiaMacroExt.Logger.error("[chrome-storage-quota] getBytesInUse failed", {
      Path: "chrome.storage.local.getBytesInUse(null)",
      Missing: "Current chrome.storage.local byte usage",
      Reason: "ChromeStorageBytesInUseFailed",
      ReasonDetail: err instanceof Error ? err.message : String(err),
    });
  }

  const projected = totalBytesInUse === null ? null : totalBytesInUse + valueBytes;
  return {
    Key: key,
    ValueBytes: valueBytes,
    TotalBytesInUse: totalBytesInUse,
    QuotaBytes: CHROME_STORAGE_DEFAULT_QUOTA_BYTES,
    ProjectedBytesInUse: projected,
    Pressure: classifyPressure(projected ?? valueBytes, CHROME_STORAGE_DEFAULT_QUOTA_BYTES),
  };
}

export async function assertChromeStorageLocalBudget(
  key: ChromeStorageLocalKey,
  value: JsonValue,
): Promise<void> {
  const report = await buildQuotaReport(key, value);
  const isLegacyCollection = LEGACY_COLLECTION_KEYS.has(key);
  if (!isLegacyCollection && report.ValueBytes > CHROME_STORAGE_SAFE_PER_KEY_BYTES) {
    RiseupAsiaMacroExt.Logger.error("[chrome-storage-quota] per-key limit exceeded", {
      Path: `chrome.storage.local[${key}]`,
      Missing: `JSON value <= ${CHROME_STORAGE_SAFE_PER_KEY_BYTES} bytes`,
      Reason: "ChromeStorageLocalValueTooLarge",
      ReasonDetail: `Measured ${report.ValueBytes} bytes. Move large payloads to IndexedDB or SQLite.`,
    });
    throw new Error(`chrome.storage.local value too large for ${key}`);
  }

  if (report.Pressure === "pressure" || report.Pressure === "full") {
    await pruneChromeStorageLocal({ Reason: "quota-pressure", Report: report });
  }

  if (report.Pressure === "full") {
    throw new Error(`chrome.storage.local full before writing ${key}`);
  }
}
```

## Pruner contract

The pruner is sequential and bounded. It must not recursively retry the original write.

```ts
const PRUNABLE_KEYS: readonly ChromeStorageLocalKey[] = [
  "marco_auto_attach_decisions",
  "marco_last_build_id",
  "marco_state",
];

export async function pruneChromeStorageLocal(input: {
  readonly Reason: "quota-pressure" | "manual-diagnostics";
  readonly Report: ChromeStorageQuotaReport;
}): Promise<{ readonly RemovedKeys: readonly ChromeStorageLocalKey[]; readonly ReclaimedBytes: number }> {
  const removed: ChromeStorageLocalKey[] = [];
  let reclaimed = 0;

  for (const key of PRUNABLE_KEYS) {
    const before = await chrome.storage.local.getBytesInUse(key);
    if (before <= 0) continue;
    await chrome.storage.local.remove(key);
    removed.push(key);
    reclaimed += before;
  }

  RiseupAsiaMacroExt.Logger.error("[chrome-storage-pruner] storage pressure pruned disposable keys", {
    Path: "chrome.storage.local",
    Missing: "Free space for safe JSON writes",
    Reason: "ChromeStorageLocalPressurePruned",
    ReasonDetail: `reason=${input.Reason}; removed=${removed.join(",")}; reclaimed=${reclaimed}`,
  });

  return { RemovedKeys: removed, ReclaimedBytes: reclaimed };
}
```

After pruning, the caller may attempt the original write **once** in the same call path. Do not implement a loop, exponential backoff, scheduled retry, or background retry queue.

## User-visible surface

Use the existing E-12 storage-pressure behavior from `spec/21-app/05-prompts/ui/16-storage-pressure-toast-e12.md`:

- `warn` at ≥50%: diagnostics warning only.
- `pressure` at ≥80%: singleton toast, “Storage almost full”.
- `full` at ≥100%: blocking modal for write-heavy flows; new macro/recording starts are refused until export/clear.
- The action is “Export & clear” or “Open Storage settings”; never auto-delete authoritative data.

## Error model

| Failure | Logger tag | User-visible surface | Recovery |
|---|---|---|---|
| `getBytesInUse(null)` failed | `CHROME_STORAGE` Code-Red | Diagnostics warning | Continue with per-key guard only |
| Non-allowlisted value > 8 KiB | `STORAGE_TIER` Code-Red | Write error/toast | Refuse write; move data tier |
| Projected usage ≥80% | `CHROME_STORAGE` warning | E-12 toast | Prune disposable keys; suggest export |
| Projected usage ≥100% | `CHROME_STORAGE` Code-Red | Blocking storage-full modal | Refuse growing writes; export/clear required |
| Pruner deleted an authoritative key | CI/test failure + Code-Red | History restore may be needed | This must never ship |
| `chrome.storage.local.set` throws quota error | `CHROME_STORAGE` Code-Red | Toast/modal if user-initiated | Prune once; one immediate re-attempt only if caller owns it |

Every error must include `Path`, `Missing`, `Reason`, `ReasonDetail`, `Key`, `ValueBytes`, and `QuotaBytes` when available.

## Acceptance

- [ ] Every new `chrome.storage.local.set` path measures JSON bytes before writing.
- [ ] Non-allowlisted keys above 8 KiB are refused and directed to IndexedDB or SQLite.
- [ ] `marco_projects`, `marco_scripts`, and `marco_configs` are legacy allowlisted but still included in total pressure reports.
- [ ] Pruner only removes `marco_auto_attach_decisions`, `marco_last_build_id`, and `marco_state` unless this spec is updated.
- [ ] Tests prove authoritative keys are never pruned.
- [ ] Tests cover `ok`, `warn`, `pressure`, and `full` classifier states.
- [ ] User-facing storage pressure uses the E-12 singleton toast/modal behavior.
- [ ] No retry/backoff loop exists in quota or pruner code.

## See also

- [step-03](./03-quota-persistence-eviction.md) — Generic quota/error model
- [step-21](./21-indexeddb-when-to-choose.md) — Move large rebuildable blobs to IDB
- [step-25](./25-chrome-storage-local-usage.md) — Allowed key and payload lane
- [step-31](./31-error-model.md) — Shared `QuotaError` shape
- [step-39](./39-ci-gates.md) — Storage policy CI checks

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../01-prompt-spec/reference/05-runtime-defaults.md). If a value differs, the SOT wins.

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
