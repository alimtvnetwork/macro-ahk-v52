# Audit 08 — Script Injection Lifecycle

- **Source spec**: `../08-script-injection-lifecycle.md`
- **Audit date**: 2026-06-05 (duration ~5 min)
- **Audited against**: `mem://architecture/script-injection-lifecycle`,
  `mem://architecture/injection-context-awareness`,
  `mem://architecture/message-relay-system`,
  `mem://features/new-tab-no-url-guard`,
  `mem://constraints/no-retry-policy`,
  `mem://architecture/injection-cache-management`,
  `mem://architecture/self-healing-script-storage`,
  `mem://architecture/dynamic-script-loading`,
  `mem://architecture/instruction-driven-seeding`,
  `mem://architecture/build-artifact-preservation`,
  `mem://constraints/no-storage-pascalcase-migration`,
  `mem://standards/timer-and-observer-teardown`,
  `mem://standards/unknown-usage-policy`.

## Score: 90 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 | 23 |
| Determinism (AI can implement)  |     25 | 22 |
| Completeness of acceptance      |     20 | 17 |
| Cross-references                |     15 | 14 |
| Pitfalls coverage               |     15 | 14 |
| **Total**                       |    100 | **90** |

## Resolved issues (vs prior audit)

- **G1 (built `.js` artifacts only):** Contract item 3 + Stage-0 `executeFile()` guard (`if (!file.endsWith(".js")) throw NotJsArtifact`) + plan-time validation in `resolveInjectionPlan` rejects non-`.js`.
- **G2 (web-accessible):** Contract item 4 + resolver loop `if (!isWebAccessible(file)) throw NotWebAccessible(file)`; injector refuses files not listed in `web_accessible_resources`.
- **G3 (relay envelope contract):** `BridgeEnvelope { source, kind, buildId, payload }` pinned with `isBridgeEnvelope()` guard and explicit "JSON-safe only — no functions, no class instances" rule; cross-references step 02.
- **G4 (Stage 5 receiver contract):** Spec now states "Stage 5 message receiver lives in the **isolated relay**, which re-broadcasts to MAIN via `CustomEvent(RELAY_EVENT)`; MAIN-world IIFEs subscribe via `window.addEventListener(RELAY_EVENT, …)` filtered by `source === "extension"`."
- **G5 (sentinel signature):** Sentinel imported from `./sentinel`; signature `boolean | "build-mismatch"` documented; Stage 0 dispatches all three branches explicitly.
- **G6 (`force` + uninject):** Stage 0 branch `if (sentinel === "build-mismatch" || (sentinel === true && request.force)) await uninjectFromTab(request.tabId)`.
- **G7 (plan includes bootstrap + relay):** `InjectionPlan` now carries `bootstrapFile`, `relayFile`, `mainWorldFiles`, `cspFallbackFiles`, all sourced from `assets/instruction.json`.
- **G8 (reason taxonomy):** Canonical failure-reason table with 13 reasons (NewTabOrBlankUrl, NotWebAccessible, MissingBundlePath, MissingDynamicModule, BootstrapFailed, RelayInstallFailed, IifeFailed, LinkRuntimeFailed, CspBlocked, BuildIdMismatch, NoPermissionForTab, TabClosedDuringInjection, InjectionStageFailed).
- **G9 (Chrome error mapping):** Substring → Reason mapping table for `chrome://`, `chrome-extension://`, "tab was closed", "No tab with id", "Refused to execute inline script", "Content Security Policy", "Extension context invalidated".
- **G10 (idempotency + `force` assertion):** Acceptance includes the spy-based idempotency test (covered in §Tests to ship — visible in remainder of spec).
- **G11 (StoredProject pitfall):** Pitfall + Stage-1 rule: resolver reads `StoredProject` keys only; no normalize, no PascalCase rewrite.
- **G12 (relay self-teardown):** §Relay teardown mandates teardown when `chrome.runtime.id` is `undefined`; `isContextAlive()` checked in both `onExtMessage` and `onPageEvent`; `pagehide` cleanup paired.

## Remaining gaps (minor)

### R1 — `BridgeEnvelope.source` distinguishes "page"/"isolated"/"extension"; relay only filters on `source !== "page"` for one direction (LOW)

The MAIN-world consumer filters `env?.source !== "extension"` — good. The isolated relay's `onPageEvent` only checks `env.source !== "page"` — but it should ALSO reject envelopes whose `buildId` differs from the current `BUILD_ID` (defense against a stale page-side script after extension reload).

**Fix:** Add `if (env.buildId !== BUILD_ID) return;` in `onPageEvent`.

### R2 — `executeFile` rejects non-`.js` with `throw new Error("NotJsArtifact: …")`, but the classifier table has no entry for that string (LOW)

`classifyExecError` falls back to `InjectionStageFailed`; `NotJsArtifact` then disappears as a top-level reason even though it should be a distinct one.

**Fix:** Add `NotJsArtifact` to the reason table and add a substring rule `"NotJsArtifact:" → "NotJsArtifact"`.

### R3 — `chrome.tabs.sendMessage` at Stage 5 has no platform adapter (LOW)

Stage 5 calls `chrome.tabs.sendMessage` directly. Audit 05 R5 already requires `sendTabMessageSafe` from `@platform/messaging`. Using the raw API here bypasses `lastError` normalization.

**Fix:** Replace with `sendTabMessageSafe(request.tabId, { kind: "injection/link-runtime", buildId: BUILD_ID })`; if `!ok`, classify as `LinkRuntimeFailed`.

### R4 — `rejectDuplicateScriptIds` throws but maps to no canonical reason (LOW)

Spec says "Reject duplicate script ids → `MissingBundlePath`/`DuplicateScriptId`". `DuplicateScriptId` is not in the reason table.

**Fix:** Add `DuplicateScriptId` row to the canonical reason table with `carriedFields: ["scriptId"]`.

## Blocker list for blind AI implementation

None remaining. R1–R4 are tightening, not blockers.

## Recommendation

Spec is implementation-ready. Apply R1–R4 in a follow-up patch to reach ~95/100.

## Remaining audit items

1. 09-injection-idempotency-sentinel
2. 10-reinject-and-uninject
3. 11-error-logging-discipline
4. 12-namespace-logger-contract

## Acceptance

- [ ] The implementation satisfies the `Audit 08 — Script Injection Lifecycle` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
