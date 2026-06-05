# Folder Audit — `03-chrome-ext-features`

| Metric | Value |
| --- | --- |
| Files audited | 35 |
| Mean score | 99.9 / 100 |
| Implementable % (weighted by file) | 99.9% |
| Failure % | 0.1% |
| Files below pass bar (<60) | 0 |
| Files at/above target (>=90) | 35 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 0 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `03-chrome-ext-features/18-storage-chrome-local-pointer.md` | 95 | 95% | OK |
| `03-chrome-ext-features/01-purpose-and-scope.md` | 100 | 100% | OK |
| `03-chrome-ext-features/02-manifest-v3-foundations.md` | 100 | 100% | OK |
| `03-chrome-ext-features/03-folder-and-file-layout.md` | 100 | 100% | OK |
| `03-chrome-ext-features/04-version-display-and-build-stamp.md` | 100 | 100% | OK |
| `03-chrome-ext-features/05-extension-reload-manual.md` | 100 | 100% | OK |
| `03-chrome-ext-features/06-extension-reload-auto-on-file-change.md` | 100 | 100% | OK |
| `03-chrome-ext-features/07-status-and-health-panel.md` | 100 | 100% | OK |
| `03-chrome-ext-features/08-script-injection-lifecycle.md` | 100 | 100% | OK |
| `03-chrome-ext-features/09-injection-idempotency-sentinel.md` | 100 | 100% | OK |
| `03-chrome-ext-features/10-reinject-and-uninject.md` | 100 | 100% | OK |
| `03-chrome-ext-features/11-error-logging-discipline.md` | 100 | 100% | OK |
| `03-chrome-ext-features/12-namespace-logger-contract.md` | 100 | 100% | OK |
| `03-chrome-ext-features/13-error-routing-and-panel.md` | 100 | 100% | OK |
| `03-chrome-ext-features/14-boot-failure-banner.md` | 100 | 100% | OK |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `03-chrome-ext-features/01-purpose-and-scope.md` | 100 | 100% |
| `03-chrome-ext-features/02-manifest-v3-foundations.md` | 100 | 100% |
| `03-chrome-ext-features/03-folder-and-file-layout.md` | 100 | 100% |
| `03-chrome-ext-features/04-version-display-and-build-stamp.md` | 100 | 100% |
| `03-chrome-ext-features/05-extension-reload-manual.md` | 100 | 100% |
| `03-chrome-ext-features/06-extension-reload-auto-on-file-change.md` | 100 | 100% |
| `03-chrome-ext-features/07-status-and-health-panel.md` | 100 | 100% |
| `03-chrome-ext-features/08-script-injection-lifecycle.md` | 100 | 100% |
| `03-chrome-ext-features/09-injection-idempotency-sentinel.md` | 100 | 100% |
| `03-chrome-ext-features/10-reinject-and-uninject.md` | 100 | 100% |

## All dangling links

_None detected by relative-path resolution._

## Recommended remediation pattern

1. Add or preserve `## Pitfalls` with counter-examples in every contract file.
2. Convert vague prose into MUST/SHALL rules and bind operational numbers to `reference/05-runtime-defaults.md` or `mem://` rules.
3. Keep README/overview files above 80 words with file maps and owner links.
4. Keep `node scripts/audit/check-acceptance.mjs`, `node scripts/audit/check-dangling-links.mjs`, `node scripts/audit/check-must-constants.mjs`, and `node scripts/audit/check-pitfalls.mjs` green.

## Heuristic transparency

Scores are computed by `scripts/audit/audit-scan.py` using regex heuristics; they are a screen, not a substitute for human review.
