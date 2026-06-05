# Audit 09 — Injection Idempotency Sentinel

- **Source spec**: `../09-injection-idempotency-sentinel.md`
- **Audit date**: 2026-06-05 (Asia/Kuala_Lumpur)
- **Audited against**: `mem://architecture/script-injection-lifecycle`,
  `mem://architecture/injection-cache-management`,
  `mem://architecture/injection-context-awareness`,
  `mem://features/new-tab-no-url-guard`,
  `mem://constraints/no-retry-policy`,
  `mem://standards/error-logging-via-namespace-logger.md`,
  `mem://standards/verbose-logging-and-failure-diagnostics`.

## Score: 78 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 |    21 |
| Determinism (AI can implement)  |     25 |    19 |
| Completeness of acceptance      |     20 |    15 |
| Cross-references                |     15 |    11 |
| Pitfalls coverage               |     15 |    12 |
| **Total**                       |    100 |  **78** |

## Gap analysis

### G1 — `InjectionResult` shape drift between specs (Critical)
Step 08 declares `InjectionSuccess` with fields `ok | tabId | stage |
injectedScriptIds | buildId`. The integration snippet here returns an extra
`reason: "AlreadyInjected"` field. **Fix:** add `reason?: string` to
`InjectionSuccess` in step 08 OR introduce a discriminated `InjectionOutcome`
union (`fresh | already-injected | guarded`). Right now the snippet does not
type-check against step 08's interface.

### G2 — Sentinel `args:` cannot pass `CaughtError` typed function (Critical, runtime)
The `func` body references `CaughtError` (a TS type) and uses `JSON.parse`. Per
Chrome scripting, `func` is serialized to a string and runs in the page;
`CaughtError` is not available at runtime, and the TS cast is fine, but the
function uses `try/catch` correctly. The real issue: **`args` must be
JSON-serializable**, which the constants are, but no test asserts the
constants are passed in declared order. **Fix:** add unit "asserts probe
function arity equals args length" and explicitly note "`func` runs in MAIN
world without access to `@shared/*` imports".

### G3 — Race: probe runs concurrently with `markInjected`
If two `injectIntoTab` calls land within ~50 ms (popup double-click + auto-
injector on same tab), both probes return `Missing`, both run the lifecycle,
and the second `markInjected` overwrites the first's `scriptIds`. **Fix:** add
"per-tab in-flight mutex" rule with concrete impl: `const inFlight = new
Map<number, Promise<InjectionResult>>()` in `injector.ts`; subsequent calls
for the same `tabId` await the existing promise.

### G4 — `installedAt` is a wall-clock ISO without timezone note
Per Core memory, timestamps are Asia/Kuala_Lumpur. The sentinel writes
`new Date().toISOString()` (UTC). That's fine for storage, but **the Status
panel's "installed Xs ago" calculation must use the same epoch source**. **Fix:**
state "sentinel stores UTC ISO; UI converts to Asia/Kuala_Lumpur display only
at render time via `formatRelativeMy()`".

### G5 — `result?.result` truthiness collapses a valid Missing state
`return result?.result ?? { reason: "ProbeFailed", ... }` — but `result.result`
is a defined object on the Missing path; the nullish-coalesce is correct.
However if the page has no `documentElement` (sandboxed iframe target), Chrome
returns `[]`. **Fix:** add explicit check `if (!result) return { reason:
"ProbeFailed", reasonDetail: "no frame result" }` BEFORE the optional-chain
fallback, and add test `sentinel-empty-frames.test.ts`.

### G6 — `ATTR_SCRIPT_IDS` JSON size unbounded
A workspace with 200 scripts inflates the attribute past 64 KB and risks DOM
mutation observers spamming. **Fix:** cap to `MAX_SENTINEL_SCRIPT_IDS = 64`;
overflow stores hash + count: `"sha1:abcd...,count:200"`.

### G7 — `Sentinel.Present` log can leak into hot path
Logging on every probe (every 2 s from Status panel) floods the diagnostics
stream. **Fix:** spec must say "Present is sampled at 1 log per
(tabId, buildId) per SW lifetime; subsequent presences are silent".

### G8 — No contract for iframes / cross-origin frames
`documentElement` only marks the top frame. If the resolver targets an iframe
via `frameIds`, the sentinel will silently report Missing forever. **Fix:**
add explicit "top-frame only" rule, and `Reason="UnsupportedFrameTarget"` for
iframe injection requests.

### G9 — `clearInjectionSentinel` referenced but lives in step 10
Cross-reference says "Step 10 owns clearing" but the helper is shown inside
step 10 as `clearInjectionSentinel` in `sentinel.ts`. The ownership boundary is
correct; the **file path is shared**, which contradicts "step 10 owns". **Fix:**
clarify: "file ownership is shared; behavioral ownership of *when to clear* is
step 10. Both helpers live in `src/background/injection/sentinel.ts`."

### G10 — Acceptance lacks a regression for verbose-logging gate
Per `mem://standards/verbose-logging-and-failure-diagnostics`, full HTML/Text is
gated by per-project `VerboseLogging`. The probe currently includes no HTML
capture (correct), but spec never says so. **Fix:** acceptance "sentinel probe
NEVER captures `document.documentElement.outerHTML` regardless of verbose
toggle; sentinel is metadata only".

### G11 — Missing pitfall: page replaces `<html>` via `document.write`
Some SPAs rewrite the root element; the sentinel attributes vanish silently.
**Fix:** pitfall + acceptance "If `documentElement` reference changes after
mark, the next probe will return Missing → re-inject path engages; this is
intentional and not Code Red".

### G12 — No `dist`-vs-`source` clarification for sentinel scripts
Audit 08 G1/G2 applies here: `world: "MAIN"` + `func:` is serialized inline,
so no `files:` issue here — but spec should explicitly note "sentinel uses
`func:` form intentionally to avoid bundling a separate JS artifact and to
keep the sentinel atomic across builds".

## Remaining audits (post this turn)

1. 10-reinject-and-uninject
2. 11-error-logging-discipline
3. 12-namespace-logger-contract
4. 13-error-routing-and-panel
5. 14-floating-button (spec pending)
6. 15-floating-in-page-panel (spec pending)
7. 16-storage-sqlite-pointer (spec pending)
8. 17-storage-indexeddb-pointer (spec pending)
9. 18-storage-chrome-local-pointer (spec pending)
10. 19-testing-matrix (spec pending)
11. 20-acceptance-criteria (spec pending)
