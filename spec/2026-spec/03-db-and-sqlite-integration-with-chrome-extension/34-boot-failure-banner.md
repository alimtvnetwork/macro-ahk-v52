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

- [step-09](./step-09-initializing-sql-js.md) — wasm HEAD probe.
- [step-17](./step-17-persistence-backends.md) — memory mode is a hard failure surface.
- [step-32](./step-32-error-routing.md) — boot failures are routed and persisted.
- [step-33](./step-33-errors-panel-ui-hookup.md) — full diagnostic row surface.
- [step-36](./step-36-code-red-logging-rule.md) — Code Red fields.
