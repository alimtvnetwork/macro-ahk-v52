# Folder Audit — `02-ci-cd-spec-for-chrome-extensions`

| Metric | Value |
| --- | --- |
| Files audited | 20 |
| Mean score | 61.0 / 100 |
| Implementable % (weighted by file) | 61.0% |
| Failure % | 39.0% |
| Files below pass bar (<60) | 9 |
| Files at/above target (>=90) | 0 |
| Dangling relative-link refs | 0 |
| Files lacking acceptance criteria | 0 |
| Files lacking pitfalls/edge cases | 20 |
| Files under 80 words (thin) | 0 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `02-ci-cd-spec-for-chrome-extensions/14-glossary.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/15-acceptance-criteria.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/17-final-auditor-score.md` | 45 | 45% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/11-no-committed-zips.md` | 48 | 48% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/01-forty-planning-steps.md` | 52 | 52% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/07-enumeration-build-and-packaging.md` | 55 | 55% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/12-readme-and-install-instructions.md` | 55 | 55% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/99-consistency-report.md` | 55 | 55% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/README.md` | 57 | 57% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/08-versioning.md` | 60 | 60% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/02-repo-discovery.md` | 63 | 63% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/06-spec-location-and-extension-shape.md` | 63 | 63% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/10-permissions-and-secrets.md` | 63 | 63% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/04-probing.md` | 65 | 65% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/03-download-and-install-scripts.md` | 70 | 70% | no pitfalls/edge cases |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `02-ci-cd-spec-for-chrome-extensions/13-operations-and-troubleshooting.md` | 80 | 80% |
| `02-ci-cd-spec-for-chrome-extensions/audit.md` | 80 | 80% |
| `02-ci-cd-spec-for-chrome-extensions/09-release-artifacts.md` | 75 | 75% |
| `02-ci-cd-spec-for-chrome-extensions/16-hardening-addenda.md` | 75 | 75% |
| `02-ci-cd-spec-for-chrome-extensions/03-download-and-install-scripts.md` | 70 | 70% |
| `02-ci-cd-spec-for-chrome-extensions/05-workflow-files-and-triggers.md` | 70 | 70% |
| `02-ci-cd-spec-for-chrome-extensions/04-probing.md` | 65 | 65% |
| `02-ci-cd-spec-for-chrome-extensions/02-repo-discovery.md` | 63 | 63% |
| `02-ci-cd-spec-for-chrome-extensions/06-spec-location-and-extension-shape.md` | 63 | 63% |
| `02-ci-cd-spec-for-chrome-extensions/10-permissions-and-secrets.md` | 63 | 63% |

## All dangling links

_None detected by relative-path resolution._

## Recommended remediation pattern

1. Add `## Pitfalls` with at least two counter-examples to files still lacking edge-case coverage.
2. Convert vague prose into MUST/SHALL rules and bind operational numbers to `reference/05-runtime-defaults.md` or `mem://` rules.
3. Promote thin files (<80 words) to inline summary plus at least one example.
4. Keep `node scripts/audit/check-acceptance.mjs`, `node scripts/audit/check-dangling-links.mjs`, and `node scripts/audit/check-must-constants.mjs` green.

## Heuristic transparency

Scores are computed by `scripts/audit/audit-scan.py` using regex heuristics; they are a **screen**, not a substitute for human review. They correlate strongly with blind-AI implementability but can over-penalize index/README files and over-reward verbose prose.
