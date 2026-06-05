# Audit 05 — `05-extension-reload-manual.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/05-extension-reload-manual.md`
- **Auditor focus:** How blindly can an AI/LLM implement a safe manual extension reload flow without losing state, violating the no-retry policy, or creating reload loops?
- **Scoring rubric (0–100):**
  - Clarity of contract (25)
  - Determinism / unambiguous wording (25)
  - Completeness of acceptance criteria (20)
  - Cross-references resolvable from within the repo (15)
  - Pitfalls + counter-examples (15)

## Critical score: **70 / 100**

| Dimension | Score | Notes |
|---|---:|---|
| Clarity of contract | 20 / 25 | The user flow, primitive, confirmation, broadcast, no-retry rule, and tests are clear. |
| Determinism | 15 / 25 | Several details are underspecified: broadcast coverage, response timing, Code Red payload shape, and exact 150 ms flush semantics. |
| Completeness of acceptance | 14 / 20 | Good high-level checks, but lacks exact message validation, teardown behavior, failure surfacing contract, and timeout tests. |
| Cross-references | 9 / 15 | References steps 07, 15, 16 and memory. Step 07 exists; steps 15/16 are pending in this folder, so a blind AI may invent details. |
| Pitfalls | 12 / 15 | Good reload-loop and popup-direct-call pitfalls, but misses MV3 async listener pitfalls and sendMessage error swallowing. |

## Gap analysis (detailed)

### G1 — `triggerSource: "file-watch"` is required by step 06 but missing from `ReloadRequest` (HIGH)

Step 06 says the dev bridge sends `MSG_RELOAD_EXTENSION` with `triggerSource: "file-watch"`. This step's `ReloadRequest` union only allows:

```ts
"popup" | "options" | "panel" | "keyboard-shortcut" | "context-menu"
```

That means a blind AI implementing step 05 exactly will reject or type-fail the step 06 auto-reload request.

**Fix:** Add `"file-watch"` to the canonical `triggerSource` union in step 05, or define `ReloadTriggerSource` once in `src/shared/messages.ts` and require all later specs to import it.

### G2 — Contract says Code Red row for `ManualReload`, reference logs `Reload.Requested` info (HIGH)

The contract says a Code Red row with `Reason="ManualReload"` is written before reload. The reference handler logs:

```ts
Logger.info("Reload.Requested", { triggerSource, buildId })
```

This is a semantic mismatch. Manual reload is an intentional recovery event, not necessarily an error. If it is stored as Code Red, the Errors panel may count deliberate reloads as unresolved failures. If it is only info, the contract is wrong.

**Fix:** Decide one contract:

1. **Recommended:** write a session/audit log row, not Code Red, for `Reload.Requested`; reserve Code Red only for `Reload.Failed`.
2. If the product truly wants manual reloads in the error table, mark them `resolved=true` / `severity="info"` so they do not inflate unresolved error counts.

### G3 — Code Red failure payload omits mandatory project fields (HIGH)

Project memory requires every failure log to include `Reason`, `ReasonDetail`, `SelectorAttempts[]`, and `VariableContext[]`, with `null + reason` when not applicable. The sample failure payload uses lowercase `reason`, lacks `ReasonDetail`, and omits the diagnostic arrays.

**Fix:** Replace the example with canonical fields:

```ts
Logger.error("Reload.Failed", {
  BuildId: BUILD_ID,
  Path: "src/background/reload.ts",
  Missing: "chrome.runtime.reload() success",
  Reason: "RuntimeReloadFailed",
  ReasonDetail: err?.message ?? "chrome.runtime.reload threw without a message.",
  SelectorAttempts: null,
  VariableContext: null,
});
```

### G4 — Reference code violates the no explicit `unknown` policy (HIGH)

The catch block uses:

```ts
} catch (caught: unknown) {
  const err = caught as CaughtError;
```

Project memory allows `unknown` only in `CaughtError` patterns and says function params must use designed types. This sample is close, but blind AI may copy the explicit `unknown` and trigger lint failures if the repo has a stricter catch helper.

**Fix:** Reference the repo's canonical error helper/type pattern, for example:

```ts
} catch (caught) {
  const err = toCaughtError(caught);
```

If explicit `unknown` is allowed only in a specific helper, state that this sample must call that helper instead of casting inline.

### G5 — `chrome.runtime.sendMessage(...).catch()` is not valid for callback-style Chrome APIs unless promisified (HIGH)

The reference handler uses:

```ts
void chrome.runtime.sendMessage({ kind: EVT_BEFORE_RELOAD }).catch(() => { ... });
```

Chrome extension APIs are callback-based in many environments and may not return a Promise unless using a browser polyfill or Chrome's Promise support for that API/version. A blind AI may ship code that throws `Cannot read properties of undefined (reading 'catch')`.

**Fix:** Define one platform adapter:

```ts
sendRuntimeMessageSafe(message): Promise<SendMessageResult>
```

or use callback form and inspect `chrome.runtime.lastError`. Step 03 already has a `src/platform/` folder; this step should require using it.

### G6 — `chrome.runtime.sendMessage` does not reach every tab content script/panel (HIGH)

