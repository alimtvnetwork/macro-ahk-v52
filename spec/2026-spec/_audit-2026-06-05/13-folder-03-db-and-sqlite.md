# Folder Audit — `03-db-and-sqlite-integration-with-chrome-extension`

| Metric | Value |
| --- | --- |
| Files audited | 42 |
| Mean score | 60.3 / 100 |
| Implementable % (weighted by file) | 60.3% |
| Failure % | 39.7% |
| Files below pass bar (<60) | 25 |
| Files at/above target (>=90) | 1 |
| Dangling relative-link refs | 151 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 31 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` | 45 | 45% | vague (no MUST/numerics); 5 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/28-cross-version-storage-migration.md` | 45 | 45% | vague (no MUST/numerics); 5 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/31-error-model.md` | 45 | 45% | vague (no MUST/numerics); 6 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/32-error-routing.md` | 45 | 45% | vague (no MUST/numerics); 5 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/34-boot-failure-banner.md` | 45 | 45% | vague (no MUST/numerics); 6 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/35-logging-tables-and-retention.md` | 45 | 45% | vague (no MUST/numerics); 5 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/37-strictly-avoid.md` | 45 | 45% | vague (no MUST/numerics); 7 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/39-ci-gates.md` | 45 | 45% | vague (no MUST/numerics); 5 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/01-purpose-and-mindset.md` | 48 | 48% | vague (no MUST/numerics); 4 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/03-quota-persistence-eviction.md` | 50 | 50% | vague (no MUST/numerics); 8 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/29-cross-context-access.md` | 50 | 50% | vague (no MUST/numerics); 6 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/38-testing.md` | 50 | 50% | vague (no MUST/numerics); 6 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/40-acceptance-criteria.md` | 50 | 50% | vague (no MUST/numerics); 7 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/24-indexeddb-invalidation.md` | 53 | 53% | vague (no MUST/numerics); 5 dangling link(s); no pitfalls/edge cases |
| `03-db-and-sqlite-integration-with-chrome-extension/25-chrome-storage-local-usage.md` | 53 | 53% | vague (no MUST/numerics); 5 dangling link(s); no pitfalls/edge cases |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `03-db-and-sqlite-integration-with-chrome-extension/10-extensiondb-lifecycle.md` | 95 | 95% |
| `03-db-and-sqlite-integration-with-chrome-extension/08-bundling-sql-wasm.md` | 88 | 88% |
| `03-db-and-sqlite-integration-with-chrome-extension/09-initializing-sql-js.md` | 83 | 83% |
| `03-db-and-sqlite-integration-with-chrome-extension/05-mv3-constraints.md` | 80 | 80% |
| `03-db-and-sqlite-integration-with-chrome-extension/06-folder-and-file-layout.md` | 78 | 78% |
| `03-db-and-sqlite-integration-with-chrome-extension/13-migration-runner-pattern.md` | 78 | 78% |
| `03-db-and-sqlite-integration-with-chrome-extension/18-flush-strategy.md` | 76 | 76% |
| `03-db-and-sqlite-integration-with-chrome-extension/14-per-namespace-db-pattern.md` | 75 | 75% |
| `03-db-and-sqlite-integration-with-chrome-extension/16-bind-safety-proxy-net.md` | 75 | 75% |
| `03-db-and-sqlite-integration-with-chrome-extension/17-persistence-backends.md` | 73 | 73% |

## All dangling links

