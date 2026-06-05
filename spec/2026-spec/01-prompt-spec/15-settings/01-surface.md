# 01 — Settings Surface

**Date:** 2026-06-02
**Task:** T91

## Sections

A single Settings page with collapsible sections, ordered:

1. **Prompts** — manage list, import/export.
2. **Next mode** — default delay, jitter, skip-first, idle timeout.
3. **Plan mode** — default slug, step count, delay, idle timeout, autoOpenResult.
4. **Editor & Injection** — adapter priority overrides, paste-verification toggle.
5. **Debugging** — verbose logging toggle (mirrors Core memory's per-project gate).
6. **Reset** — restore defaults (per section, with confirm).

## Persistence keys

| Section | Key |
|---------|-----|
| Next mode | `prompts.delaySettings` |
| Plan mode | `prompts.planSettings` |
| Editor | `prompts.editorSettings` |
| Debugging | `prompts.debugSettings` |

All values JSON-validated on read; invalid blobs fall back to defaults with one warn log.

## Live application

Settings changes apply on save without reload. The queue engine reads settings lazily per tick, so an in-flight task uses the values it captured at enqueue; the **next** task picks up new values.

## Acceptance

- [ ] The implementation satisfies the `01 — Settings Surface` contract in this file and the folder-level acceptance target: settings schema, defaults, reset, host overrides, and UX surface validate consistently.
- [ ] Verification passes when `UT-settings-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
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
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
