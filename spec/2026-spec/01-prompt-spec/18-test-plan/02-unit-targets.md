# 02 — Unit Test Targets

**Date:** 2026-06-02
**Task:** T107

## Modules and what to assert

### Loader (`04-loader-contract/`)
- Slug collision → user wins, default kept for reset.
- Cache key `"prompts:all"` invalidated on `created`/`updated`/`deleted` events.
- Variable resolution order: Caller > Editor > Clock > Empty.
- Every `PromptError.reason` mapped from a synthetic input.

### Queue engine (`10-queue-model/`, `11-queue-lifecycle/`)
- One task `processing` at a time even with concurrent `tick()` calls.
- `attemptCount` never exceeds 1 across all paths.
- Capacity rejection is atomic for bulk enqueue.
- FIFO holds under concurrent `add` + `moveTo`.

### Delay engine (`12-delay-engine/`)
- `effectiveDelay` clamps to `[1000, 60000]` even when base+jitter exceeds bounds.
- `skipFirst` resets on drain and on `cancelAll` but not on `pause`.
- `InterruptibleDelay.wait` rejects immediately when `signal.aborted` is true before invocation.

### Settings (`15-settings/`)
- Corrupt JSON falls back to defaults + one warn log.
- Migrations called with the right `fromVersion`.
- `adapterPriority` unknown ids dropped silently.

### Failure record (`13-failure-handling/`)
- Builder produces non-empty `selectorAttempts` and `variableContext` for every reason — even when category is "n/a" the entry has `reason: null`.
- Verbose toggle gates only the truncation, never structural fields.

## Acceptance

- [ ] The implementation satisfies the `02 — Unit Test Targets` contract in this file and the folder-level acceptance target: test inventories, target lists, fixtures, and mocks remain discoverable by automation.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

