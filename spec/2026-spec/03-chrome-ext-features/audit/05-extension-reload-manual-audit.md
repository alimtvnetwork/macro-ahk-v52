# Audit 05 — `05-extension-reload-manual.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/05-extension-reload-manual.md`
- **Auditor focus:** Can an AI/LLM implement a safe, idempotent, no-retry manual reload orchestration (not just a button) end-to-end from this spec alone?
- **Scoring rubric (0–100):** Clarity (25), Determinism (25), Acceptance completeness (20), Cross-refs (15), Pitfalls (15).
- **Audited revision:** post-upgrade (canonical `RELOAD_TRIGGER_SOURCES`, session-audit vs Code Red split, platform adapter, fan-out + skipped aggregation, mandatory failure schema, participants registry).

## Critical score: **90 / 100**

| Dimension | Score | Notes |
|---|---:|---|
| Clarity | 23 / 25 | Surface, primitive, confirm copy (locked), broadcast, flush window, failure surface, and no-retry are all explicit and scoped. |
| Determinism | 22 / 25 | `FLUSH_DEADLINE_MS = 150` is a constant; trigger union is one symbol; failure schema is a table; sync `return false` is mandated. Minor: ack envelope's `contextId` format is illustrative, not enforced. |
| Acceptance | 18 / 20 | Checklist covers union dedup audit, fan-out predicate, audit row vs Code Red, mandatory schema, shortcut editable guard, and lint policy. Missing: explicit assertion that the "Reloading…" → SW-restart path closes the popup (covered only in manual E2E). |
| Cross-refs | 14 / 15 | Resolves to step 02 (top-level bind), step 03 (platform/messaging), step 07 (status panel location), step 12 (logger), step 13 (error panel), step 14 (boot banner), `mem://constraints/no-retry-policy`, `mem://standards/unknown-usage-policy`, `mem://features/new-tab-no-url-guard`, `mem://features/recorder-keyboard-shortcuts`. Steps 15/16 are explicitly marked pending with a participant interface as the extension point — safe for blind impl. |
| Pitfalls | 13 / 15 | Covers popup-direct `reload()`, `window.location.reload()`, `sendMessage().catch` without adapter, missing tab fan-out, `return true` while sync, retry-on-failure, reload-in-boot loop, shortcut-in-recorder. Missing: pitfall about persisting `Reload.Requested` *after* `chrome.runtime.reload()` (must precede). |

## Resolved issues (vs prior audit)

- **G1 (file-watch):** Union now includes `"file-watch"` in `RELOAD_TRIGGER_SOURCES`; step 06 imports the type — duplicate literals are blocked by `scripts/audit-reload-trigger-source.mjs`.
- **G2 (Code Red vs info):** Manual reload writes `Reload.Requested` to the **session audit table**, not Code Red. Code Red is reserved for `Reload.Failed`. Pre-spec rows must be migrated to `severity="info"` / `resolved=true`.
- **G3 (failure schema):** Mandatory PascalCase schema table with `EventName`, `BuildId`, `Path`, `Missing`, `Reason`, `ReasonDetail`, `SelectorAttempts`, `VariableContext` — matches project memory.
- **G4 (`unknown` policy):** Reference uses `toCaughtError(caught)`; explicit `unknown` is forbidden outside that helper, with lint enforcement.
- **G5 (adapter):** `sendRuntimeMessageSafe` / `sendTabMessageSafe` from `@platform/messaging` are mandatory; direct `.catch()` on `chrome.runtime.sendMessage` is explicitly forbidden.
- **G6 (fan-out):** Broadcast addresses extension pages **and** tabs via `chrome.tabs.query({})` + `chrome.tabs.sendMessage`, gated by `isInjectableHttpTabUrl()` (wraps `isNewTabOrBlankUrl()`). Skipped tabs aggregated into one `SkippedContexts` summary — never one Code Red per tab.
- **G7 (150 ms flush):** Reframed as "best-effort flush" with bounded acknowledgement window; missing acks are recorded as `unacknowledged`, not retried.
- **G8 (`return true`):** Explicitly `return false` after synchronous `sendResponse`.
- **G9 (copy):** Confirm copy is locked verbatim: `Reload extension? Unsaved panel changes will close.`
- **G10 (shortcut conflicts):** Editable-field guard reuses the recorder predicate (covers `INPUT`/`TEXTAREA`/`contenteditable`/shadow-DOM); `commands` entries audited by `scripts/audit-manifest-commands.mjs`.
- **G11 (failure surfacing):** Writes Code Red → broadcasts `ERROR_COUNT_CHANGED` → popup error summary reads on reopen.
- **G12 (pending deps):** `BeforeReloadParticipant` registry decouples step 15/16 — empty registry until they land.

## Remaining gaps (minor)

### R1 — Ordering of `writeSessionAudit` vs `chrome.runtime.reload()` is correct but not asserted in tests (LOW)

The reference handler writes the audit row *before* `chrome.runtime.reload()`. The acceptance bullet implies it, but no test name explicitly verifies "audit row persisted before reload primitive is invoked".

**Fix:** Add to `reload-handler.test.ts`: `assert(writeSessionAudit was called and awaited before chrome.runtime.reload spy fired)`.

### R2 — `replyContextId` is referenced in handler but not defined on `SendMessageResult` (LOW)

The reference handler reads `ext.replyContextId` and `r.replyContextId`, but the adapter return type is referenced as `SendMessageResult` without a field definition in this spec. Step 03 owns the adapter, but the audit row's `AcknowledgedContexts[]` semantics depend on it.

**Fix:** Either pin `SendMessageResult { ok, replyContextId? }` shape in this spec, or add an explicit cross-ref note: "field shape owned by step 03 §Platform messaging".

### R3 — Popup "Reloading…" → SW death timing is not user-visible (LOW)

When SW reloads, the popup may freeze on "Reloading…" before Chrome auto-closes it. Some users perceive this as a hang.

**Fix:** Add a 250 ms `setTimeout(window.close, 250)` after `sendMessage` in the popup reference, and document the rationale.

### R4 — `BuildIdMismatch` writes `Logger.warn` but does not surface to the user (LOW)

A build-ID mismatch usually means stale popup against new SW — the correct user action is "close popup, re-open". Currently silent.

**Fix:** Add `sendResponse({ ok: false, reason: "BuildIdMismatch" })` (already present) **and** require popup to render an inline hint when it sees `ok: false`.

## Blocker list for blind AI implementation

None remaining. All prior HIGH blockers (G1, G2, G3, G5, G6) are resolved with normative wording, canonical symbols, and CI-enforceable audits.

## Recommendation

Spec is implementation-ready. Apply R1–R4 in a follow-up patch to reach ~95/100; none are blockers.

## Audit time

Started: 2026-06-05. Finished: 2026-06-05 22:20. Duration: ~6 min.

## Remaining audit items

1. 06-extension-reload-auto-on-file-change
2. 07-status-and-health-panel
3. 08-script-injection-lifecycle
4. 09-injection-idempotency-sentinel
5. 10-reinject-and-uninject
6. 11-error-logging-discipline
7. 12-namespace-logger-contract

## Acceptance

- [ ] The implementation satisfies the `Audit 05 — 05-extension-reload-manual.md` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

