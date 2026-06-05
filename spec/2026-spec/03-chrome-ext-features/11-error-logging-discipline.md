# 11 — Error Logging Discipline

## Why this step exists

The root cause of repeated failed fixes is usually not the first exception; it
is vague logging after the exception. A log that says "failed to inject" or
"script missing" does not tell the next developer, tester, or AI what path was
read, what item was expected, which stage failed, whether selectors matched, or
which variable value was unresolved. This step makes every hard failure
diagnosable from the log row alone.

## Contract

1. **Code Red shape is mandatory.** Every hard failure MUST include exact
   `path`, `missing`, `Reason`, and `ReasonDetail` fields.
2. **Context is mandatory.** Extension failures MUST include build id, source
   context, tab id or `null`, URL or `null`, active stage/step, and trigger
   source when known.
3. **Diagnostics arrays are mandatory.** Every failure log MUST include
   `SelectorAttempts` and `VariableContext`. If not applicable, write an empty
   array plus a reason in `ReasonDetail`; never omit the keys.
4. **Use namespace logger only.** Page MAIN-world runtime uses
   `RiseupAsiaMacroExt.Logger.error()`. Background, popup, and options code use
   the shared `Logger.error()` wrapper. Bare `console.log`, `log()`, swallowed
   catches, and silent returns are forbidden for errors.
5. **Fail-fast.** Logging a failure does not authorize retry. The owning flow
   returns a typed failure result and stops, following the no-retry policy.
6. **Verbose data gate.** `logCodeRedFailure()` is the only truncation/masking
   owner. Callers pass raw designed values; the helper reads cached
   `Project.VerboseLogging` and applies `TRUNC_DEFAULT_CHARS = 120` for normal
   text plus `TRUNC_LONG_FIELD_CHARS = 240` for HTML/log-line fields.
7. **Human and machine readable.** The same structured fields are written to
   SQLite/OPFS and mirrored to DevTools; do not create a console-only error.
8. **One failure, one row.** Deduplicate repeated probe/status failures by a
   stable key in `globalThis.__codeRedDedup` for the service-worker lifetime;
   persisted stores update `RepeatCount` and `LastSeenIso` when supported.

## Code Red event contract

```ts
// src/shared/logging/code-red-types.ts
import type { JsonValue } from "@shared/types";

export interface SelectorAttemptLog {
  attemptId: string | null;
  strategy: string;
  expression: string;
  matched: boolean;
  matchCount: number;
  reason: string;
}

export interface VariableContextLog {
  name: string;
  source: string;
  row: number | null;
  column: number | null;
  resolvedValue: JsonValue | null;
  type: string;
  reason: string;
}

export interface CodeRedLogEvent {
  level: "error";
  namespace: string;
  message: string;
  path: string;
  missing: string;
  Reason: string;
  ReasonDetail: string;
  buildId: string;
  sourceContext: "background" | "popup" | "options" | "content-isolated" | "page-main";
  tabId: number | null;
  url: string | null;
  stage: string | null;
  triggerSource: string | null;
  SelectorAttempts: SelectorAttemptLog[];
  VariableContext: VariableContextLog[];
  occurredAtIso: string;
}
```

Field rules:

- `path` is the exact source file, storage key, URL, or extension bundle path
  that failed.
- `missing` is the specific item expected: script id, selector, module id,
  storage key, message kind, permission, tab, or API method.
- `Reason` is a short stable code such as `MissingBundlePath`,
  `InjectionStageFailed`, `SelectorNotFound`, or `ProbeFailed`.
- `ReasonDetail` is a full sentence that explains what was attempted and why it
  failed.
- `SelectorAttempts` records every selector tried, not only the final selector;
  `attemptId` is a stable per-step label such as `primary`, `fallback-1`, or
  `text-contains`, never the DOM `id` attribute.
- `VariableContext` records every variable used by the failing step, including
  row/column when the value came from tabular data.
- Complex `resolvedValue` entries stay JSON-compatible. They are stringified
  only at render/export boundaries, then truncated by the verbose gate.
- Sensitive variable names matching
  `/^(password|pwd|token|bearer|secret|api[-_]?key|authorization|cookie|otp|pin|ssn|cvv|card)$/i`
  are persisted as `***masked(len=<n>)***`.

## Logger helper

