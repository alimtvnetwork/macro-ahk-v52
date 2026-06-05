# 14 — Boot Failure Banner

## Why this step exists

When extension bootstrap fails (WASM load, OPFS, storage quota, migration,
schema, namespace registration, logger init), the popup must explain what
broke without requiring DevTools. Failures must survive MV3 service-worker
restart so the next popup open still shows the same diagnosis. This step owns
the persisted contract, capture flow, status round-trip, banner UI, and
support report format.

## Contract

1. **Fail-fast capture.** A single top-level `try/catch` around boot persists
   the failure and re-throws to halt boot. No retry, no backoff.
2. **Persistence survives SW restart.** Failure is written to a generic
   `chrome.storage.local` key `<extensionPrefix>_last_boot_failure`. Status
   handler merges in-memory boot state with this persisted record.
3. **Code Red shape mandatory.** Every persisted failure includes `path`,
   `missing`, `Reason`, `ReasonDetail`. Unknown fields are explicit `null`
   with reason `BootFailureContextUnavailable` (never omitted).
4. **Frozen click trail.** UI actions at failure time are snapshotted; live
   trail is fallback only when storage is denied (preview/tests).
5. **Cause classification is deterministic.** A single ordered rule table maps
   error signatures to `BootFailureCause.kind`.
6. **Dark-only semantic tokens.** Banner uses `destructive`, `background`,
   `muted`, `border` only. No raw red/black/white, no light-mode toggle.
7. **Preview-safe.** Missing `chrome.storage`, `clipboard`, or `Blob` APIs
   degrade gracefully to visible text and manual selection; never crash.
8. **Timer hygiene.** All copy/download feedback timeouts are tracked and
   cleared on unmount and `pagehide` per timer teardown policy.

## Data contract

```ts
// src/shared/boot/types.ts
export interface BootErrorContext {
  failedStep: string;            // e.g. "wasm-load", "opfs-open", "migration"
  path: string | null;           // e.g. "sqlite://Logs/Schema#migration"
  missing: string | null;        // e.g. "Errors.TimestampMs column"
  sqlOrUrl: string | null;       // failing SQL, URL, or filename
  attemptNumber: 1;              // always 1 — no retry policy
}

export interface WasmProbeResult {
  url: string;
  ok: boolean;
  status: number | null;
  contentLength: number | null;
  contentType: string | null;
  headError: string | null;
}

export interface ClickTrailEntry {
  occurredAtIso: string;
  surface: "popup" | "options" | "floating-panel" | "page";
  action: string;
  detail: string | null;
}

export type BootFailureKind =
  | "WasmUnavailable"
  | "WasmHeadFailed"
  | "OpfsUnavailable"
  | "StorageQuotaExceeded"
  | "MigrationFailed"
  | "SchemaMismatch"
  | "NamespaceInitFailed"
  | "LoggerInitFailed"
  | "Unknown";

export interface BootFailureCause {
  kind: BootFailureKind;
  recoveryHint: string;          // human, short, one sentence
}

export interface PersistedBootFailure {
  schemaVersion: 1;
  failureId: string;             // ULID-like
  occurredAtIso: string;
  buildId: string;
  extensionVersion: string;
  Reason: string;                // mandatory Code Red
  ReasonDetail: string;          // mandatory Code Red
  cause: BootFailureCause;
  context: BootErrorContext;
  wasmProbe: WasmProbeResult | null;
  frozenTrail: ClickTrailEntry[]; // snapshot at failure time
  stack: string | null;
  benignWarningCount: number;
}
```

## Storage key

```ts
// src/shared/boot/constants.ts
export const BOOT_FAILURE_STORAGE_KEY = `${EXTENSION_STORAGE_PREFIX}_last_boot_failure`;
```

Rules:

- Single key. Only the latest failure is retained (one row, overwrite on write).
- Cleared by a successful boot AFTER the success path completes (not before).

## Boot capture flow (G3)

