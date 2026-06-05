# 02 — Settings Schema

**Date:** 2026-06-02
**Task:** T92

```ts
interface PromptsSettings {
  delay: DelaySettings;        // see 12-delay-engine/02-settings.md
  plan: PlanSettings;          // see 14-plan-mode/03-settings.md
  editor: EditorSettings;
  debug: DebugSettings;
}

interface EditorSettings {
  adapterPriority: string[];        // adapter ids, highest first; unknown ids ignored
  pasteVerification: boolean;       // default true
  caretSnippetMarker: string;       // default "???"
}

interface DebugSettings {
  verboseLogging: boolean;          // default false
  exposeFailureDrawer: boolean;     // default true
}
```

## Validation

- `adapterPriority` entries unknown to the registry are dropped silently (warn-once).
- `caretSnippetMarker` must be 1–8 printable chars; empty resets to `???`.
- `verboseLogging` writes propagate to the project-wide logger gate at save time.

## Migrations

Settings carry an implicit shape version via JSON-Schema validation. Forward-incompatible changes require a migration function `migrate(prev: JsonValue, fromVersion: number): PromptsSettings`. Missing migrations → reset to defaults with one error log.

## Acceptance

- [ ] The implementation satisfies the `02 — Settings Schema` contract in this file and the folder-level acceptance target: settings schema, defaults, reset, host overrides, and UX surface validate consistently.
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

