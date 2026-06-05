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

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.
