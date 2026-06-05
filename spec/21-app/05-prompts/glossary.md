# Glossary

| Term | Definition |
|---|---|
| **Macro** | Ordered chain of typed steps stored as a `MacroDefinition` JSON |
| **Step** | Single typed action (one of 8 `StepKindId`s) |
| **StepKindId** | Integer 1–8 mapping to a Step kind (see `macros/01-step-kinds.md`) |
| **RunId** | UUID v4 generated at macro start; namespaces all artifacts |
| **RunState** | Persistent record under `chrome.storage.local` key `Macro.RunState.<RunId>` |
| **MacroEvent** | Typed event union emitted on the message bus |
| **Score** | Integer 0–100 parsed from final-audit output |
| **TargetScore** | Threshold a `loop-if` checks against (default 100) |
| **MaxLoops** | Hard cap on `loop-if` iterations (default 5, ceiling 20) |
| **Audit folder** | `spec/audit/<RunId>/` — written by `audit` / `final-audit` steps |
| **Interpolator** | Resolves `{{ Var }}` via 5-tier waterfall |
| **Variable Sensitive** | Flag marking a variable for `***` masking in all outputs |
| **Verbose logging** | Per-project toggle gating full HTML + untruncated Text capture |
| **SelectorAttempts** | Mandatory failure-log array describing every selector try |
| **VariableContext** | Mandatory failure-log array describing every variable resolution |
| **Reason / ReasonDetail** | Short code + human string on every failure log |
| **Injector** | MAIN-world script executing DOM/chatbox actions |
| **Background runner** | Service-worker module owning RunState and watchdog |
| **Panel** | React UI in extension popup/sidebar |
| **Built-in context** | Auto-supplied read-only variables (RunId, Now, TabId, …) |
| **info.json** | Per-prompt declaration file (slug, version, variables) |
| **Slug** | URL-safe prompt identifier (kebab-case) |
| **Seed bundle** | Initial set of starter prompts shipped with the extension |
| **Prompt cache** | IndexedDB JsonCopy + HtmlCopy stores |
