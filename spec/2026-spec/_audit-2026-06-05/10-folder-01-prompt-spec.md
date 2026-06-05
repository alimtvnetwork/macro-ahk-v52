# Folder Audit — `01-prompt-spec`

| Metric | Value |
| --- | --- |
| Files audited | 131 |
| Mean score | 38.3 / 100 |
| Implementable % (weighted by file) | 38.3% |
| Failure % | 61.7% |
| Files below pass bar (<60) | 121 |
| Files at/above target (>=90) | 0 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 111 |
| Files lacking pitfalls/edge cases | 127 |
| Files under 80 words (thin) | 4 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `01-prompt-spec/pseudocode/03-delay-engine.md` | 17 | 17% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases; too thin (<80 words) |
| `01-prompt-spec/pseudocode/04-paste-strategies.md` | 17 | 17% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases; too thin (<80 words) |
| `01-prompt-spec/19-reference-snippets/01-prompt-store-in-memory.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/19-reference-snippets/03-textarea-adapter.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/19-reference-snippets/04-contenteditable-adapter.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/pseudocode/01-loader-runner.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/pseudocode/02-queue-engine.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/test-inventory/01-unit.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/test-inventory/03-e2e.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/test-inventory/05-ci-gates.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/ui-reference/01-keyboard-map.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/ui-reference/05-empty-states.md` | 23 | 23% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/15-settings/02-schema.md` | 25 | 25% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/18-test-plan/02-unit-targets.md` | 25 | 25% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `01-prompt-spec/pseudocode/05-failure-router.md` | 25 | 25% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases; too thin (<80 words) |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `01-prompt-spec/01-plan-tasks-1-20.md` | 73 | 73% |
| `01-prompt-spec/99-spec-issues/303-30-step-content-uplift.md` | 70 | 70% |
| `01-prompt-spec/README.md` | 70 | 70% |
| `01-prompt-spec/02-data-model/04-id-and-slug-rules.md` | 65 | 65% |
| `01-prompt-spec/99-spec-issues/200-renumber-baseline.md` | 65 | 65% |
| `01-prompt-spec/04-loader-contract/02-cache-rules.md` | 60 | 60% |
| `01-prompt-spec/05-ui-contract/05-accessibility.md` | 60 | 60% |
| `01-prompt-spec/06-injection-contract/02-paste-strategies.md` | 60 | 60% |
| `01-prompt-spec/18-test-plan/04-component-and-e2e.md` | 60 | 60% |
| `01-prompt-spec/99-spec-issues/302-gap-closure-30-step-proof.md` | 60 | 60% |

## All dangling links

_None detected by relative-path resolution._

## Recommended remediation pattern

1. Add an explicit `## Acceptance` section to every file lacking one (use `- [ ]` machine-checkable bullets).
2. Convert every numeric constant ("5 seconds", "100 items") to a bolded MUST clause with a source-of-truth link to `reference/05-runtime-defaults.md` or equivalent.
3. Add `## Pitfalls` (≥2 counter-examples) to every file below 60.
4. Fix dangling relative links (list above) — broken refs make blind-AI fail-fast.
5. Promote thin files (<80 words) to inline summary + at least one example.

## Heuristic transparency

Scores are computed by `/tmp/audit_scan.py` using regex heuristics; they are a **screen**, not a substitute for human review. They correlate strongly with blind-AI implementability but can over-penalize index/README files and over-reward verbose prose.
