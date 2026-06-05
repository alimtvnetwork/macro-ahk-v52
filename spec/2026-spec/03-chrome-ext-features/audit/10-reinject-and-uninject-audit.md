# Audit 10 — Re-inject and Uninject

- **Source spec**: `../10-reinject-and-uninject.md`
- **Audit date**: 2026-06-05 (Asia/Kuala_Lumpur)
- **Audited against**: `mem://architecture/script-injection-lifecycle`,
  `mem://standards/timer-and-observer-teardown`,
  `mem://architecture/message-relay-system`,
  `mem://features/new-tab-no-url-guard`,
  `mem://constraints/no-retry-policy`,
  `mem://architecture/dynamic-script-loading`,
  `mem://architecture/extension-error-management`,
  `mem://standards/verbose-logging-and-failure-diagnostics`.

## Score: 73 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 |    19 |
| Determinism (AI can implement)  |     25 |    17 |
| Completeness of acceptance      |     20 |    14 |
| Cross-references                |     15 |    11 |
| Pitfalls coverage               |     15 |    12 |
| **Total**                       |    100 |  **73** |

## Gap analysis

### G1 — `executeTeardown(tabId, "runtime"|"relay"|"panel"|"styles")` has no contract (Critical)
The function is called four times with hand-typed string discriminators and is
never defined. AI implementers will invent four different signatures. **Fix:**
specify:

```ts
type TeardownDomain = "runtime" | "relay" | "panel" | "styles";

export async function executeTeardown(
  tabId: number,
  domain: TeardownDomain,
): Promise<{ ran: string[]; failed: { id: string; reason: string }[] }>;
```

Implementation: `chrome.scripting.executeScript({ world: "MAIN", func, args:
[domain] })` calls `RiseupAsiaMacroExt.Runtime.runTeardown(domain)` which
iterates the registered callbacks in reverse order, catches per-callback
errors, and returns the per-id ran/failed list.

### G2 — Teardown per-callback failures silently pass (Critical)
`uninjectFromTab` awaits `executeTeardown(...)` but never inspects the
returned `failed[]`. A panel-teardown callback throws → `failed:
[{id:"panel-shadow-root", reason:"..."}]` → outer try doesn't catch → uninject
returns `ok:true`. **Fix:** spec rule: "if any domain returns `failed.length >
0`, the uninject result is `ok:false` with `step=<domain>-teardown`,
`reason="TeardownCallbackFailed"`, and `reasonDetail` enumerating failed ids".

### G3 — `EVT_BEFORE_UNINJECT` broadcast race with `runtime-teardown`
The broadcast goes via ISOLATED-world relay (per step 08); the very next step
tears down that relay's runtime registrations. If teardown runs in the MAIN
world before the relay forwards the event, the page never sees the broadcast.
**Fix:** add ordering rule: "broadcast MUST resolve (awaited round-trip ack)
before `runtime-teardown` begins; ack timeout is 500 ms, single-shot, then
proceed with `Reason='BroadcastAckTimeout'` warning (not Code Red)".

### G4 — `relay-teardown` removes the channel needed for `EVT_AFTER_UNINJECT`
Step order: `relay-teardown` (step 4) → `sentinel-clear` (step 8) →
`broadcast-after-uninject` (step 9) via `chrome.tabs.sendMessage` — which
**requires** the relay to still be installed. **Fix:** either (a) defer
relay-teardown to AFTER `broadcast-after-uninject`, or (b) make
`EVT_AFTER_UNINJECT` a direct MAIN-world `chrome.scripting.executeScript`
dispatch instead of `chrome.tabs.sendMessage`. Recommend (b) for symmetry
with sentinel ops.

### G5 — `force: true` bypass not enforced in `injectIntoTab`
Step 08's `injectIntoTab` accepts `force` but the `force === true` code path
is implicit. **Fix:** add explicit rule in step 08 (and reference here): "when
`force === true`, injector MUST first assert `sentinel.injected === false`
(post-uninject postcondition). If sentinel is still present, return
`Reason='ForceInjectPreconditionFailed'` and do NOT executeScript."

### G6 — Re-inject does not include the originally requested `force` cascade
`reinjectIntoTab` always passes `force: true` to the second phase. That's
correct, but does not document **how a stale-build sentinel becomes the trigger
source**. **Fix:** add: "Status panel maps `Sentinel.StaleBuild` →
`Re-inject` button (not `Inject`); pressing `Inject` when stale is a user
error and returns `Reason='UseReinjectForStaleBuild'`".

### G7 — `removedScriptIds: []` on no-sentinel path is misleading
When `!sentinel.injected`, uninject returns `ok:true, removedScriptIds:[]`. UI
will say "Uninjected 0 scripts". **Fix:** add `outcome:
"already-clean"|"cleaned"` discriminator to `UninjectSuccess` so the UI can
render "Nothing to uninject" vs "Removed N scripts".

### G8 — `registerTeardown` not in step 08 namespace/runtime contract
`RiseupAsiaMacroExt.Runtime.registerTeardown()` is invented here but the
SDK surface is owned by step 08 (Stage 5 — script-to-script communication).
**Fix:** move the `registerTeardown` / `runTeardown` API into step 08's
namespace SDK section and cross-link from here.

### G9 — Auto-injector `force:false` not enforced statically
Spec says "Auto-injection must not use force" but no lint/audit script is
named. **Fix:** add `scripts/audit-force-inject-callers.mjs` that greps for
`force: true` and asserts the callsite is one of `reinjector.ts`,
`status-panel.tsx`, `options-debug-panel.tsx`. Reference
`mem://constraints/no-retry-policy` reuse pattern.

### G10 — Verbose-logging gate not applied to teardown diagnostics
A failed teardown can have a long error message + stack. Per
`mem://standards/verbose-logging-and-failure-diagnostics` the full stack is
gated behind per-project `VerboseLogging`. **Fix:** acceptance "teardown
failure `reasonDetail` is truncated to 240 chars unless `VerboseLogging` is
ON; full stack lives in SQLite `error_events.detail_full`".

### G11 — Missing pitfall: extension context invalidation mid-uninject
After step 06 auto-reload, `chrome.runtime.id` becomes undefined mid-uninject.
`chrome.tabs.sendMessage` then throws `Extension context invalidated`. **Fix:**
pitfall + handler: catch and map to `Reason='ExtensionContextInvalidated'`,
treat as terminal (no retry, no Code Red — expected during reload).

### G12 — Acceptance lacks idempotency test for double-uninject
Per step's own rule "teardown callbacks are idempotent", but no test asserts
calling `uninjectFromTab` twice in sequence both return `ok:true`. **Fix:**
add `uninjector-idempotent.test.ts` — second call returns `ok:true,
outcome:"already-clean", removedScriptIds:[]`.

## Remaining audits (post this turn)

1. 11-error-logging-discipline
2. 12-namespace-logger-contract
3. 13-error-routing-and-panel
4. 14-floating-button (spec pending)
5. 15-floating-in-page-panel (spec pending)
6. 16-storage-sqlite-pointer (spec pending)
7. 17-storage-indexeddb-pointer (spec pending)
8. 18-storage-chrome-local-pointer (spec pending)
9. 19-testing-matrix (spec pending)
10. 20-acceptance-criteria (spec pending)