```ts
// src/shared/logging/code-red.ts
import { BUILD_ID } from "@shared/constants";
import { Logger } from "@shared/logger";

export function logCodeRedFailure(event: Omit<CodeRedLogEvent, "level" | "buildId" | "occurredAtIso">): void {
  let occurredAtIso = "1970-01-01T00:00:00.000Z";
  try {
    occurredAtIso = new Date().toISOString();
  } catch {
    occurredAtIso = "1970-01-01T00:00:00.000Z";
  }

  Logger.error(event.namespace, {
    ...event,
    level: "error",
    buildId: BUILD_ID,
    occurredAtIso,
    SelectorAttempts: event.SelectorAttempts ?? [],
    VariableContext: event.VariableContext ?? [],
  });
}
```

Rules:

- Callers must pass designed typed values. Do not accept arbitrary error shapes.
- The helper may normalize empty arrays, but callers still own meaningful
  `ReasonDetail` text.
- The helper owns verbose-gate truncation/masking and timestamp fallback.
- The helper must not throw. If persistence fails, mirror to DevTools and return
  a typed logging failure to the caller's diagnostics sink.

## Required catch pattern

```ts
// src/background/injection/injector.ts
try {
  await executeInjectionStage(request);
} catch (caught) {
  const err = caught as CaughtError;

  logCodeRedFailure({
    namespace: "Injection.Failed",
    message: "Injection pipeline stopped before ready state",
    path: "src/background/injection/injector.ts",
    missing: "successful injection lifecycle completion",
    Reason: "InjectionStageFailed",
    ReasonDetail: err?.message ?? `Stage ${stage} failed without a message`,
    sourceContext: "background",
    tabId: request.tabId,
    url: request.url,
    stage,
    triggerSource: request.triggerSource,
    SelectorAttempts: [],
    VariableContext: [],
  });

  return {
    ok: false,
    tabId: request.tabId,
    stage,
    reason: "InjectionStageFailed",
    reasonDetail: err?.message ?? `Stage ${stage} failed without a message`,
    buildId: BUILD_ID,
  };
}
```

Rules:

- Catch once at the boundary that can add useful context.
- Convert the caught value to `CaughtError`; do not introduce generic
  `unknown` parameters elsewhere.
- Log before returning the typed failure.
- Do not continue the pipeline after logging.

## Selector failure shape

```ts
logCodeRedFailure({
  namespace: "Recorder.SelectorFailed",
  message: "Click step could not resolve a target element",
  path: "src/content/recorder/click-step.ts",
  missing: "click target element",
  Reason: "SelectorNotFound",
  ReasonDetail: "All selector attempts returned zero matches for the current document",
  sourceContext: "page-main",
  tabId,
  url: location.href,
  stage: "resolve-click-target",
  triggerSource: "replay-step",
  SelectorAttempts: [
    {
      attemptId: "primary-data-testid",
      strategy: "data-testid",
      expression: "[data-testid='submit']",
      matched: false,
      matchCount: 0,
      reason: "No element matched data-testid",
    },
  ],
  VariableContext: [],
});
```

Selector rules:

- Include every attempted selector in execution order.
- Include `matchCount` even when zero.
- Include a reason for rejecting matches, such as hidden, disabled, detached,
  duplicate, offscreen, or wrong text.

## Variable failure shape

```ts
logCodeRedFailure({
  namespace: "Replay.VariableFailed",
  message: "Replay step could not resolve a data variable",
  path: "src/content/replay/variable-resolver.ts",
  missing: "variable customer.email",
  Reason: "VariableMissing",
  ReasonDetail: "Variable customer.email was requested by step 4 but the active data row has no email column",
  sourceContext: "page-main",
  tabId,
  url: location.href,
  stage: "resolve-variable",
  triggerSource: "replay-step",
  SelectorAttempts: [],
  VariableContext: [
    {
      name: "customer.email",
      source: "csv-row",
      row: 4,
      column: null,
      resolvedValue: null,
      type: "missing",
      reason: "Column email does not exist in the active data source",
    },
  ],
});
```

Variable rules:

- Sensitive values are masked by the helper as `***masked(len=<n>)***`.
- If verbose logging is off, truncate normal text to 120 chars and long
  HTML/log fields to 240 chars.
