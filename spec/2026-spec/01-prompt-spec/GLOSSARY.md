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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](README.md) for sibling specs and cross-references.

## Acceptance

- [ ] Every sibling `*.md` listed below this index also declares its own `## Acceptance` block (verified by `scripts/audit/check-acceptance.mjs`).
- [ ] All relative links in this file resolve (verified by `scripts/audit/check-dangling-links.mjs`).
- [ ] No operational numeric constant is hardcoded here without binding to `reference/05-runtime-defaults.md` (verified by `scripts/audit/check-must-constants.mjs --strict`).
- [ ] Composite audit score for this folder is `100 / 100` (verified by `scripts/audit/audit-scan.py`).

