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
