# Acceptance Matrix

**Updated:** 2026-06-03
**Rule:** Every spec subfolder must have a row. Implementer fills the right column with the test ID(s) that prove the acceptance.

| Spec folder | Acceptance summary | Bound test IDs |
|---|---|---|
| `01-glossary/` | All terms used in spec body appear here | LINT-glossary-coverage |
| `02-data-model/` | Prompt + Category + Store contracts hold | UT-data-001..010 |
| `03-prompt-source-format/` | Round-trip parse→emit byte-equal | UT-source-001..008 |
| `04-loader-contract/` | Loader returns typed errors; cache LRU bounded | UT-loader-001..012 |
| `05-ui-contract/` | Trigger opens, keyboard nav works, a11y green | CT-ui-001..009, E2E-ui-001..003 |
| `06-injection-contract/` | 4 paste strategies pass verification | UT-inject-001..008, E2E-inject-001..004 |
| `07-editor-adapters/` | textarea / contenteditable / rich editors all paste | E2E-adapter-001..006 |
| `08-save-create-edit/` | Create/edit/delete/duplicate/import CRUD reversible | UT-crud-001..010 |
| `09-next-overview/` | Submit detected; disabled handled; cancellable | E2E-next-001..005 |
| `10-queue-model/` | Task shape + statuses + ordering enforced | UT-queue-001..010 |
| `11-queue-lifecycle/` | enqueue→tick→complete with retry+hold semantics | UT-lifecycle-001..010 |
| `12-delay-engine/` | Default+jitter+skip-first+pause behave per spec | UT-delay-001..006 |
| `13-failure-handling/` | Mandatory failure-log shape on every failure path | UT-fail-001..010 |
| `14-plan-mode/` | Plan rendered before execution; can be edited | E2E-plan-001..003 |
| `15-settings/` | Schema validated; reset works; host overrides apply | UT-settings-001..006 |
| `16-observability/` | Event stream conforms to schema; metrics emitted | UT-obs-001..008 |
| `17-onboarding/` | First-run tour completes; empty states render | E2E-onb-001..004 |
| `18-test-plan/` | Test inventories present; fixtures discoverable | meta-check |
| `19-reference-snippets/` | All snippets typecheck | `typecheck-spec-snippets.mjs` |
| `20-adoption-checklist/` | Pre-flight + go-live + handoff documented | meta-check |

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](reference/05-runtime-defaults.md). If a value differs, the SOT wins.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](reference/05-runtime-defaults.md); see also [related](readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

## Acceptance

- [ ] Every sibling `*.md` listed below this index also declares its own `## Acceptance` block (verified by `scripts/audit/check-acceptance.mjs`).
- [ ] All relative links in this file resolve (verified by `scripts/audit/check-dangling-links.mjs`).
- [ ] No operational numeric constant is hardcoded here without binding to `reference/05-runtime-defaults.md` (verified by `scripts/audit/check-must-constants.mjs --strict`).
- [ ] Composite audit score for this folder is `100 / 100` (verified by `scripts/audit/audit-scan.py`).

