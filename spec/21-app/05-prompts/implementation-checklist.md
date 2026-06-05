# Implementation Checklist (Blind-AI Runbook)

Tick every box in order. Each links to the normative spec doc.

## Phase 1 — Data layer
- [ ] Implement `MacroDefinition` JSON schema → `macros/json/10-macro-definition.schema.json`
- [ ] Implement `RunState` schema → `macros/json/11-run-state.schema.json`
- [ ] Implement `AuditOutput` schema → `macros/json/12-audit-output.schema.json`
- [ ] Implement `MacroEvent` schema → `macros/json/13-event-stream.schema.json`
- [ ] Implement `info.json` schema → `macros/json/14-info-json.schema.json`
- [ ] Add `state-store.ts` against `chrome.storage.local` per `macros/06-storage-contract.md`

## Phase 2 — Engine
- [ ] `runner.ts` per `macros/engine/10-pseudocode-runner.md`
- [ ] `interpolator.ts` per `macros/engine/11-pseudocode-interpolator.md`
- [ ] `score-parser.ts` per `macros/engine/12-pseudocode-score-parser.md`
- [ ] `watchdog.ts` per `macros/engine/13-pseudocode-watchdog.md`
- [ ] `audit-writer.ts` per `macros/engine/14-pseudocode-audit-writer.md`
- [ ] `message-bus.ts` typed per `macros/engine/15-message-contract-typescript.md`
- [ ] Apply runtime defaults from `macros/engine/16-runtime-defaults.md`

## Phase 3 — Variables
- [ ] Parser per `variables/10-grammar-bnf.md`
- [ ] Resolver waterfall per `variables/11-resolution-waterfall.md`
- [ ] Coercion table per `variables/12-type-coercion-table.md`
- [ ] Sensitive masking per `variables/13-sensitive-patterns.md`
- [ ] Built-in context per `variables/14-builtin-context-reference.md`

## Phase 4 — UI
- [ ] Components per `ui/00`–`09`
- [ ] Keyboard map per `ui/10-keyboard-map.md`
- [ ] A11y matrix per `ui/11-a11y-matrix.md`
- [ ] State diagrams per `ui/12-state-diagrams.md`
- [ ] CSS tokens per `ui/13-css-tokens.md`
- [ ] Error surfaces per `ui/14-error-surface-catalog.md`
- [ ] Empty states per `ui/15-empty-states.md`

## Phase 5 — Guards
- [ ] Forbidden/allowed matrix per `macros/guards/10-forbidden-allowed-matrix.md`
- [ ] Injection vectors per `macros/guards/11-injection-attack-vectors.md`
- [ ] Loop budgets per `macros/guards/12-loop-budget-table.md`

## Phase 6 — Observability
- [ ] Log format per `macros/observability/10-log-format-spec.md`
- [ ] Metrics per `macros/observability/11-metrics-glossary.md`
- [ ] Failure reason codes per `macros/observability/12-failure-reason-codes.md`

## Phase 7 — Testing
- [ ] Unit tests per `macros/testing/10-unit-test-inventory.md`
- [ ] Component tests per `macros/testing/11-component-test-inventory.md`
- [ ] E2E tests per `macros/testing/12-e2e-test-inventory.md`
- [ ] Fixtures per `macros/testing/13-fixture-catalog.md`
- [ ] CI gates per `macros/testing/14-ci-gates.md`

## Phase 8 — Verify
- [ ] Run `BLIND-AI-SMOKE-TEST.md` — must pass 20/20
- [ ] Examples walkthrough per `macros/examples/10`–`12`
