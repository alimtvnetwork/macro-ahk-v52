# Glossary — 2026 Prompt Spec

**Updated:** 2026-06-03

| Term | Definition |
|---|---|
| **Prompt** | A reusable text body with a stable `id`, `slug`, `title`, optional `category`, and variable placeholders (`${Var}`). |
| **Category** | A flat grouping label attached to a Prompt; UI may filter on it. No nesting. |
| **PromptStore** | The interface defined in `02-data-model/03-store-interface.md` for CRUD on prompts. |
| **Loader** | Module that materializes Prompts from source (folder/ZIP/bundle) into the in-memory store. See `04-loader-contract/`. |
| **Host page** | The third-party web page (e.g. an AI chat UI) where Prompts are injected. |
| **Editor adapter** | Strategy that knows how to read/write a specific editor surface (`textarea`, `contenteditable`, rich editor). See `07-editor-adapters/`. |
| **Paste strategy** | One of `replace`, `append`, `prepend`, `insert-at-cursor`. See `06-injection-contract/02-paste-strategies.md`. |
| **Trigger** | The user gesture that opens the Prompt dropdown (default: typing `/` at line start). See `05-ui-contract/01-trigger.md`. |
| **Next loop** | Orchestrator that drives sequential queue execution by clicking the host Submit button between Prompts. |
| **Queue task** | A single scheduled execution of a Prompt: `{id, promptId, vars, status, retries}`. |
| **Delay engine** | Component that decides wait time between tasks (default + jitter + pause). |
| **Plan mode** | Authoring mode where the user previews a generated plan before execution. |
| **Failure log** | The mandatory diagnostic record (`Reason`, `ReasonDetail`, `SelectorAttempts[]`, `VariableContext[]`). |
| **`<NAMESPACE>`** | Placeholder for the host extension namespace (this spec is host-agnostic). |
| **Blind AI** | Hypothetical implementer with no prior project knowledge — the spec must be self-sufficient for them. |
