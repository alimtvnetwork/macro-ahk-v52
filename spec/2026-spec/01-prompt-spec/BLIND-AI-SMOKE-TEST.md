# Blind-AI Smoke Test — 20 Questions

**Updated:** 2026-06-03
**Pass criterion:** 20 / 20. Each question must be answerable by pointing to a single spec file (no inference).

| # | Question | Authoritative file |
|---:|---|---|
| 1 | What fields does a `Prompt` have? | `02-data-model/01-prompt.md` + `schemas/01-prompt.schema.json` |
| 2 | How is a Prompt `id` generated? | `02-data-model/04-id-and-slug-rules.md` |
| 3 | What is the canonical store interface? | `02-data-model/03-store-interface.md` |
| 4 | Where do source files live on disk? | `03-prompt-source-format/01-folder-layout.md` |
| 5 | What keys are required in `info.json`? | `schemas/05-info-json.schema.json` |
| 6 | What does the Loader return on parse failure? | `04-loader-contract/04-error-modes.md` |
| 7 | How are `${Variables}` resolved? | `04-loader-contract/03-variable-resolution.md` |
| 8 | What opens the dropdown? | `05-ui-contract/01-trigger.md` |
| 9 | What keys navigate the dropdown? | `ui-reference/01-keyboard-map.md` |
| 10 | What ARIA roles does the dropdown use? | `ui-reference/02-a11y-matrix.md` |
| 11 | How are paste targets resolved? | `06-injection-contract/01-target-resolution.md` |
| 12 | List the 4 paste strategies. | `06-injection-contract/02-paste-strategies.md` |
| 13 | How is paste success verified? | `06-injection-contract/04-paste-verification.md` |
| 14 | Which adapter handles Monaco/Lexical/ProseMirror? | `07-editor-adapters/04-rich-editors.md` |
| 15 | Where is the queue task schema? | `schemas/03-queue-task.schema.json` |
| 16 | What is the default inter-task delay? | `reference/05-runtime-defaults.md` |
| 17 | List the closed failure reason codes. | `reference/02-failure-reason-codes.md` |
| 18 | What fields must every failure log carry? | `13-failure-handling/05-mandatory-failure-log.md` |
| 19 | Which events are emitted at task completion? | `16-observability/02-event-schema.md` |
| 20 | What gates must CI run before merge? | `test-inventory/05-ci-gates.md` |

A blind AI that answers all 20 with a single direct file pointer can ship.
