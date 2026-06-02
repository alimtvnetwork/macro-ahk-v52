# Blind-AI Smoke Test — 20 Questions

A blind AI handed ONLY `spec/21-app/05-prompts/` must answer YES to all 20.

| # | Question | Source | Pass |
|---:|---|---|:--:|
| 1 | What is the exact JSON shape of `MacroDefinition`? | `macros/json/10-macro-definition.schema.json` | ✅ |
| 2 | How is `RunId` generated and persisted? | `macros/engine/00-architecture.md`, `engine/16-runtime-defaults.md` | ✅ |
| 3 | What happens if the service worker restarts mid-run? | `macros/engine/02-resume-after-sw-restart.md`, `engine/10-pseudocode-runner.md` | ✅ |
| 4 | What regex extracts `score: NN/100`? | `macros/engine/03-score-extraction.md`, `engine/12-pseudocode-score-parser.md` | ✅ |
| 5 | What are the 8 StepKindIds and their numeric mapping? | `macros/01-step-kinds.md` | ✅ |
| 6 | How does the variable interpolator resolve `{{ X }}`? | `variables/11-resolution-waterfall.md` | ✅ |
| 7 | What patterns auto-mark a variable sensitive? | `variables/13-sensitive-patterns.md` | ✅ |
| 8 | What is the default MaxLoops and hard cap? | `macros/guards/12-loop-budget-table.md` | ✅ |
| 9 | What is the storage key for RunState? | `macros/06-storage-contract.md` | ✅ |
| 10 | What failure-log fields are mandatory? | `macros/observability/12-failure-reason-codes.md` | ✅ |
| 11 | Keyboard shortcut for Pause/Resume/Stop a macro? | `ui/10-keyboard-map.md` | ✅ |
| 12 | A11y role for the run banner? | `ui/11-a11y-matrix.md` | ✅ |
| 13 | What URL patterns must the auto-injector refuse? | `macros/guards/03-new-tab-guard.md` | ✅ |
| 14 | Where does `audit` step write its output? | `macros/03-audit-artifacts.md`, `engine/14-pseudocode-audit-writer.md` | ✅ |
| 15 | What is the MacroEvent union's TS type? | `macros/engine/15-message-contract-typescript.md` | ✅ |
| 16 | What test counts are required? | `macros/testing/10`–`12` inventories | ✅ |
| 17 | What CI gates block a green build? | `macros/testing/14-ci-gates.md` | ✅ |
| 18 | What injection vectors must be neutralized? | `macros/guards/11-injection-attack-vectors.md` | ✅ |
| 19 | What metric names are emitted and at what cadence? | `macros/observability/11-metrics-glossary.md` | ✅ |
| 20 | What is the end-to-end happy-path sequence? | `macros/examples/10-end-to-end-walkthrough.md` | ✅ |

**Score: 20 / 20.**
