# 13 — Error Routing and Errors Panel

## Why this step exists

Steps 11 and 12 make errors structured and persistent. This step makes them
visible and actionable through a single background-owned route: logger write →
SQLite insert → unresolved count recompute → `ERROR_COUNT_CHANGED` broadcast →
UI badge → Errors panel → diagnostics export. Without one owner, the UI shows
stale counts, blank panels, or detail rows that disagree with the badge.

## Contract

1. **SQLite is source of truth.** Error rows are read from the same log store
   written by the namespace logger. No parallel error database.
2. **Background owns all mutations.** Popup, options, panel, and floating UI
   never write directly; they send typed envelopes to the background.
3. **Sender-origin enforcement.** Resolve and clear are only honored from
   trusted extension contexts (`popup`, `options`, `floating-panel`). Page MAIN
   and content-script-originated messages are rejected with
   `Reason="ResolveOriginNotAllowed"`.
4. **Broadcast on change.** Every insert, resolve, or clear recomputes the
   summary and broadcasts `ERROR_COUNT_CHANGED` after the DB write commits.
5. **Polling is fallback only.** UI hooks listen for broadcasts; a single
   per-mount 30s interval is the only fallback, paused while `document.hidden`.
6. **Casing normalization is mandatory.** PascalCase SQLite rows and camelCase
   frontend rows are unified by `normalizeLogRow()` before counting or render.
7. **No retry loops.** Failed fetches return typed failure envelopes. No
   recursive retry, no exponential backoff (per `mem://constraints/no-retry-policy`).
8. **No explicit `unknown`.** All handler inputs are validated by type guards
   against designed unions (per `mem://standards/unknown-usage-policy`).

## Message contract (G1, G4)

```ts
// src/shared/messages.ts
export const MSG_GET_ERROR_SUMMARY = "errors/get-summary" as const;
export const MSG_GET_ERROR_ROWS = "errors/get-rows" as const;
export const MSG_RESOLVE_ERROR = "errors/resolve" as const;
export const MSG_CLEAR_RESOLVED_ERRORS = "errors/clear-resolved" as const;
export const ERROR_COUNT_CHANGED = "errors/count-changed" as const;

export type TrustedSourceContext = "popup" | "options" | "floating-panel";

export interface GetErrorSummaryRequest {
  kind: typeof MSG_GET_ERROR_SUMMARY;
  sourceContext: TrustedSourceContext | "background";
}

export interface GetErrorRowsRequest {
  kind: typeof MSG_GET_ERROR_ROWS;
  sourceContext: TrustedSourceContext | "background";
  filter: {
    includeResolved: boolean;
    sinceIso: string | null;
    namespace: string | null;
    Reason: string | null;
    limit: number; // bounded 1..500
  };
}

export interface ResolveErrorRequest {
  kind: typeof MSG_RESOLVE_ERROR;
  sourceContext: TrustedSourceContext;
  id: string;
  resolvedBy: "user" | "system";
}

export interface ClearResolvedErrorsRequest {
  kind: typeof MSG_CLEAR_RESOLVED_ERRORS;
  sourceContext: TrustedSourceContext;
}

export type ErrorRoutingRequest =
  | GetErrorSummaryRequest
  | GetErrorRowsRequest
  | ResolveErrorRequest
  | ClearResolvedErrorsRequest;

export type ErrorRoutingResponse<T> =
  | { ok: true; data: T; buildId: string }
  | { ok: false; Reason: string; ReasonDetail: string; buildId: string };

export interface ErrorCountChangedMessage {
  kind: typeof ERROR_COUNT_CHANGED;
  unresolvedCount: number;
  last24hUnresolvedCount: number;
  last24hTotalCount: number;
  buildId: string;
  occurredAtIso: string;
  dirtyRows: true;
}

export function isErrorRoutingRequest(value: unknown): value is ErrorRoutingRequest {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === MSG_GET_ERROR_SUMMARY ||
    kind === MSG_GET_ERROR_ROWS ||
    kind === MSG_RESOLVE_ERROR ||
    kind === MSG_CLEAR_RESOLVED_ERRORS
  );
}
```

Rules:

- Broadcast payloads carry counts only, never row details.
- `dirtyRows: true` tells open panels to refetch rows once (G8).
- Bounded `limit` prevents accidental megaqueries.

## Error row contract (G7)

