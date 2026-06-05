# Folder Audit — `03-chrome-ext-features`

| Metric | Value |
| --- | --- |
| Files audited | 35 |
| Mean score | 81.2 / 100 |
| Implementable % (weighted by file) | 81.2% |
| Failure % | 18.8% |
| Files below pass bar (<60) | 0 |
| Files at/above target (>=90) | 7 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 0 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `03-chrome-ext-features/14-boot-failure-banner.md` | 70 | 70% | vague (no MUST/numerics) |
| `03-chrome-ext-features/16-storage-sqlite-pointer.md` | 70 | 70% | vague (no MUST/numerics) |
| `03-chrome-ext-features/17-storage-indexeddb-pointer.md` | 70 | 70% | vague (no MUST/numerics) |
| `03-chrome-ext-features/18-storage-chrome-local-pointer.md` | 70 | 70% | vague (no MUST/numerics) |
| `03-chrome-ext-features/20-acceptance-criteria.md` | 70 | 70% | vague (no MUST/numerics) |
| `03-chrome-ext-features/README.md` | 70 | 70% | vague (no MUST/numerics) |
| `03-chrome-ext-features/audit/13-error-routing-and-panel-audit.md` | 70 | 70% | vague (no MUST/numerics) |
| `03-chrome-ext-features/audit/14-boot-failure-banner-audit.md` | 70 | 70% | vague (no MUST/numerics) |
| `03-chrome-ext-features/audit/01-purpose-and-scope-audit.md` | 75 | 75% | vague (no MUST/numerics) |
| `03-chrome-ext-features/audit/03-folder-and-file-layout-audit.md` | 75 | 75% | vague (no MUST/numerics) |
| `03-chrome-ext-features/audit/04-version-display-and-build-stamp-audit.md` | 75 | 75% | vague (no MUST/numerics) |
| `03-chrome-ext-features/audit/08-script-injection-lifecycle-audit.md` | 75 | 75% | vague (no MUST/numerics) |
| `03-chrome-ext-features/audit/09-injection-idempotency-sentinel-audit.md` | 75 | 75% | vague (no MUST/numerics) |
| `03-chrome-ext-features/12-namespace-logger-contract.md` | 78 | 78% | vague (no MUST/numerics) |
| `03-chrome-ext-features/19-testing-matrix.md` | 78 | 78% | vague (no MUST/numerics) |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `03-chrome-ext-features/02-manifest-v3-foundations.md` | 95 | 95% |
| `03-chrome-ext-features/06-extension-reload-auto-on-file-change.md` | 95 | 95% |
| `03-chrome-ext-features/07-status-and-health-panel.md` | 95 | 95% |
| `03-chrome-ext-features/11-error-logging-discipline.md` | 95 | 95% |
| `03-chrome-ext-features/13-error-routing-and-panel.md` | 95 | 95% |
| `03-chrome-ext-features/15-floating-in-page-panel.md` | 95 | 95% |
| `03-chrome-ext-features/05-extension-reload-manual.md` | 90 | 90% |
| `03-chrome-ext-features/10-reinject-and-uninject.md` | 88 | 88% |
| `03-chrome-ext-features/audit/06-extension-reload-auto-on-file-change-audit.md` | 88 | 88% |
| `03-chrome-ext-features/audit/07-status-and-health-panel-audit.md` | 88 | 88% |

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
