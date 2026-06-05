# Folder Audit — `01-prompt-spec`

| Metric | Value |
| --- | --- |
| Files audited | 131 |
| Mean score | 60.0 / 100 |
| Implementable % (weighted by file) | 60.0% |
| Failure % | 40.0% |
| Files below pass bar (<60) | 58 |
| Files at/above target (>=90) | 0 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 127 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `01-prompt-spec/02-hardening-backlog.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/19-reference-snippets/01-prompt-store-in-memory.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/pseudocode/01-loader-runner.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/pseudocode/02-queue-engine.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/pseudocode/03-delay-engine.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/pseudocode/04-paste-strategies.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/test-inventory/03-e2e.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/test-inventory/05-ci-gates.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/ui-reference/01-keyboard-map.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/ui-reference/05-empty-states.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/07-editor-adapters/03-textarea.md` | 48 | 48% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/15-settings/02-schema.md` | 48 | 48% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/16-observability/01-goals.md` | 48 | 48% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/17-onboarding/01-first-run.md` | 48 | 48% | vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/BLIND-AI-SMOKE-TEST.md` | 50 | 50% | vague (no MUST/numerics); no pitfalls/edge cases |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `01-prompt-spec/02-data-model/04-id-and-slug-rules.md` | 80 | 80% |
| `01-prompt-spec/05-ui-contract/05-accessibility.md` | 80 | 80% |
| `01-prompt-spec/01-plan-tasks-1-20.md` | 78 | 78% |
| `01-prompt-spec/05-ui-contract/01-trigger.md` | 78 | 78% |
| `01-prompt-spec/14-plan-mode/03-settings.md` | 78 | 78% |
| `01-prompt-spec/14-plan-mode/04-vs-next-comparison.md` | 78 | 78% |
| `01-prompt-spec/reference/01-edge-cases.md` | 77 | 77% |
| `01-prompt-spec/01-glossary/01-terms.md` | 75 | 75% |
| `01-prompt-spec/04-loader-contract/02-cache-rules.md` | 75 | 75% |
| `01-prompt-spec/06-injection-contract/03-cursor-and-selection.md` | 73 | 73% |

## All dangling links

_None detected by relative-path resolution._

## Recommended remediation pattern

1. Add `## Pitfalls` with at least two counter-examples to files still lacking edge-case coverage.
2. Convert vague prose into MUST/SHALL rules and bind operational numbers to `reference/05-runtime-defaults.md` or `mem://` rules.
3. Promote thin files (<80 words) to inline summary plus at least one example.
4. Keep `node scripts/audit/check-acceptance.mjs`, `node scripts/audit/check-dangling-links.mjs`, and `node scripts/audit/check-must-constants.mjs` green.

## Heuristic transparency

Scores are computed by `scripts/audit/audit-scan.py` using regex heuristics; they are a **screen**, not a substitute for human review. They correlate strongly with blind-AI implementability but can over-penalize index/README files and over-reward verbose prose.