```ts
// src/shared/errors/types.ts
export interface ErrorPanelRow {
  id: string;
  timestampIso: string;
  namespace: string;
  message: string;
  path: string | null;
  missing: string | null;
  Reason: string;
  ReasonDetail: string;
  sourceContext: "background" | "popup" | "options" | "content-isolated" | "page-main";
  tabId: number | null;
  url: string | null;
  stage: string | null;
  triggerSource: string | null;
  resolved: boolean;
  resolvedAtIso: string | null;
  resolvedBy: "user" | "system" | null;
  repeatCount: number;
  SelectorAttempts: SelectorAttemptLog[];
  VariableContext: VariableContextLog[];
  normalizationWarnings: string[]; // e.g. ["LegacyLogMissingReasonDetail"]
}

export interface ErrorSummary {
  unresolvedCount: number;          // global unresolved
  last24hUnresolvedCount: number;   // for badges
  last24hTotalCount: number;        // for panel analytics
  newestErrorIso: string | null;
  byReason: Array<{ Reason: string; count: number }>;
  byNamespace: Array<{ namespace: string; count: number }>;
}
```

Rules:

- Missing legacy fields become `null` plus an entry in `normalizationWarnings`
  (never silent). Exports MUST include warnings beside any synthesized `null`
  (Code Red shape preserved).
- `repeatCount` defaults to `1` when absent.

## Background routing handler (G2, G3, G4, G10)

```ts
// src/background/errors/error-routing-handler.ts
import { BUILD_ID } from "@shared/constants";
import {
  ERROR_COUNT_CHANGED,
  ErrorRoutingRequest,
  ErrorRoutingResponse,
  MSG_CLEAR_RESOLVED_ERRORS,
  MSG_GET_ERROR_ROWS,
  MSG_GET_ERROR_SUMMARY,
  MSG_RESOLVE_ERROR,
  TrustedSourceContext,
  isErrorRoutingRequest,
} from "@shared/messages";
import { Logger } from "@shared/logging/namespace-logger";

const TRUSTED: ReadonlySet<TrustedSourceContext> = new Set([
  "popup",
  "options",
  "floating-panel",
]);

function reply<T>(
  sendResponse: (r: ErrorRoutingResponse<T>) => void,
  Reason: string,
  ReasonDetail: string,
): void {
  sendResponse({ ok: false, Reason, ReasonDetail, buildId: BUILD_ID });
}

export function bindErrorRoutingHandler(): void {
  chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
    if (!isErrorRoutingRequest(raw)) {
      return false;
    }
    const req = raw;

    // Origin gate: any sender with tab.id is a content-script context.
    const fromContent = sender.tab?.id != null;
    if (
      (req.kind === MSG_RESOLVE_ERROR || req.kind === MSG_CLEAR_RESOLVED_ERRORS) &&
      (fromContent || !TRUSTED.has(req.sourceContext as TrustedSourceContext))
    ) {
      reply(
        sendResponse,
        "ResolveOriginNotAllowed",
        `sourceContext=${req.sourceContext} fromTab=${fromContent}`,
      );
      return true;
    }

    void handle(req)
      .then(sendResponse)
      .catch((cause) => {
        Logger.error("errors.routing", {
          path: "background://errors/error-routing-handler",
          missing: "successful handler completion",
          Reason: "ErrorRoutingHandlerThrew",
          ReasonDetail: String(cause),
        });
        reply(sendResponse, "ErrorRoutingHandlerThrew", String(cause));
      });
    return true; // async sendResponse
  });
}

async function handle(req: ErrorRoutingRequest): Promise<ErrorRoutingResponse<unknown>> {
  switch (req.kind) {
    case MSG_GET_ERROR_SUMMARY: {
      const data = await getErrorSummary();
      return { ok: true, data, buildId: BUILD_ID };
    }
    case MSG_GET_ERROR_ROWS: {
      const data = await getErrorRows(req.filter);
      return { ok: true, data, buildId: BUILD_ID };
    }
    case MSG_RESOLVE_ERROR: {
      await logStore.resolveError(req.id, req.resolvedBy);
      await broadcastErrorCountChanged();
      return { ok: true, data: { id: req.id }, buildId: BUILD_ID };
    }
    case MSG_CLEAR_RESOLVED_ERRORS: {
      const removed = await logStore.clearResolvedErrors();
      await broadcastErrorCountChanged();
      return { ok: true, data: { removed }, buildId: BUILD_ID };
    }
  }
}

export async function broadcastErrorCountChanged(): Promise<void> {
  let summary: ErrorSummary;
  try {
    summary = await getErrorSummary();
  } catch (cause) {
    Logger.error("errors.routing", {
      path: "sqlite://Logs/Errors#get-summary",
      missing: "summary aggregation",
      Reason: "ErrorSummaryComputationFailed",
      ReasonDetail: String(cause),
    });
    return; // fail-fast, no retry
  }

  const message: ErrorCountChangedMessage = {
    kind: ERROR_COUNT_CHANGED,
    unresolvedCount: summary.unresolvedCount,
    last24hUnresolvedCount: summary.last24hUnresolvedCount,
    last24hTotalCount: summary.last24hTotalCount,
    buildId: BUILD_ID,
    occurredAtIso: new Date().toISOString(),
    dirtyRows: true,
  };

  // Phase 1: runtime fan-out (popup/options/floating). Closed contexts are normal.
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    /* not Code Red */
  }

  // Phase 2: tabs fan-out, each guarded independently.
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({});
  } catch (cause) {
    const detail = String(cause);
    if (detail.includes("Extension context invalidated")) {
      return; // terminal, no retry
    }
    Logger.error("errors.routing", {
      path: "chrome.tabs.query",
      missing: "tabs list",
      Reason: "TabsQueryFailed",
      ReasonDetail: detail,
    });
    return;
  }

  for (const tab of tabs) {
    if (tab.id == null) continue;
    void chrome.tabs.sendMessage(tab.id, message).catch(() => {
      /* tabs without relay: expected, no retry */
    });
  }
}
```

