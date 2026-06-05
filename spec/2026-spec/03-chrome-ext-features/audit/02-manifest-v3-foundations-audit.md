# Audit 02 — `02-manifest-v3-foundations.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/02-manifest-v3-foundations.md`
- **Auditor focus:** How blindly can an AI/LLM implement the Manifest V3 baseline without inventing permissions, breaking MV3 lifecycle rules, or drifting from later specs?
- **Scoring rubric (0–100):**
  - Clarity of contract (25)
  - Determinism / unambiguous wording (25)
  - Completeness of acceptance criteria (20)
  - Cross-references resolvable from within the repo (15)
  - Pitfalls + counter-examples (15)

## Critical score: **74 / 100**

| Dimension | Score | Notes |
|---|---:|---|
| Clarity of contract | 21 / 25 | Strong MV3 baseline: manifest version, service worker, injection API, world model, CSP, SW lifecycle. |
| Determinism | 17 / 25 | Several lines are normative, but permission minimization and README justification are underspecified; skeleton can be copied too broadly. |
| Completeness of acceptance | 15 / 20 | Has a useful checklist and test list, but lacks exact lint script names, exact manifest schema, and a permission justification template. |
| Cross-references | 10 / 15 | Sibling storage folder exists, but internal step links (`16-sqlite-integration.md`, `18-chrome-storage-local-usage.md`) are pending/mismatched in the current folder. |
| Pitfalls | 11 / 15 | Good MV3 pitfalls, but not enough failure examples for permission review, MAIN/ISOLATED bridge, or service-worker top-level listener mistakes. |

## Gap analysis (detailed)

### G1 — Minimum manifest skeleton conflicts with minimum-permission rule (HIGH)

The contract says: **"Declare the minimum set of `permissions` and `host_permissions` needed."** The skeleton then shows:

```json
"permissions": ["storage", "scripting", "activeTab", "tabs"],
"host_permissions": ["https://*/*"]
```

For a blind AI, this skeleton becomes the default implementation. That is risky because `tabs` and broad `https://*/*` host permissions are frequently unnecessary and trigger Chrome Web Store review friction. It also contradicts the pitfall line that says not to declare broad access "just in case".

**Fix:** Split the manifest example into:

1. **Required baseline permissions:** only what every implementation truly needs.
2. **Optional permissions table:** `tabs`, `activeTab`, `scripting`, host permissions, `alarms`, `offscreen`, etc., each with "when required" and "README justification text".
3. **Forbidden default:** explicitly say `host_permissions: ["https://*/*"]` is example-only and MUST NOT be copied unless the feature requires all HTTPS origins.

### G2 — README permission justification has no required format (MEDIUM)

The spec requires every permission to be justified in `README.md`, but does not define the heading, table shape, or exact fields. A blind AI may scatter prose in the README, making the requirement hard to audit.

**Fix:** Add a canonical block:

```md
## Extension permissions

| Permission | Required by | Why it is necessary | User-facing impact |
|---|---|---|---|
| storage | Settings persistence | Saves local extension config | No network access |
```

Acceptance should require that every permission and host permission appears exactly once in that table.

### G3 — Internal step links point to files that do not exist yet (HIGH)

Lines 19–20 reference:

- `18-chrome-storage-local-usage.md`
- `16-sqlite-integration.md`

But the current folder contains only specs `01` through `13`; steps `16` and `18` are listed in `README.md` but are not present yet. A blind AI following the link will hit file-not-found and may invent missing content.

**Fix:** Until those files exist, mark them as pending:

- `18-chrome-storage-local-usage.md` **(pending step 18)**
- `16-sqlite-integration.md` **(pending step 16)**

Also add a rule: unresolved future links MUST be labelled `(pending)`.

### G4 — Cross-reference to the storage sibling is too broad (MEDIUM)

The storage section says the authoritative storage spec is `../03-db-and-sqlite-integration-with-chrome-extension/`, but that folder has 40 files. AI cannot know which file governs `chrome.storage.local`, SQLite, IndexedDB, or localStorage without browsing the whole folder.

**Fix:** Add precise links:

- SQLite → `../03-db-and-sqlite-integration-with-chrome-extension/14-per-namespace-db-pattern.md`
- SQL WASM bundling → `../03-db-and-sqlite-integration-with-chrome-extension/08-bundling-sql-wasm.md`
- IndexedDB cache → `../03-db-and-sqlite-integration-with-chrome-extension/21-indexeddb-when-to-choose.md` and `23-indexeddb-injection-cache.md`
- chrome.storage.local → `../03-db-and-sqlite-integration-with-chrome-extension/25-chrome-storage-local-usage.md`
- localStorage usage → `../03-db-and-sqlite-integration-with-chrome-extension/27-localstorage-usage.md`

### G5 — `localStorage` guidance is internally too permissive (MEDIUM)

The storage table says `localStorage` is "OK in popup for trivial UI flags". Project memory forbids Supabase/localStorage auth patterns and warns against fragile storage migrations. For a blind AI, this line may open the door to storing tokens, auth state, or cross-context state in popup localStorage.

**Fix:** Narrow the wording:

> `localStorage` MAY only store disposable, non-auth, non-cross-context visual UI flags in extension pages. It MUST NOT store tokens, workspace IDs, project data, scripts, logs, or anything required after reload.

### G6 — MAIN/ISOLATED world model lacks the canonical relay contract (HIGH)

The spec correctly says MAIN cannot use `chrome.*` and ISOLATED cannot expose page globals. It says a `window.postMessage` bridge is required, but does not define message names, event direction, envelope fields, origin checks, or validation rules.

