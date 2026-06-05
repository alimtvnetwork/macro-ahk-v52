# Implementation Checklist — Blind-AI Runbook

**Updated:** 2026-06-03
**Read order:** Top to bottom. Do not skip ahead.

## Phase 0 — Read

- [ ] `00-overview.md`
- [ ] `GLOSSARY.md`
- [ ] `01-glossary/` (terms, actors, non-goals, vocabulary banlist, scope diagram)

## Phase 1 — Data

- [ ] Implement `Prompt`, `Category` types per `02-data-model/01-prompt.md`, `02-category.md`
- [ ] Implement `PromptStore` per `02-data-model/03-store-interface.md`
- [ ] Validate against `schemas/01-prompt.schema.json` and `02-category.schema.json`
- [ ] Honor id/slug rules in `02-data-model/04-id-and-slug-rules.md`

## Phase 2 — Source format & loader

- [ ] Parse folder layout per `03-prompt-source-format/01-folder-layout.md`
- [ ] Parse `info.json` per `02-info-json.md` (validated by `schemas/05-info-json.schema.json`)
- [ ] Parse `prompt.md` per `03-prompt-md.md`
- [ ] Implement Loader interface per `04-loader-contract/01-loader-interface.md`
- [ ] Cache per `02-cache-rules.md`; resolve variables per `03-variable-resolution.md`
- [ ] Surface error modes per `04-error-modes.md`

## Phase 3 — UI

- [ ] Trigger per `05-ui-contract/01-trigger.md`
- [ ] Dropdown shape per `02-dropdown-shape.md`
- [ ] Search/filter per `03-search-filter.md`
- [ ] Keyboard per `04-keyboard.md` + `ui-reference/01-keyboard-map.md`
- [ ] A11y per `05-accessibility.md` + `ui-reference/02-a11y-matrix.md`

## Phase 4 — Injection

- [ ] Target resolution per `06-injection-contract/01-target-resolution.md`
- [ ] Paste strategies per `02-paste-strategies.md`
- [ ] Cursor/selection per `03-cursor-and-selection.md`
- [ ] Verification per `04-paste-verification.md`
- [ ] Toast per `05-paste-toast.md`

## Phase 5 — Editors

- [ ] Adapter interface per `07-editor-adapters/01-adapter-interface.md`
- [ ] `textarea`, `contenteditable`, rich editors per `02–04`
- [ ] Fallback per `05-fallback-and-detection.md`

## Phase 6 — Save / Create / Edit

- [ ] CRUD per `08-save-create-edit/01–05`

## Phase 7 — Next loop + queue

- [ ] Next overview per `09-next-overview/01–05`
- [ ] Queue model per `10-queue-model/01–05` (validate against `schemas/03-queue-task.schema.json`)
- [ ] Lifecycle per `11-queue-lifecycle/01–05`
- [ ] Delay per `12-delay-engine/01–05` + `reference/05-runtime-defaults.md`

## Phase 8 — Failure handling

- [ ] Categories + detection + recovery per `13-failure-handling/01–04`
- [ ] **Mandatory failure log** per `13-failure-handling/05-mandatory-failure-log.md`
- [ ] Reason code enum per `reference/02-failure-reason-codes.md`

## Phase 9 — Plan mode, settings, observability, onboarding

- [ ] `14-plan-mode/`, `15-settings/`, `16-observability/`, `17-onboarding/`

## Phase 10 — Test

- [ ] Test inventories per `test-inventory/01-unit.md`, `02-component.md`, `03-e2e.md`
- [ ] Fixtures per `04-fixtures.md`
- [ ] CI gates per `05-ci-gates.md`

## Phase 11 — Adoption

- [ ] `20-adoption-checklist/01–05`

## Final gate

- [ ] Pass `BLIND-AI-SMOKE-TEST.md` (20/20)
- [ ] `ACCEPTANCE-MATRIX.md` fully ✅
