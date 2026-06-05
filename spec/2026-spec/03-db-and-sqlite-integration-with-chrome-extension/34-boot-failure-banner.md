# Step 34 — BootFailureBanner

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

When boot-critical dependencies fail, continuing with a half-working extension creates worse corruption: writes may go to memory only, script injection may run stale bytes, or users may not know that diagnostics are incomplete. The fix is a first-class boot failure state that is set by background boot, stored in extension storage, surfaced in UI, and cleared only after a successful boot probe.

## Goal

Display a durable, actionable BootFailureBanner whenever boot enters an unsafe state such as missing wasm, unavailable persistence, failed storage migration, or blocked DB initialization.

## Required files

- `src/background/boot-state.ts` — stores and clears boot failure state.
- `src/background/service-worker-main.ts` — sets boot failure during initialization.
- `src/background/sqljs-loader.ts` — reports `wasm-missing` with exact wasm path.
- `src/background/db-manager.ts` and `src/background/project-db-manager.ts` — report `persistence-memory-only` / DB init failure.
- `src/popup/components/BootFailureBanner.tsx` — popup banner.
- `src/options/options-entry.tsx` or diagnostics surface — full details and copy report.
- `src/shared/message-types.ts` — `GET_BOOT_STATE` / `BOOT_STATE_CHANGED` messages.
- `src/pages/__tests__/Popup.test.tsx` — banner states.

No new runtime package is required.

## Boot failure state

```ts
type BootFailureKind =
    | "wasm-missing"
    | "sqljs-init-failed"
    | "storage-migration-failed"
    | "persistence-memory-only"
    | "db-init-failed"
    | "injection-cache-invalid";

type BootFailureState = {
    isActive: boolean;
    kind: BootFailureKind;
    level: "warning" | "code-red";
    message: string;
    path: string;
    missing: string;
    reason: string;
    reasonDetail: string;
    createdAt: string;
    extensionVersion: string;
    buildId: string | null;
};
```

Storage key:

```ts
const STORAGE_KEY_BOOT_FAILURE = "marco_boot_failure";
```

Use the `chrome.storage.local` wrapper from step-25; do not read/write storage directly.

## Trigger matrix

| Trigger | Kind | Level | Clear condition |
|---|---|---|---|
| `public/assets/sql-wasm.wasm` HEAD returns 404 | `wasm-missing` | `code-red` | next boot loads wasm successfully |
| `initSqlJs()` throws | `sqljs-init-failed` | `code-red` | next boot initializes sql.js |
| storage migration throws | `storage-migration-failed` | `code-red` | migration completes |
| OPFS + storage fallback fail; DB is memory only | `persistence-memory-only` | `code-red` | persistent backend selected |
| global/project DB init fails | `db-init-failed` | `code-red` | DB init completes |
| injection cache detects invalid derived bytes and clears | `injection-cache-invalid` | `warning` | cache rebuild completes |

## Banner content rules

The banner must show:

- short human-readable message,
- `Reason`,
- exact `Path`,
- exact `Missing`,
- copy diagnostics action,
- link/button to open the full Errors panel if available.

Do not show generic text like “Something went wrong” without the diagnostic fields.

## Canonical setter

```ts
export async function setBootFailure(state: BootFailureState): Promise<void> {
    await writeChromeLocal(STORAGE_KEY_BOOT_FAILURE, state);
    await routeError({
        requestId: `boot:${state.createdAt}`,
        messageType: "BOOT_FAILURE",
        source: "background",
        error: new Error(state.message) as CaughtError,
        diagnostic: {
            Reason: state.reason,
            ReasonDetail: state.reasonDetail,
            Path: state.path,
            Missing: state.missing,
            SelectorAttempts: null,
            VariableContext: null,
        },
    });
    await broadcastBootStateChangedFailSafe();
}
```

Clearing:

```ts
export async function clearBootFailureIfHealthy(): Promise<void> {
    const state = await readChromeLocal<BootFailureState>(STORAGE_KEY_BOOT_FAILURE);
    if (state?.isActive !== true) {
        return;
    }
    await removeChromeLocal(STORAGE_KEY_BOOT_FAILURE);
    await broadcastBootStateChangedFailSafe();
}
```

## Error model

| Failure | Reason | Logger tag | User-visible surface |
|---|---|---|---|
| Cannot persist boot state | `BootFailureStateWriteFailed` | `BOOT_STATE` | console + Errors panel if reachable |
| Cannot query boot state | `BootFailureStateReadFailed` | `BOOT_STATE` | inline banner fallback |
| Cannot broadcast boot state | `BootFailureBroadcastFailed` | `BOOT_STATE` | refreshed on next popup/options open |

Boot state persistence failure must not hide the underlying boot failure. Log the boot failure first, then log boot-state persistence failure separately.

## Acceptance

- [ ] Missing wasm produces `kind: "wasm-missing"` with path `assets/sql-wasm.wasm`.
- [ ] Memory-only persistence produces `kind: "persistence-memory-only"` and Code Red level.
- [ ] Popup/options query `GET_BOOT_STATE` on open and subscribe to `BOOT_STATE_CHANGED`.
- [ ] Banner includes `Reason`, `ReasonDetail`, `Path`, and `Missing`.
- [ ] Successful subsequent boot clears the stored active failure.
- [ ] Component tests cover no failure, wasm missing, memory-only DB, and failed boot-state read fallback.

## Cross-references

- [step-09](./09-initializing-sql-js.md) — wasm HEAD probe.
- [step-17](./17-persistence-backends.md) — memory mode is a hard failure surface.
- [step-32](./32-error-routing.md) — boot failures are routed and persisted.
- [step-33](./33-errors-panel-ui-hookup.md) — full diagnostic row surface.
- [step-36](./36-code-red-logging-rule.md) — Code Red fields.

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

