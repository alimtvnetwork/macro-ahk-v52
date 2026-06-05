# Folder Audit — `03-db-and-sqlite-integration-with-chrome-extension`

| Metric | Value |
| --- | --- |
| Files audited | 42 |
| Mean score | 100 / 100 |
| Implementable % (weighted by file) | 100% |
| Failure % | 0% |
| Files below pass bar (<60) | 0 |
| Files at/above target (>=90) | 42 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 0 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `03-db-and-sqlite-integration-with-chrome-extension/00-forty-planning-steps.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/01-purpose-and-mindset.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/02-four-tier-storage-decision-matrix.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/03-quota-persistence-eviction.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/04-choose-a-tier-flowchart.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/05-mv3-constraints.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/06-folder-and-file-layout.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/07-required-packages-and-no-remote-fetch.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/08-bundling-sql-wasm.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/09-initializing-sql-js.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/10-extensiondb-lifecycle.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/11-schema-declaration-pattern.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/12-schema-versioning-and-deployments.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/13-migration-runner-pattern.md` | 100 | 100% | OK |
| `03-db-and-sqlite-integration-with-chrome-extension/14-per-namespace-db-pattern.md` | 100 | 100% | OK |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `03-db-and-sqlite-integration-with-chrome-extension/00-forty-planning-steps.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/01-purpose-and-mindset.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/02-four-tier-storage-decision-matrix.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/03-quota-persistence-eviction.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/04-choose-a-tier-flowchart.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/05-mv3-constraints.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/06-folder-and-file-layout.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/07-required-packages-and-no-remote-fetch.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/08-bundling-sql-wasm.md` | 100 | 100% |
| `03-db-and-sqlite-integration-with-chrome-extension/09-initializing-sql-js.md` | 100 | 100% |

## All dangling links

_None detected by relative-path resolution._

## Recommended remediation pattern

1. Add or preserve `## Pitfalls` with counter-examples in every contract file.
2. Convert vague prose into MUST/SHALL rules and bind operational numbers to `reference/05-runtime-defaults.md` or `mem://` rules.
3. Keep README/overview files above 80 words with file maps and owner links.
4. Keep `node scripts/audit/check-acceptance.mjs`, `node scripts/audit/check-dangling-links.mjs`, `node scripts/audit/check-must-constants.mjs`, and `node scripts/audit/check-pitfalls.mjs` green.

## Heuristic transparency

Scores are computed by `scripts/audit/audit-scan.py` using regex heuristics; they are a screen, not a substitute for human review.