## Summary computation (G5, G6)

```ts
// src/background/errors/error-store.ts
export async function getErrorSummary(): Promise<ErrorSummary> {
  const sinceMs = Date.now() - 86_400_000;
  // SQL MUST be: SELECT ... FROM Errors WHERE TimestampMs >= ?
  //              ORDER BY TimestampIso DESC, Id DESC
  const last24hRowsRaw = await logStore.getErrorRows({
    sinceMs,
    includeResolved: true,
    orderBy: "TimestampIso DESC, Id DESC",
  });
  const last24h = last24hRowsRaw.map(normalizeLogRow);

  const unresolvedAllRaw = await logStore.countUnresolved();
  const unresolved24h = last24h.filter((r) => !r.resolved);

  return {
    unresolvedCount: unresolvedAllRaw,
    last24hUnresolvedCount: unresolved24h.length,
    last24hTotalCount: last24h.length,
    newestErrorIso: last24h[0]?.timestampIso ?? null,
    byReason: countBy(unresolved24h, "Reason"),
    byNamespace: countBy(unresolved24h, "namespace"),
  };
}
```

Rules:

- SQL `ORDER BY TimestampIso DESC, Id DESC` is required; `newestErrorIso` is
  taken from the sorted result, not from raw insert order.
- `unresolvedCount` is global; `last24h*` is windowed.
- DB timestamp drives windowing, never the UI clock.

## UI panel contract

Reachable from Status & Health (step 07) Errors row, popup footer, options
Activity Log, and floating-panel badge. Sections: summary header, filters,
list, details drawer, actions (copy JSON, mark resolved, clear resolved,
export diagnostics).

```tsx
// src/popup/errors/ErrorsPanel.tsx
export function ErrorsPanel() {
  const summary = useErrorSummary();
  const rows = useErrorRows();

  if (summary.state === "preview") {
    return <section role="status">Preview mode — error store unavailable.</section>;
  }
  if (summary.state === "loading") {
    return <section role="status">Loading errors…</section>;
  }
  if (summary.state === "failed") {
    return (
      <section role="alert">
        <strong>{summary.Reason}</strong>
        <p>{summary.ReasonDetail}</p>
      </section>
    );
  }
  if (rows.items.length === 0) {
    return <section role="status">No unresolved errors.</section>;
  }
  return (
    <section aria-label="Errors">
      <header>
        <strong>{summary.data.unresolvedCount}</strong>
        <span>unresolved</span>
        <span aria-label="last 24h unresolved">
          {summary.data.last24hUnresolvedCount} / {summary.data.last24hTotalCount}
        </span>
      </header>
      {rows.items.map((row) => (
        <article key={row.id} data-reason={row.Reason}>
          <h3>{row.namespace}</h3>
          <p>{row.Reason}</p>
          <code>{row.path ?? "—"}</code>
          {row.normalizationWarnings.length > 0 && (
            <span data-warning>{row.normalizationWarnings.join(",")}</span>
          )}
          <button type="button" onClick={() => rows.openDetails(row.id)}>Details</button>
        </article>
      ))}
    </section>
  );
}
```

## Broadcast hook (G8, G9)

