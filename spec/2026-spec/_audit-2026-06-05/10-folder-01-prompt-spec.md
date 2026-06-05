# Folder Audit — `01-prompt-spec`

| Metric | Value |
| --- | --- |
| Files audited | 131 |
| Mean score | 97.8 / 100 |
| Implementable % (weighted by file) | 97.8% |
| Failure % | 2.2% |
| Files below pass bar (<60) | 0 |
| Files at/above target (>=90) | 131 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 0 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `01-prompt-spec/01-glossary/03-non-goals.md` | 95 | 95% | OK |
| `01-prompt-spec/02-hardening-backlog.md` | 95 | 95% | OK |
| `01-prompt-spec/03-prompt-source-format/03-prompt-md.md` | 95 | 95% | OK |
| `01-prompt-spec/04-loader-contract/01-loader-interface.md` | 95 | 95% | OK |
| `01-prompt-spec/04-loader-contract/02-cache-rules.md` | 95 | 95% | OK |
| `01-prompt-spec/05-ui-contract/01-trigger.md` | 95 | 95% | OK |
| `01-prompt-spec/05-ui-contract/02-dropdown-shape.md` | 95 | 95% | OK |
| `01-prompt-spec/05-ui-contract/03-search-filter.md` | 95 | 95% | OK |
| `01-prompt-spec/05-ui-contract/04-keyboard.md` | 95 | 95% | OK |
| `01-prompt-spec/07-editor-adapters/02-contenteditable.md` | 95 | 95% | OK |
| `01-prompt-spec/07-editor-adapters/03-textarea.md` | 95 | 95% | OK |
| `01-prompt-spec/08-save-create-edit/02-edit-prompt.md` | 95 | 95% | OK |
| `01-prompt-spec/08-save-create-edit/03-delete-and-archive.md` | 95 | 95% | OK |
| `01-prompt-spec/08-save-create-edit/04-duplicate-and-import.md` | 95 | 95% | OK |
| `01-prompt-spec/08-save-create-edit/05-editor-ux.md` | 95 | 95% | OK |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `01-prompt-spec/00-overview.md` | 100 | 100% |
| `01-prompt-spec/01-glossary/01-terms.md` | 100 | 100% |
| `01-prompt-spec/01-glossary/02-actors.md` | 100 | 100% |
| `01-prompt-spec/01-glossary/04-vocabulary-banlist.md` | 100 | 100% |
| `01-prompt-spec/01-plan-tasks-1-20.md` | 100 | 100% |
| `01-prompt-spec/02-data-model/01-prompt.md` | 100 | 100% |
| `01-prompt-spec/02-data-model/02-category.md` | 100 | 100% |
| `01-prompt-spec/02-data-model/03-store-interface.md` | 100 | 100% |
| `01-prompt-spec/02-data-model/04-id-and-slug-rules.md` | 100 | 100% |
| `01-prompt-spec/02-data-model/05-json-schema.md` | 100 | 100% |

## All dangling links

_None detected by relative-path resolution._

## Recommended remediation pattern

1. Add or preserve `## Pitfalls` with counter-examples in every contract file.
2. Convert vague prose into MUST/SHALL rules and bind operational numbers to `reference/05-runtime-defaults.md` or `mem://` rules.
3. Keep README/overview files above 80 words with file maps and owner links.
4. Keep `node scripts/audit/check-acceptance.mjs`, `node scripts/audit/check-dangling-links.mjs`, `node scripts/audit/check-must-constants.mjs`, and `node scripts/audit/check-pitfalls.mjs` green.

## Heuristic transparency

Scores are computed by `scripts/audit/audit-scan.py` using regex heuristics; they are a screen, not a substitute for human review.
