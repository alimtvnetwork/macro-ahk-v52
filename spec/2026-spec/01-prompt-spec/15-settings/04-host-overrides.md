# 04 — Per-Host Overrides

**Date:** 2026-06-02
**Task:** T94

## Provider interface

```ts
interface HostOverrides {
  settingsDefaults?: Partial<PromptsSettings>;
  defaultPrompts?: Prompt[];          // shipped bundle
  submitButtonResolver?: SubmitButtonResolver;
  busyIdleObserver?: BusyIdleObserver;
  failureDetectors?: FailureDetectors;
  editorAdapters?: EditorAdapter[];   // appended after built-ins
}
```

The host registers exactly one `HostOverrides` blob at boot:

```ts
PromptsFeature.bootstrap({ host: myHostOverrides });
```

## Merge rules

- `settingsDefaults` shallow-merged onto spec defaults; user settings still win.
- `defaultPrompts` register as read-only entries in the prompt store.
- Resolvers, observers, detectors **replace** the spec defaults entirely — no chain-of-responsibility.
- `editorAdapters` are appended; per `07-editor-adapters/01-adapter-interface.md`, last-registered wins on `canHandle`.

## Forbidden

- Mutating user settings from a host override (overrides only seed defaults).
- Registering more than one bootstrap per page; second call throws.

## Acceptance

- [ ] The implementation satisfies the `04 — Per-Host Overrides` contract in this file and the folder-level acceptance target: settings schema, defaults, reset, host overrides, and UX surface validate consistently.
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