The contract says the background MUST broadcast `EVT_BEFORE_RELOAD` to every context. The sample only calls `chrome.runtime.sendMessage`, which reaches extension contexts but not necessarily every content script in every tab. In-page panels running in content scripts usually need `chrome.tabs.sendMessage(tabId, ...)` for each eligible tab.

**Fix:** Define broadcast precisely:

1. `chrome.runtime.sendMessage` for extension pages (popup/options/side panel if present).
2. `chrome.tabs.query({})` then `chrome.tabs.sendMessage(tab.id, ...)` for content scripts on supported URLs.
3. Skip unsupported/new-tab URLs with `isNewTabOrBlankUrl()` and browser-page guards.
4. Log non-Code-Red skip summaries, not one error per closed/unreachable tab.

### G7 — 150 ms flush deadline is arbitrary and not testable enough (MEDIUM)

The spec states there is no acknowledgement and the SW waits 150 ms before reload. That makes persistence best-effort and can lose SQLite flushes under load. It also conflicts with the phrase "MUST broadcast ... so logs flush" because there is no guarantee.

**Fix:** Use a bounded acknowledgement model only for known extension contexts, while preserving no retry:

- Send `EVT_BEFORE_RELOAD`.
- Wait up to 150 ms for best-effort acknowledgements from known contexts.
- Reload at the deadline regardless.
- Record which contexts acknowledged in the reload audit row.

If no acknowledgements are desired, change wording from "flushes" to "gets a best-effort opportunity to flush".

### G8 — Listener returns `true` although it responds synchronously (LOW)

The sample calls `sendResponse({ ok: true })` synchronously but returns `true`, which signals an async response. This is not fatal, but it is misleading and can hide patterns where the channel is kept open unnecessarily.

**Fix:** Either return `false` after a synchronous response, or make the handler truly async with a typed `respondOnce` helper. Prefer a clear callback adapter to avoid MV3 listener mistakes.

### G9 — Popup confirmation wording may become visible instruction text (LOW)

The inline confirm text is okay, but the broader frontend guidance says not to over-explain app features in UI. The spec should keep the message short and operational.

**Fix:** Define exact concise copy:

```text
Reload extension? Unsaved panel changes will close.
```

### G10 — Keyboard shortcut conflicts are not audited (MEDIUM)

The optional `Ctrl+Alt+R` shortcut may collide with recorder shortcuts or browser/system shortcuts. The spec says ignore editable fields but does not require manifest command audit or conflict test.

**Fix:** Add acceptance:

- If `commands` includes reload, it is documented in the popup status area or shortcuts docs.
- Shortcut handler checks editable targets using the same helper as recorder shortcuts.
- Test verifies `INPUT`, `TEXTAREA`, `contenteditable="true"`, and shadow-DOM editable targets do not trigger reload.

### G11 — Failure surfacing is undefined (MEDIUM)

The contract says to log Code Red and surface the error if reload fails, but not where or how. Since the popup may be closing and the SW may be unstable, a blind AI may only log to console.

**Fix:** Define surface path:

- Persist `Reload.Failed` row to the error store.
- Broadcast `ERROR_COUNT_CHANGED` after persistence.
- Popup status panel reads the error summary when reopened.
- If persistence fails, use the namespace logger recursion-guarded fallback from step 12.

### G12 — Step depends on pending steps without fallback behavior (MEDIUM)

The pre-reload broadcast mentions panel persistence (step 15) and SQLite flush (step 16), but those files are not present yet in this folder. A blind AI implementing now may invent APIs.

**Fix:** Mark future integrations as pending and define no-op extension points:

```ts
export interface BeforeReloadParticipant {
  id: string;
  beforeReload(deadlineMs: number): Promise<BeforeReloadResult>;
}
```

Later steps can register participants without changing the reload handler contract.

## Blocker list for blind AI implementation

1. `file-watch` trigger required by step 06 is missing from the step 05 message union (G1).
2. Manual reload is inconsistently treated as Code Red vs info/session log (G2).
3. Broadcast sample does not actually reach every content-script/in-page panel context (G6).
4. Chrome callback APIs are used as Promises without an adapter contract (G5).
5. Code Red examples do not match mandatory failure-log schema from project memory (G3).

## Recommendation

Promote this from a UI button spec to a reload-orchestration contract. Define `ReloadTriggerSource` once, classify manual reload as session/audit info rather than unresolved Code Red, add a platform messaging adapter, implement a real all-context broadcast, and align failure payloads with the mandatory Code Red schema. With those corrections, this spec would rise to ~88/100.

## Remaining audit items

1. 06-extension-reload-auto-on-file-change
2. 07-status-and-health-panel
3. 08-script-injection-lifecycle
4. 09-injection-idempotency-sentinel
5. 10-reinject-and-uninject
6. 11-error-logging-discipline
7. 12-namespace-logger-contract
8. 13-error-routing-and-panel
9. 14-boot-failure-banner (spec pending)
10. 15-floating-in-page-panel (spec pending)
11. 16-storage-sqlite-pointer (spec pending)
12. 17-storage-indexeddb-pointer (spec pending)
13. 18-storage-chrome-local-pointer (spec pending)
14. 19-testing-matrix (spec pending)
15. 20-acceptance-criteria (spec pending)