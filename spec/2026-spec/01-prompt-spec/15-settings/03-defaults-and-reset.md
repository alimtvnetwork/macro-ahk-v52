# 03 — Defaults & Reset

**Date:** 2026-06-02
**Task:** T93

## Default values (consolidated)

```ts
const DEFAULTS: PromptsSettings = {
  delay: {
    default: { baseMs: 7000, jitterPct: 0.2, skipFirst: true },
    perKind: {
      plan: { baseMs: 12000, jitterPct: 0.2, skipFirst: false },
    },
  },
  plan: {
    promptSlug: "plan-default",
    stepCount: 10,
    delay: { baseMs: 12000, jitterPct: 0.2, skipFirst: false },
    idleTimeoutMs: 180000,
    autoOpenResult: true,
  },
  editor: {
    adapterPriority: ["contenteditable", "textarea"],
    pasteVerification: true,
    caretSnippetMarker: "???",
  },
  debug: {
    verboseLogging: false,
    exposeFailureDrawer: true,
  },
};
```

## Reset semantics

- **Reset section** — restores only that section to defaults.
- **Reset all** — restores every section; does **not** touch the prompt store (prompts are content, not settings).
- Confirmation modal lists the keys that will be overwritten. No silent reset.

## Host overrides

A host may register `SettingsDefaultsProvider` to ship custom defaults. User edits win over host defaults; reset restores the **host** default (not the spec default).

## Acceptance

- [ ] The implementation satisfies the `03 — Defaults & Reset` contract in this file and the folder-level acceptance target: settings schema, defaults, reset, host overrides, and UX surface validate consistently.
- [ ] Verification passes when `UT-settings-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

