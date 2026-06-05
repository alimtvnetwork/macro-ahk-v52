# Folder Audit — `03-db-and-sqlite-integration-with-chrome-extension`

| Metric | Value |
| --- | --- |
| Files audited | 42 |
| Mean score | 69.4 / 100 |
| Implementable % (weighted by file) | 69.4% |
| Failure % | 30.6% |
| Files below pass bar (<60) | 2 |
| Files at/above target (>=90) | 1 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 31 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `03-db-and-sqlite-integration-with-chrome-extension/00-forty-planning-steps.md` | 52 | 52% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/01-purpose-and-mindset.md` | 55 | 55% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/03-quota-persistence-eviction.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/28-cross-version-storage-migration.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/31-error-model.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/32-error-routing.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/34-boot-failure-banner.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/35-logging-tables-and-retention.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/37-strictly-avoid.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/39-ci-gates.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/29-cross-context-access.md` | 65 | 65% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/38-testing.md` | 65 | 65% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/40-acceptance-criteria.md` | 65 | 65% | vague (no MUST/numerics); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/README.md` | 65 | 65% | no pitfalls/edge cases |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `03-db-and-sqlite-integration-with-chrome-extension/10-extensiondb-lifecycle.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/08-bundling-sql-wasm.md` | 88 | 88% |
| `03-db-and-sqlite-integration-with-chrome-extension/17-persistence-backends.md` | 85 | 85% |
| `03-db-and-sqlite-integration-with-chrome-extension/18-flush-strategy.md` | 85 | 85% |
| `03-db-and-sqlite-integration-with-chrome-extension/09-initializing-sql-js.md` | 83 | 83% |
| `03-db-and-sqlite-integration-with-chrome-extension/05-mv3-constraints.md` | 80 | 80% |
| `03-db-and-sqlite-integration-with-chrome-extension/06-folder-and-file-layout.md` | 78 | 78% |
| `03-db-and-sqlite-integration-with-chrome-extension/13-migration-runner-pattern.md` | 78 | 78% |
| `03-db-and-sqlite-integration-with-chrome-extension/14-per-namespace-db-pattern.md` | 75 | 75% |
| `03-db-and-sqlite-integration-with-chrome-extension/16-bind-safety-proxy-net.md` | 75 | 75% |

## All dangling links

_None detected by relative-path resolution._

## Recommended remediation pattern

1. Add `## Pitfalls` with at least two counter-examples to files still lacking edge-case coverage.
2. Convert vague prose into MUST/SHALL rules and bind operational numbers to `reference/05-runtime-defaults.md` or `mem://` rules.
3. Promote thin files (<80 words) to inline summary plus at least one example.
4. Keep `node scripts/audit/check-acceptance.mjs`, `node scripts/audit/check-dangling-links.mjs`, and `node scripts/audit/check-must-constants.mjs` green.

## Heuristic transparency

Scores are computed by `scripts/audit/audit-scan.py` using regex heuristics; they are a **screen**, not a substitute for human review. They correlate strongly with blind-AI implementability but can over-penalize index/README files and over-reward verbose prose.