```ts
// src/background/boot/run-boot.ts
export async function runBoot(): Promise<void> {
  let snapshot: ClickTrailEntry[] = [];
  try {
    snapshot = await freezeClickTrail();
    await bootPipeline(); // wasm → opfs → migration → schema → namespaces → logger
    await clearPersistedBootFailure(); // success path
  } catch (cause) {
    const failure = buildPersistedBootFailure(cause, snapshot);
    try {
      await persistBootFailure(failure);
    } catch (persistCause) {
      Logger.error("boot.persist", {
        path: `chrome.storage.local#${BOOT_FAILURE_STORAGE_KEY}`,
        missing: "persisted boot failure write",
        Reason: "BootFailurePersistDenied",
        ReasonDetail: String(persistCause),
      });
    }
    throw cause; // halt boot; do not retry
  }
}
```

Rules:

- Order is mandatory: freeze trail → run boot → on failure build → persist →
  re-throw. Banner cannot show inconsistent live trail data.
- `clearPersistedBootFailure()` only runs after the entire pipeline succeeds.

## Status round-trip

```ts
// src/background/status/get-status.ts
export async function getStatus(): Promise<StatusResponse> {
  const persisted = await readPersistedBootFailure();
  return {
    // ...current status fields...
    bootFailure: currentBootFailure ?? persisted ?? null,
    buildId: BUILD_ID,
  };
}
```

Rules:

- After SW restart, `currentBootFailure` is `null` but `persisted` survives so
  the popup still renders the banner.
- A successful re-boot clears the persisted key, so the banner disappears
  naturally on the next status read.

## Cause classification (G5)

Ordered rules — first match wins:

| Order | Signature                                                                 | kind                  |
|------:|---------------------------------------------------------------------------|-----------------------|
| 1     | `failedStep="wasm-load"` AND `wasmProbe.ok===false`                       | `WasmHeadFailed`      |
| 2     | `failedStep="wasm-load"`                                                  | `WasmUnavailable`     |
| 3     | `failedStep="opfs-open"`                                                  | `OpfsUnavailable`     |
| 4     | message matches `/quota|QuotaExceeded/i`                                  | `StorageQuotaExceeded`|
| 5     | `failedStep="migration"`                                                  | `MigrationFailed`     |
| 6     | `failedStep="schema-check"`                                               | `SchemaMismatch`      |
| 7     | `failedStep="namespace-init"`                                             | `NamespaceInitFailed` |
| 8     | `failedStep="logger-init"`                                                | `LoggerInitFailed`    |
| 9     | otherwise                                                                 | `Unknown`             |

Each kind has a fixed `recoveryHint` shipped in `src/shared/boot/causes.ts`.

## Banner UI contract

```tsx
// src/components/popup/BootFailureBanner.tsx
export function BootFailureBanner({ failure }: { failure: PersistedBootFailure }) {
  const timers = useTrackedTimeouts(); // tracks setTimeout, cleans on unmount + pagehide

  return (
    <section role="alert" aria-live="assertive" className="bg-destructive/10 border border-destructive">
      <header>
        <strong>Extension failed to start</strong>
        <span data-cause={failure.cause.kind}>{failure.cause.kind}</span>
      </header>
      <p>{failure.cause.recoveryHint}</p>
      <dl>
        <dt>Failed step</dt><dd>{failure.context.failedStep}</dd>
        <dt>Path</dt><dd>{failure.context.path ?? "—"}</dd>
        <dt>Missing</dt><dd>{failure.context.missing ?? "—"}</dd>
        <dt>Reason</dt><dd>{failure.Reason}</dd>
      </dl>
      <details><summary>Stack</summary><pre>{failure.stack ?? "—"}</pre></details>
      <details><summary>WASM probe</summary><pre>{JSON.stringify(failure.wasmProbe, null, 2)}</pre></details>
      <details><summary>Click trail</summary>
        <ol>{failure.frozenTrail.map((e, i) => <li key={i}>{e.occurredAtIso} — {e.action}</li>)}</ol>
      </details>
      <footer>
        <button type="button" onClick={() => copyReport("short", failure, timers)}>Copy short report</button>
        <button type="button" onClick={() => copyReport("full", failure, timers)}>Copy full report</button>
        <button type="button" onClick={() => downloadReport(failure)}>Download report</button>
      </footer>
    </section>
  );
}
```

Rules:

- Mounted in `Popup.tsx` after `VersionMismatchBanner`, before normal content.
- Long text wraps inside popup width; never overflows horizontally.
- Buttons keyboard-focusable; `aria-live="assertive"` so it is announced.

## Support report contract (G8)

Both `short` and `full` reports include:

1. **Correlation header** — `failureId`, `occurredAtIso`, `buildId`,
   `extensionVersion`, `schemaVersion`.
2. **Failed step** + `cause.kind` + `recoveryHint`.
3. **Code Red fields** — `path`, `missing`, `Reason`, `ReasonDetail`.
4. **Context** — `BootErrorContext` snapshot.
5. **WASM probe** — full `WasmProbeResult` when present.
6. **Stack** — `short` includes first 5 frames; `full` includes all.
7. **Frozen click trail** — last 10 entries (short) or all (full).
8. **Benign warning tally** — `benignWarningCount`.

Reports are plain text, copy/paste safe, no markdown formatting required.

## Preview / no-chrome mode (G10)

- `chrome.storage` missing → skip persistence; render banner from in-memory
  failure only. Show a small note: "Preview mode — failure not persisted".
- `navigator.clipboard` missing → render report text inside a focused
  `<textarea readOnly>` for manual copy.
- `Blob` / `URL.createObjectURL` missing → disable Download; keep Copy.

## Timer hygiene (G9)

```ts
// src/shared/hooks/useTrackedTimeouts.ts
export function useTrackedTimeouts() {
  const ids = useRef<Set<number>>(new Set());
  useEffect(() => {
    const teardown = () => { ids.current.forEach(window.clearTimeout); ids.current.clear(); };
    window.addEventListener("pagehide", teardown, { once: true });
    return () => { teardown(); window.removeEventListener("pagehide", teardown); };
  }, []);
  return {
    set(fn: () => void, ms: number) {
      const id = window.setTimeout(() => { ids.current.delete(id); fn(); }, ms);
      ids.current.add(id);
      return id;
    },
  };
}
```

## Pitfalls

- Reading live click trail in the banner (drifts after failure).
- Forgetting to clear persisted failure after a successful re-boot.
- Re-throwing without persisting first (loses diagnosis on SW restart).
- Retrying boot on failure (banned by no-retry policy).
- Light-mode/raw color styling on an error surface.
- Untracked `setTimeout` in copy/download feedback.
- Calling `chrome.storage` without preview-mode guard.

## Acceptance

- [ ] Top-level boot `try/catch` persists before re-throwing.
- [ ] After SW restart, popup still renders the same failure from storage.
- [ ] Successful boot clears `BOOT_FAILURE_STORAGE_KEY`.
- [ ] Persisted record always has `path`, `missing`, `Reason`, `ReasonDetail`
      (synthesized `null` + `BootFailureContextUnavailable` when unknown).
- [ ] Cause table matches first applicable rule; `Unknown` is last resort.
- [ ] Banner renders in preview without `chrome.storage` / clipboard / Blob.
- [ ] All banner timeouts cleared on unmount and `pagehide`.
- [ ] Banner uses only semantic tokens; passes dark-only audit.
- [ ] Short and full reports include all 8 required sections.

## Tests to ship

- Unit: `classify-boot-cause.test.ts` — every rule + tiebreak ordering.
- Unit: `build-boot-failure-report.test.ts` — short vs full sections.
- Unit: `persist-boot-failure.test.ts` — write, read, clear on success.
- Component: `BootFailureBanner.test.tsx` — all render states (each kind +
  preview/no-storage + no-clipboard + no-Blob).
- Storage: `boot-failure-recovery.test.ts` — simulate SW restart; popup reads
  persisted record on next `GET_STATUS`.
- Hook: `useTrackedTimeouts.test.ts` — unmount + `pagehide` teardown.
- Manual Chrome: install → force boot failure (rename wasm) → reload extension
  → reopen popup → banner still shown with same `failureId`.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every extension numeric (alarm intervals, debounce ms, retry counts=0, sentinel TTL, badge text limits) to a constant in `src/shared/constants.ts` or a local `*-defaults.ts` module. Inline literals are rejected by code review.
- **MUST** gate auto-injector and project-matcher with `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` — never run on `about:blank`, `chrome://newtab/`, or empty URLs (see `mem://features/new-tab-no-url-guard`).
- **MUST** route every failure through `RiseupAsiaMacroExt.Logger.error` with `Reason`+`ReasonDetail` and surface boot-time failures via `BootFailureBanner`. Bare `console.error` is rejected by `public/logger-compliance-audit.json`.
- **MUST** pair every `setInterval` / `setTimeout` / `MutationObserver` / event listener with a teardown registered on `pagehide` (see `mem://standards/timer-and-observer-teardown`). Tick UIs MUST pause on `document.hidden`.

## Pitfalls / Counter-examples

- ❌ `catch (caught) { /* ignore */ }` around `chrome.runtime.sendMessage`. ✅ `Logger.error('scope', 'send failed', caught)` and re-throw (see `public/error-swallow-audit.json`).
- ❌ Calling `chrome.scripting.executeScript` on a new-tab URL because the matcher did not gate it. ✅ Always call `isNewTabOrBlankUrl(tab.url)` first; treat true as a non-error skip.
- ❌ Storing a timestamp as `new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })`. ✅ Store `Date.now()` ms UTC; render with `Intl.DateTimeFormat().resolvedOptions().timeZone` (see `mem://localization/timezone`).
- ❌ Retrying `fetch` with `for (let i=0;i<3;i++)` and exponential backoff after a 4xx/5xx. ✅ Use `httpFetchOrThrow` / `httpFailFast` from `src/shared/http-fail-fast.ts`; one attempt, then halt (see `.lovable/checklists/http-fail-fast.md`).
- ❌ Injecting the same content-script twice because the sentinel check was skipped. ✅ Read `#marco-css-sentinel` / data-attribute sentinel before re-injection (see `09-injection-idempotency-sentinel.md`).