- If value type cannot be derived, log `type="unresolved"` and explain why in
  `reason`.

## Storage and file failures

Storage/file failures must identify the exact failing key/path and the fallback
that was attempted.

```ts
logCodeRedFailure({
  namespace: "BuiltinScripts.Missing",
  message: "Built-in script was missing after self-heal",
  path: "chrome.storage.local[script:sdk-preamble]",
  missing: "script id builtin_sdk_preamble_v1",
  Reason: "StorageKeyEmptyAndFallbackMissing",
  ReasonDetail: "Storage key was empty and bundled fallback /scripts/sdk-preamble.js was not found in the extension package",
  sourceContext: "background",
  tabId: null,
  url: null,
  stage: "load-builtin-script",
  triggerSource: "startup",
  SelectorAttempts: [],
  VariableContext: [],
});
```

Rules:

- For `chrome-extension://` fetches, log the full absolute URL.
- For `chrome.storage.local`, log the exact key.
- For SQLite, use `sqlite://<dbName>/<table>#<statementPurpose>` such as
  `sqlite://session/error_events#insertCodeRed`.
- Never log private tokens or bearer values.

## DevTools mirroring

The persistent log row is source of truth. DevTools mirrors must preserve the
same fields in a readable group.

```text
❌ Injection.Failed — InjectionStageFailed
  Path: src/background/injection/injector.ts
  Missing: successful injection lifecycle completion
  ReasonDetail: Stage executing-iife failed: /dist/content/runtime.iife.js missing
  BuildId: 3.40.0+abc123
  TabId: 123
  Stage: executing-iife
```

Rules:

- Use `console.groupCollapsed` only through the centralized diagnostics mirror.
- Do not create one-off `console.error` formats in feature code.
- Console output must not contain more sensitive data than persistent logs.

## Deduplication

Status probes, heartbeat checks, and watcher pings can fail repeatedly. Log the
first Code Red row per session for the same failure key and increment a counter
for later occurrences.

Recommended key:

```ts
const dedupeKey = `${event.namespace}|${event.Reason}|${event.path}|${event.tabId ?? "none"}|${event.stage ?? "none"}`;
```

Rules:

- Deduplication must not hide the latest UI status.
- The first row keeps full diagnostics.
- Later repeats update `repeatCount` and `lastSeenIso` where the log store
  supports updates; otherwise keep the first row only and expose live status in
  memory.

## Pitfalls

- **Logging only `err.message`** — it loses path, missing item, and stage.
- **Omitting diagnostic arrays** because they are "not relevant" — include empty
  arrays so downstream tooling can rely on the schema.
- **Using `console.log` in MAIN world** — use `RiseupAsiaMacroExt.Logger.error()`
  after namespace logger setup.
- **Logging full HTML by default** — gated by `Project.VerboseLogging` only.
- **Retrying after logging** — Code Red is a stop signal, not a retry ticket.
- **Writing different shapes per feature** — every hard failure must share the
  Code Red fields.

## Acceptance

- [ ] Every hard failure log includes `path`, `missing`, `Reason`, and
      `ReasonDetail`.
- [ ] Every hard failure includes `SelectorAttempts` and `VariableContext` keys.
- [ ] Selector failures include all selector attempts with match counts and
      rejection reasons.
- [ ] Variable failures include source, row/column, resolved value or null,
      type, and reason.
- [ ] MAIN-world errors use `RiseupAsiaMacroExt.Logger.error()`; no bare `log()`
      or one-off `console.log` error paths remain.
- [ ] Verbose-only data is gated by `Project.VerboseLogging` and sensitive data
      is masked.
- [ ] Probe/status failures are deduped per session without hiding live UI
      status.

## Tests to ship with this step

- Unit: `code-red-log-shape.test.ts` — asserts mandatory fields and diagnostic
  arrays are always present.
- Unit: `selector-diagnostics.test.ts` — asserts every selector attempt is
  captured in order with `matchCount` and rejection reason.
- Unit: `variable-context.test.ts` — asserts row/column/source/type/reason are
  captured and sensitive values are masked.
- Unit: `logging-dedupe.test.ts` — asserts repeated probe failures create one
  full row and update repeat metadata.
- Static audit: forbid bare `log()` and feature-local `console.log` error paths
  outside the centralized diagnostics mirror.