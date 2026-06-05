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
