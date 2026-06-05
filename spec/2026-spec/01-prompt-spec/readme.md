# 2026 Prompt Spec — Master Index

**Updated:** 2026-06-03
**Canonical path:** `spec/2026-spec/01-prompt-spec/`
**Score:** 100 / 100 (blind-AI rescore, post 30-step content uplift — see `99-spec-issues/303-30-step-content-uplift.md`)

## How to read

1. New implementer? Start with `IMPLEMENTATION-CHECKLIST.md`, then run `BLIND-AI-SMOKE-TEST.md` at the end.
2. Vocabulary? `GLOSSARY.md` + `01-glossary/`.
3. Want to verify acceptance? `ACCEPTANCE-MATRIX.md`.

## Top-level files

- `00-overview.md` — narrative overview
- `01-plan-tasks-1-20.md` — task list
- `02-hardening-backlog.md` — known follow-ups
- `GLOSSARY.md` — terms
- `IMPLEMENTATION-CHECKLIST.md` — phase-by-phase runbook
- `BLIND-AI-SMOKE-TEST.md` — 20-question gate
- `ACCEPTANCE-MATRIX.md` — folder ↔ test-id binding

## Spec folders (dense 01–20)

| # | Folder | Theme |
|---:|---|---|
| 01 | `01-glossary/` | Terms, actors, non-goals |
| 02 | `02-data-model/` | Prompt, Category, Store |
| 03 | `03-prompt-source-format/` | Folder + info.json + prompt.md |
| 04 | `04-loader-contract/` | Loader, cache, variable resolution |
| 05 | `05-ui-contract/` | Trigger, dropdown, search, keyboard, a11y |
| 06 | `06-injection-contract/` | Target, paste, verify, toast |
| 07 | `07-editor-adapters/` | textarea, contenteditable, rich, fallback |
| 08 | `08-save-create-edit/` | CRUD |
| 09 | `09-next-overview/` | Submit button + next loop |
| 10 | `10-queue-model/` | Task shape, statuses, capacity, ordering |
| 11 | `11-queue-lifecycle/` | enqueue → tick → completion |
| 12 | `12-delay-engine/` | Default, jitter, skip-first, pause |
| 13 | `13-failure-handling/` | Categories, hooks, recovery, mandatory log |
| 14 | `14-plan-mode/` | Plan-mode UX |
| 15 | `15-settings/` | Surface, schema, defaults, overrides |
| 16 | `16-observability/` | Events, metrics, debug panel |
| 17 | `17-onboarding/` | First-run, tour, empty, telemetry |
| 18 | `18-test-plan/` | Test plan overview |
| 19 | `19-reference-snippets/` | TS snippets (typecheck-gated) |
| 20 | `20-adoption-checklist/` | Pre-flight + go-live + handoff |

## Reference subtrees (added 2026-06-03)

| Folder | Contains |
|---|---|
| `schemas/` | JSON Schemas: prompt, category, queue-task, settings, info.json |
| `pseudocode/` | Loader runner, queue engine, delay engine, paste strategies, failure router |
| `ui-reference/` | Keyboard map, a11y matrix, CSS tokens, error catalog, empty states |
| `test-inventory/` | Unit / component / e2e / fixtures / CI gates |
| `reference/` | Edge cases, failure reason codes, metrics, log format, runtime defaults |
| `99-spec-issues/` | Audit trail (rescores, gap-closure proofs, content uplift manifest) |

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
- See [folder index](../readme.md) for sibling specs and cross-references.

## Acceptance

- [ ] Every sibling `*.md` listed below this index also declares its own `## Acceptance` block (verified by `scripts/audit/check-acceptance.mjs`).
- [ ] All relative links in this file resolve (verified by `scripts/audit/check-dangling-links.mjs`).
- [ ] No operational numeric constant is hardcoded here without binding to `reference/05-runtime-defaults.md` (verified by `scripts/audit/check-must-constants.mjs --strict`).
- [ ] Composite audit score for this folder is `100 / 100` (verified by `scripts/audit/audit-scan.py`).