- `03-db-and-sqlite-integration-with-chrome-extension/01-purpose-and-mindset.md` → `./01-forty-planning-steps.md`, `./step-40-acceptance-criteria.md`, `./step-02-four-tier-storage-decision-matrix.md`, `./step-40-acceptance-criteria.md`
- `03-db-and-sqlite-integration-with-chrome-extension/02-four-tier-storage-decision-matrix.md` → `./step-01-purpose-and-mindset.md`, `./step-01-purpose-and-mindset.md`, `./step-03-quota-persistence-eviction.md`, `./step-04-choose-a-tier-flowchart.md`, `./step-05-mv3-constraints.md`, `./step-31-error-model.md`
- `03-db-and-sqlite-integration-with-chrome-extension/03-quota-persistence-eviction.md` → `./step-02-four-tier-storage-decision-matrix.md`, `./step-04-choose-a-tier-flowchart.md`, `./step-02-four-tier-storage-decision-matrix.md`, `./step-04-choose-a-tier-flowchart.md`, `./step-17-persistence-backends.md`, `./step-18-flush-strategy.md`, `./step-26-chrome-storage-local-quota.md`, `./step-31-error-model.md`
- `03-db-and-sqlite-integration-with-chrome-extension/04-choose-a-tier-flowchart.md` → `./step-03-quota-persistence-eviction.md`, `./step-05-mv3-constraints.md`, `./step-03-quota-persistence-eviction.md`, `./step-05-mv3-constraints.md`, `./step-02-four-tier-storage-decision-matrix.md`, `./step-21-indexeddb-when-to-choose.md`, `./step-25-chrome-storage-local-usage.md`, `./step-27-localstorage-usage.md`, `./step-39-ci-gates.md`
- `03-db-and-sqlite-integration-with-chrome-extension/17-persistence-backends.md` → `./step-10-extensiondb-lifecycle.md`, `./step-18-flush-strategy.md`, `./step-26-chrome-storage-local-quota.md`, `./step-34-boot-failure-banner.md`
- `03-db-and-sqlite-integration-with-chrome-extension/18-flush-strategy.md` → `./step-17-persistence-backends.md`, `./step-26-chrome-storage-local-quota.md`, `./step-29-cross-context-access.md`
- `03-db-and-sqlite-integration-with-chrome-extension/19-backup-and-export.md` → `./step-17-persistence-backends.md`, `./step-18-flush-strategy.md`, `./step-26-chrome-storage-local-quota.md`, `./step-35-logging-tables-and-retention.md`
- `03-db-and-sqlite-integration-with-chrome-extension/20-query-helpers.md` → `./step-14-per-namespace-db-pattern.md`, `./step-15-bind-safety-entry-point-guards.md`, `./step-16-bind-safety-proxy-net.md`, `./step-18-flush-strategy.md`
- `03-db-and-sqlite-integration-with-chrome-extension/21-indexeddb-when-to-choose.md` → `./step-02-four-tier-storage-decision-matrix.md`, `./step-22-indexeddb-wrapper-pattern.md`, `./step-23-indexeddb-injection-cache.md`, `./step-25-chrome-storage-local-usage.md`
- `03-db-and-sqlite-integration-with-chrome-extension/22-indexeddb-wrapper-pattern.md` → `./step-21-indexeddb-when-to-choose.md`, `./step-23-indexeddb-injection-cache.md`, `./step-24-indexeddb-invalidation.md`, `./step-18-flush-strategy.md`
- `03-db-and-sqlite-integration-with-chrome-extension/23-indexeddb-injection-cache.md` → `./step-21-indexeddb-when-to-choose.md`, `./step-22-indexeddb-wrapper-pattern.md`, `./step-24-indexeddb-invalidation.md`, `./step-30-sdk-content-script-contract.md`
- `03-db-and-sqlite-integration-with-chrome-extension/24-indexeddb-invalidation.md` → `./step-18-flush-strategy.md`, `./step-21-indexeddb-when-to-choose.md`, `./step-22-indexeddb-wrapper-pattern.md`, `./step-23-indexeddb-injection-cache.md`, `./step-26-chrome-storage-local-quota.md`
- `03-db-and-sqlite-integration-with-chrome-extension/25-chrome-storage-local-usage.md` → `./step-02-four-tier-storage-decision-matrix.md`, `./step-03-quota-persistence-eviction.md`, `./step-21-indexeddb-when-to-choose.md`, `./step-26-chrome-storage-local-quota.md`, `./step-28-cross-version-migration.md`
- `03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` → `./step-03-quota-persistence-eviction.md`, `./step-21-indexeddb-when-to-choose.md`, `./step-25-chrome-storage-local-usage.md`, `./step-31-error-model.md`, `./step-39-ci-gates.md`
- `03-db-and-sqlite-integration-with-chrome-extension/27-localstorage-usage.md` → `./01-forty-planning-steps.md`, `./step-02-four-tier-storage-decision-matrix.md`, `./step-25-chrome-storage-local-usage.md`, `./step-28-cross-version-storage-migration.md`, `./step-30-sdk-content-script-contract.md`
- `03-db-and-sqlite-integration-with-chrome-extension/28-cross-version-storage-migration.md` → `./01-forty-planning-steps.md`, `./step-13-migration-runner-pattern.md`, `./step-24-indexeddb-invalidation.md`, `./step-25-chrome-storage-local-usage.md`, `./step-26-chrome-storage-local-quota.md`
- `03-db-and-sqlite-integration-with-chrome-extension/29-cross-context-access.md` → `./01-forty-planning-steps.md`, `./step-15-bind-safety-entry-point-guards.md`, `./step-18-flush-strategy.md`, `./step-27-localstorage-usage.md`, `./step-30-sdk-content-script-contract.md`, `./step-32-error-routing.md`
- `03-db-and-sqlite-integration-with-chrome-extension/30-sdk-content-script-contract.md` → `./01-forty-planning-steps.md`, `./step-15-bind-safety-entry-point-guards.md`, `./step-16-bind-safety-proxy-net.md`, `./step-27-localstorage-usage.md`, `./step-29-cross-context-access.md`
- `03-db-and-sqlite-integration-with-chrome-extension/31-error-model.md` → `./01-forty-planning-steps.md`, `./step-16-bind-safety-proxy-net.md`, `./step-29-cross-context-access.md`, `./step-32-error-routing.md`, `./step-33-errors-panel-ui-hookup.md`, `./step-36-code-red-logging-rule.md`
- `03-db-and-sqlite-integration-with-chrome-extension/32-error-routing.md` → `./01-forty-planning-steps.md`, `./step-31-error-model.md`, `./step-33-errors-panel-ui-hookup.md`, `./step-34-boot-failure-banner.md`, `./step-36-code-red-logging-rule.md`
- `03-db-and-sqlite-integration-with-chrome-extension/33-errors-panel-ui-hookup.md` → `./01-forty-planning-steps.md`, `./step-31-error-model.md`, `./step-32-error-routing.md`, `./step-34-boot-failure-banner.md`, `./step-35-logging-tables-and-retention.md`
- `03-db-and-sqlite-integration-with-chrome-extension/34-boot-failure-banner.md` → `./01-forty-planning-steps.md`, `./step-09-initializing-sql-js.md`, `./step-17-persistence-backends.md`, `./step-32-error-routing.md`, `./step-33-errors-panel-ui-hookup.md`, `./step-36-code-red-logging-rule.md`
- `03-db-and-sqlite-integration-with-chrome-extension/35-logging-tables-and-retention.md` → `./01-forty-planning-steps.md`, `./step-17-persistence-backends.md`, `./step-18-flush-strategy.md`, `./step-31-error-model.md`, `./step-33-errors-panel-ui-hookup.md`
- `03-db-and-sqlite-integration-with-chrome-extension/36-code-red-logging-rule.md` → `./01-forty-planning-steps.md`, `./step-09-initializing-sql-js.md`, `./step-16-bind-safety-proxy-net.md`, `./step-31-error-model.md`, `./step-32-error-routing.md`
- `03-db-and-sqlite-integration-with-chrome-extension/37-strictly-avoid.md` → `./01-forty-planning-steps.md`, `./step-07-required-packages-and-no-remote-fetch.md`, `./step-16-bind-safety-proxy-net.md`, `./step-23-indexeddb-injection-cache.md`, `./step-25-chrome-storage-local-usage.md`, `./step-36-code-red-logging-rule.md`, `./step-39-ci-gates.md`
- `03-db-and-sqlite-integration-with-chrome-extension/38-testing.md` → `./01-forty-planning-steps.md`, `./step-16-bind-safety-proxy-net.md`, `./step-18-flush-strategy.md`, `./step-23-indexeddb-injection-cache.md`, `./step-31-error-model.md`, `./step-39-ci-gates.md`
- `03-db-and-sqlite-integration-with-chrome-extension/39-ci-gates.md` → `./01-forty-planning-steps.md`, `./step-07-required-packages-and-no-remote-fetch.md`, `./step-25-chrome-storage-local-usage.md`, `./step-36-code-red-logging-rule.md`, `./step-38-testing.md`
- `03-db-and-sqlite-integration-with-chrome-extension/40-acceptance-criteria.md` → `./01-forty-planning-steps.md`, `./step-01-purpose-and-mindset.md`, `./step-17-persistence-backends.md`, `./step-31-error-model.md`, `./step-37-strictly-avoid.md`, `./step-38-testing.md`, `./step-39-ci-gates.md`
- `03-db-and-sqlite-integration-with-chrome-extension/README.md` → `./01-forty-planning-steps.md`, `./step-40-acceptance-criteria.md`, `./step-40-acceptance-criteria.md`, `./step-01-purpose-and-mindset.md`

## Recommended remediation pattern

1. Add an explicit `## Acceptance` section to every file lacking one (use `- [ ]` machine-checkable bullets).
2. Convert every numeric constant ("5 seconds", "100 items") to a bolded MUST clause with a source-of-truth link to `reference/05-runtime-defaults.md` or equivalent.
3. Add `## Pitfalls` (≥2 counter-examples) to every file below 60.
4. Fix dangling relative links (list above) — broken refs make blind-AI fail-fast.
5. Promote thin files (<80 words) to inline summary + at least one example.

## Heuristic transparency

Scores are computed by `/tmp/audit_scan.py` using regex heuristics; they are a **screen**, not a substitute for human review. They correlate strongly with blind-AI implementability but can over-penalize index/README files and over-reward verbose prose.
