# Folder Audit — `02-ci-cd-spec-for-chrome-extensions`

| Metric | Value |
| --- | --- |
| Files audited | 20 |
| Mean score | 97.5 / 100 |
| Implementable % (weighted by file) | 97.5% |
| Failure % | 2.5% |
| Files below pass bar (<60) | 0 |
| Files at/above target (>=90) | 20 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 0 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `02-ci-cd-spec-for-chrome-extensions/01-forty-planning-steps.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/07-enumeration-build-and-packaging.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/09-release-artifacts.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/11-no-committed-zips.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/12-readme-and-install-instructions.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/14-glossary.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/15-acceptance-criteria.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/17-final-auditor-score.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/99-consistency-report.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/README.md` | 95 | 95% | OK |
| `02-ci-cd-spec-for-chrome-extensions/02-repo-discovery.md` | 100 | 100% | OK |
| `02-ci-cd-spec-for-chrome-extensions/03-download-and-install-scripts.md` | 100 | 100% | OK |
| `02-ci-cd-spec-for-chrome-extensions/04-probing.md` | 100 | 100% | OK |
| `02-ci-cd-spec-for-chrome-extensions/05-workflow-files-and-triggers.md` | 100 | 100% | OK |
| `02-ci-cd-spec-for-chrome-extensions/06-spec-location-and-extension-shape.md` | 100 | 100% | OK |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `02-ci-cd-spec-for-chrome-extensions/02-repo-discovery.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/03-download-and-install-scripts.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/04-probing.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/05-workflow-files-and-triggers.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/06-spec-location-and-extension-shape.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/08-versioning.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/10-permissions-and-secrets.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/13-operations-and-troubleshooting.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/16-hardening-addenda.md` | 100 | 100% |
| `02-ci-cd-spec-for-chrome-extensions/audit.md` | 100 | 100% |

## All dangling links

_None detected by relative-path resolution._

## Recommended remediation pattern

1. Add or preserve `## Pitfalls` with counter-examples in every contract file.
2. Convert vague prose into MUST/SHALL rules and bind operational numbers to `reference/05-runtime-defaults.md` or `mem://` rules.
3. Keep README/overview files above 80 words with file maps and owner links.
4. Keep `node scripts/audit/check-acceptance.mjs`, `node scripts/audit/check-dangling-links.mjs`, `node scripts/audit/check-must-constants.mjs`, and `node scripts/audit/check-pitfalls.mjs` green.

## Heuristic transparency

Scores are computed by `scripts/audit/audit-scan.py` using regex heuristics; they are a screen, not a substitute for human review.
