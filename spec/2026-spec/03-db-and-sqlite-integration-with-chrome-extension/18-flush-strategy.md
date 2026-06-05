# Step 18 — Flush Strategy

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Define a **dirty-tracked, debounced flush** with a fixed 5-second window and explicit drain points (SW idle, page unload, manual export) so that no write is lost and the SW never blocks on per-statement fsync.

## Required files

- `src/background/db-manager.ts` — global flush debounce
- `src/background/project-db-manager.ts` — per-slug flush debounce
- `src/background/db-persistence.ts` — low-level `saveToOpfs` / `flushToStorage`

## Constants

```ts
// MUST be identical in both db-manager.ts and project-db-manager.ts
const FLUSH_DEBOUNCE_MS = 5_000;
```

5 s is a deliberate trade-off: short enough that SW idle (~30 s) never preempts a pending write; long enough to coalesce burst writes from recorder/replay.

## The contract

```ts
let dirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Mark dirty after every successful write. */
export function markDirty(): void {
  dirty = true;
  if (flushTimer !== null) return; // coalesce; do NOT reset window
  flushTimer = setTimeout(() => void flushIfDirty(), FLUSH_DEBOUNCE_MS);
}

async function flushIfDirty(): Promise<void> {
  flushTimer = null;
  if (!dirty) return;
  dirty = false;          // clear BEFORE write — re-entrant writes during
                          // flush will re-arm the timer, preventing loss.
  try {
    await flushByMode();  // dispatches to OPFS or storage based on mode
  } catch (err) {
    dirty = true;         // restore so next markDirty re-arms
    console.error(`[db-manager] flush failed
  Path: ${persistenceMode === "opfs" ? "OPFS" : "chrome.storage.local"}
  Missing: serialized DB blob persisted to backend
  Reason: ${err instanceof Error ? err.message : String(err)}`, err);
  }
}
```

Rules — non-negotiable:

1. **Coalesce, do not reset.** Once a timer is armed, additional `markDirty()` calls MUST NOT extend the window. A continuous write stream still flushes every 5 s.
2. **Clear `dirty` before write, not after.** Writes that arrive *during* the flush re-arm the timer, so nothing is lost. The opposite order ("clear after") races with concurrent writes.
3. **Per-project DBs use per-slug timers.** `flushTimers: Map<string, Timer>`. Never share a timer across projects.
4. **No batch size threshold.** Time-only debounce. Adding a "flush after N writes" gate adds complexity for no measurable durability gain in MV3.
5. **No retry-with-backoff on flush failure.** Per the no-retry policy, a failed flush logs Code-Red, restores `dirty`, and waits for the next `markDirty()` to re-arm the timer.

## Drain points (explicit flushes)

`markDirty` + debounce is NOT enough. SW idle (~30 s) will tear down timers. The following sites MUST call `flushIfDirty()` / `flushAllProjectDbs()` synchronously (`await`):

| Event | Handler | Why |
|---|---|---|
| `chrome.runtime.onSuspend` | service-worker-main | SW about to idle; pending timer dies |
| Manual export (`Settings → Export`) | export handler | User-initiated, must observe latest state |
| Backup / diagnostics ZIP | log-diagnostics-export | Snapshot consistency |
| Schema migration boundary | schema-migration runner | Don't lose pre-migration state |
| Test teardown | `vitest` afterEach | Deterministic assertions |

`onSuspend` is the most critical: without it, the last 5 s of writes evaporate.

## Per-project flush

```ts
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function markProjectDirty(slug: string): void {
  if (flushTimers.has(slug)) return;
  flushTimers.set(
    slug,
    setTimeout(() => void flushProjectDb(slug), FLUSH_DEBOUNCE_MS),
  );
}

export async function flushAllProjectDbs(): Promise<void> {
  // Sequential — concurrent OPFS writes to different files are safe, but
  // chrome.storage.local serializes anyway and parallel set() bursts trigger
  // MAX_WRITE_OPERATIONS_PER_MINUTE quota. Sequential is the safe default.
  for (const slug of dbs.keys()) {
    await flushProjectDb(slug);
  }
}
```

## Error model

| Failure | Logger tag | Recovery |
|---|---|---|
| OPFS write threw | `[db-manager] flush failed` Code-Red | `dirty=true` restored; next write re-arms timer |
| storage.local quota | `[db-manager] flush failed` Code-Red + `Errors` row | Banner shown on next write; user prompted to export+purge |
| Timer never fired (SW killed) | none — drained by `onSuspend` | Boot replay covers the gap; OPFS `.sqlite` file is canonical |

## Acceptance

- [ ] `FLUSH_DEBOUNCE_MS = 5000` exists in exactly two files (`db-manager.ts`, `project-db-manager.ts`) and matches byte-for-byte.
- [ ] `chrome.runtime.onSuspend` awaits `flushIfDirty()` + `flushAllProjectDbs()` before returning.
- [ ] Burst test: 1000 sequential writes produce **one** OPFS write within 5 s (assert via spy on `saveToOpfs`).
- [ ] Flush-throws test: when `saveToOpfs` rejects, `dirty` is `true` afterwards and a subsequent `markDirty()` re-arms the timer.
- [ ] No code path calls `setInterval` for flushing — debounce only.

## See also

- [step-17](./17-persistence-backends.md) — Persistence backends waterfall
- [step-26](./26-chrome-storage-local-quota.md) — Quota
- [step-29](./29-cross-context-access.md) — `onSuspend` and cross-context drain
- Core: no-retry policy, Code-Red logging, namespaced logger

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