Later specs (`11`, `12`, `13`) require structured logging, MAIN-world namespace logger, and an isolated relay. Without a canonical relay contract here, AI may implement an ad-hoc bridge that later conflicts.

**Fix:** Add a minimal bridge contract:

```ts
type PageToIsolatedEnvelope = {
  source: "riseupasia-macro-ext-main";
  kind: "log/write" | "sdk/event";
  buildId: string;
  payload: JsonObject;
};
```

Then state that later specs may extend but not replace this envelope.

### G7 — Service-worker lifecycle rules are correct but not mechanically enforceable (MEDIUM)

The spec says listeners must be registered synchronously at top level and no module-scope state survives restart. However acceptance does not require a static check for these common mistakes.

**Fix:** Add test/audit requirements:

- `manifest.json` has exactly one `background.service_worker` and no `background.page`.
- Background entry module imports do not reference `window`, `document`, or `localStorage` at top level.
- Known listener registrations (`chrome.runtime.onMessage.addListener`, `chrome.tabs.onUpdated.addListener`, etc.) happen at top-level bootstrap, not inside async initialization.

### G8 — `chrome.scripting.executeScript` rule needs exact target validation (MEDIUM)

The contract requires `executeScript` with explicit `world`, but not exact target validation. Blind AI may inject into `tabId` without checking URL, frame target, `chrome://` pages, or new-tab blank pages. Project memory has a strict new-tab/no-URL guard.

**Fix:** Add preconditions:

- Refuse `about:blank`, empty URL, `chrome://newtab/`, `chrome://new-tab-page/`, `chrome-search://local-ntp*`, `edge://newtab/`, `brave://newtab/`, `opera://startpage/`.
- Use the single helper `isNewTabOrBlankUrl()` where this repo has it.
- Log a non-Code-Red skip reason for unsupported browser pages.

### G9 — CSP section needs a manifest-level canonical value (LOW)

The spec explains MV3 default CSP but does not state whether implementers should explicitly set `content_security_policy.extension_pages`. Some AI implementations may add unsafe CSP fields or omit WASM requirements.

**Fix:** Add either:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

if WASM is required, or explicitly say not to override MV3 defaults unless sql.js/WASM requires it. Tie the decision to the SQLite step.

### G10 — Build output grep checks are underspecified (MEDIUM)

The tests section asks for a static check that greps output for `eval(`, `new Function(`, and remote scripts. This is directionally good, but a blind AI needs exact script location, file globs, ignore patterns, and expected failure message.

**Fix:** Add a required script name and scope, for example:

```text
scripts/audit-mv3-output.mjs
Scans: dist/**/*.{js,html,json}
Fails on: eval(, new Function(, <script src="http, https://cdn., unsafe-eval
Allows: test fixtures only under scripts/__tests__/fixtures/
```

### G11 — Manifest lint acceptance lacks schema details (MEDIUM)

The spec says to validate `manifest.json` against the contract, but not which fields are required vs forbidden.

**Fix:** Add a manifest lint checklist:

- `manifest_version === 3`
- `background.service_worker` exists
- `background.page` absent
- `background.persistent` absent
- `background.type === "module"`
- no duplicate background entries
- all `permissions[]` are in allowlist
- every `permissions[]` and `host_permissions[]` value is justified in README permission table

### G12 — Boot smoke test is too vague for automation (LOW)

Acceptance says: "A boot smoke test loads the unpacked extension and confirms the SW registers without console errors." It does not identify the test runner, browser channel, or observable assertion.

**Fix:** Reference the existing manual Chrome E2E pattern and require the test to capture:

- extension ID exists
- popup opens
- `chrome.runtime.getManifest().manifest_version === 3`
- no registration error from the service worker console
- no `Unchecked runtime.lastError` during startup

## Blocker list for blind AI implementation

1. Permission minimization cannot be implemented safely from the skeleton because the skeleton itself is broad (G1).
2. Future internal step links are unresolved and may cause invented implementation details (G3).
3. MAIN/ISOLATED bridge is described conceptually but not contractually (G6).
4. New-tab / unsupported URL guard is missing from the injection preconditions (G8).
5. Static checks and smoke tests lack exact script names, globs, and assertions (G10–G12).

## Recommendation

Keep this spec as the MV3 foundation, but tighten it before implementation: replace the broad manifest skeleton with a minimal-plus-optional permission model, add exact README permission-table format, label future links as pending, define the MAIN↔ISOLATED message envelope, and add exact audit script/checklist names. These changes would raise the score to ~90/100 because an AI could then implement and test the MV3 baseline without permission overreach or bridge drift.

## Remaining audit items

1. 03-folder-and-file-layout
2. 04-version-display-and-build-stamp
3. 05-extension-reload-manual
4. 06-extension-reload-auto-on-file-change
5. 07-status-and-health-panel
6. 08-script-injection-lifecycle
7. 09-injection-idempotency-sentinel
8. 10-reinject-and-uninject
9. 11-error-logging-discipline
10. 12-namespace-logger-contract
11. 13-error-routing-and-panel
12. 14-boot-failure-banner (spec pending)
13. 15-floating-in-page-panel (spec pending)
14. 16-storage-sqlite-pointer (spec pending)
15. 17-storage-indexeddb-pointer (spec pending)
16. 18-storage-chrome-local-pointer (spec pending)
17. 19-testing-matrix (spec pending)
18. 20-acceptance-criteria (spec pending)