```ts
// src/popup/errors/useErrorSummary.ts
export function useErrorSummary(): ErrorSummaryState {
  const [state, setState] = useState<ErrorSummaryState>({ state: "loading" });
  const visibleRef = useRef(true);

  useEffect(() => {
    let intervalId: number | null = null;

    const refresh = async (): Promise<void> => {
      const res = await sendErrorRoutingRequest({
        kind: MSG_GET_ERROR_SUMMARY,
        sourceContext: "popup",
      });
      setState(res.ok
        ? { state: "ready", data: res.data, buildId: res.buildId }
        : { state: "failed", Reason: res.Reason, ReasonDetail: res.ReasonDetail });
    };

    const onMessage = (m: unknown): void => {
      if (!isErrorCountChanged(m)) return;
      setState((current) =>
        current.state === "ready"
          ? {
              ...current,
              data: {
                ...current.data,
                unresolvedCount: m.unresolvedCount,
                last24hUnresolvedCount: m.last24hUnresolvedCount,
                last24hTotalCount: m.last24hTotalCount,
              },
            }
          : current,
      );
    };

    const onVisibility = (): void => {
      visibleRef.current = !document.hidden;
    };

    chrome.runtime.onMessage.addListener(onMessage);
    document.addEventListener("visibilitychange", onVisibility);
    void refresh();

    intervalId = window.setInterval(() => {
      if (visibleRef.current) void refresh();
    }, 30_000);

    const teardown = (): void => {
      chrome.runtime.onMessage.removeListener(onMessage);
      document.removeEventListener("visibilitychange", onVisibility);
      if (intervalId !== null) window.clearInterval(intervalId);
      intervalId = null;
    };

    window.addEventListener("pagehide", teardown, { once: true });
    return teardown;
  }, []);

  return state;
}
```

Rules:

- Exactly one interval per mount. `pagehide` and unmount both teardown.
- Hidden tabs pause polling (per `mem://standards/timer-and-observer-teardown`).
- Poll failure renders a typed warning; never spams Code Red.

## Resolving and clearing (G10)

- `MSG_RESOLVE_ERROR` sets `resolved=true`, `resolvedAtIso`, `resolvedBy`.
- `MSG_CLEAR_RESOLVED_ERRORS` deletes or archives only resolved rows.
- Unresolved Code Red rows are never removed by clear.
- Background rejects both from page MAIN / content-script senders.
- Write completes → recompute summary → broadcast → respond.

## Diagnostics export (G11)

ZIP MUST include:

- summary counts (all three),
- unresolved rows, plus resolved rows when filter requested,
- injection events and per-script final status,
- build id, extension version, schema version,
- normalized PascalCase + camelCase fields with `normalizationWarnings`,
- when present: `marco_last_boot_failure` (step 14), `WasmProbeResult`,
  frozen click trail, benign-warning tally.

## Pitfalls

- Counting in popup from stale rows — background owns counts.
- Polling faster than 30s or while hidden.
- Deleting unresolved errors via blanket clear.
- Rendering raw SQLite rows without normalization.
- Treating closed-tab broadcast failure as Code Red.
- Treating `Extension context invalidated` as a retryable error.

## Acceptance (G12)

- [ ] Every insert/resolve/clear broadcasts `ERROR_COUNT_CHANGED` after DB commit.
- [ ] Resolve/clear from page MAIN sender returns `ResolveOriginNotAllowed`.
- [ ] Status panel Errors row shows `last24hUnresolvedCount`.
- [ ] PascalCase SQLite rows, camelCase frontend rows, and mixed legacy rows
      all normalize without crash; missing fields → `null` + `normalizationWarnings`.
- [ ] `buildId` mismatch surfaces a warning banner; counts are NOT overwritten
      from a stale build broadcast.
- [ ] Hooks have exactly one interval, pause on hidden, teardown on `pagehide`.
- [ ] Diagnostics export contains Code Red fields, selector attempts, variable
      context, and `normalizationWarnings`.

## Tests to ship

- Unit: `error-summary.test.ts` — three count fields + ORDER BY semantics.
- Unit: `error-broadcast.test.ts` — insert/resolve/clear → broadcast after commit.
- Unit: `error-routing-origin.test.ts` — page-main resolve rejected.
- Unit: `normalize-log-row.test.ts` — PascalCase, camelCase, mixed, legacy.
- Unit: `build-id-mismatch.test.ts` — stale build broadcast does not overwrite.
- Hook: `useErrorSummary.test.ts` — broadcast update, 30s poll, hidden pause,
  `pagehide` teardown, single interval invariant.
- Component: `ErrorsPanel.test.tsx` — loading/empty/failed/preview/list states.
- Export: `diagnostics-export-errors.test.ts` — normalized rows + warnings.

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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

