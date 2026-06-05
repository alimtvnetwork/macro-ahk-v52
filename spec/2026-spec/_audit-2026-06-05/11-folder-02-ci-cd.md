# Folder Audit — `02-ci-cd-spec-for-chrome-extensions`

| Metric | Value |
| --- | --- |
| Files audited | 20 |
| Mean score | 51.3 / 100 |
| Implementable % (weighted by file) | 51.3% |
| Failure % | 48.7% |
| Files below pass bar (<60) | 15 |
| Files at/above target (>=90) | 0 |
| Dangling relative-link refs | 5 |
| Files lacking acceptance criteria | 11 |
| Files lacking pitfalls/edge cases | 20 |
| Files under 80 words (thin) | 1 |

## Bottom 15 files (most blind-AI risk)

| Path | Score | Impl% | Top Blocker |
| --- | --- | --- | --- |
| `02-ci-cd-spec-for-chrome-extensions/17-final-auditor-score.md` | 24 | 24% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases; too thin (<80 words) |
| `02-ci-cd-spec-for-chrome-extensions/11-no-committed-zips.md` | 30 | 30% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/12-readme-and-install-instructions.md` | 30 | 30% | no acceptance criteria; vague (no MUST/numerics); 1 dangling link(s); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/14-glossary.md` | 30 | 30% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/04-probing.md` | 35 | 35% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/02-repo-discovery.md` | 36 | 36% | no acceptance criteria; vague (no MUST/numerics); 3 dangling link(s); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/07-enumeration-build-and-packaging.md` | 40 | 40% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/08-versioning.md` | 45 | 45% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/06-spec-location-and-extension-shape.md` | 48 | 48% | no acceptance criteria; vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/15-acceptance-criteria.md` | 50 | 50% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/03-download-and-install-scripts.md` | 55 | 55% | no acceptance criteria; no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/05-workflow-files-and-triggers.md` | 55 | 55% | no acceptance criteria; no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/10-permissions-and-secrets.md` | 55 | 55% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/01-forty-planning-steps.md` | 57 | 57% | vague (no MUST/numerics); no pitfalls/edge cases |
| `02-ci-cd-spec-for-chrome-extensions/README.md` | 57 | 57% | vague (no MUST/numerics); no pitfalls/edge cases |

## Top 10 files (model exemplars)

| Path | Score | Impl% |
| --- | --- | --- |
| `02-ci-cd-spec-for-chrome-extensions/13-operations-and-troubleshooting.md` | 85 | 85% |
| `02-ci-cd-spec-for-chrome-extensions/audit.md` | 82 | 82% |
| `02-ci-cd-spec-for-chrome-extensions/16-hardening-addenda.md` | 77 | 77% |
| `02-ci-cd-spec-for-chrome-extensions/09-release-artifacts.md` | 75 | 75% |
| `02-ci-cd-spec-for-chrome-extensions/99-consistency-report.md` | 60 | 60% |
| `02-ci-cd-spec-for-chrome-extensions/01-forty-planning-steps.md` | 57 | 57% |
| `02-ci-cd-spec-for-chrome-extensions/README.md` | 57 | 57% |
| `02-ci-cd-spec-for-chrome-extensions/03-download-and-install-scripts.md` | 55 | 55% |
| `02-ci-cd-spec-for-chrome-extensions/05-workflow-files-and-triggers.md` | 55 | 55% |
| `02-ci-cd-spec-for-chrome-extensions/10-permissions-and-secrets.md` | 55 | 55% |

## All dangling links

- `02-ci-cd-spec-for-chrome-extensions/02-repo-discovery.md` → `[^/]+`, `[^/]+`, `[^/]+`
- `02-ci-cd-spec-for-chrome-extensions/12-readme-and-install-instructions.md` → `./assets/hero.png`
- `02-ci-cd-spec-for-chrome-extensions/audit.md` → `[^/]+`

## Recommended remediation pattern

1. Add an explicit `## Acceptance` section to every file lacking one (use `- [ ]` machine-checkable bullets).
2. Convert every numeric constant ("5 seconds", "100 items") to a bolded MUST clause with a source-of-truth link to `reference/05-runtime-defaults.md` or equivalent.
3. Add `## Pitfalls` (≥2 counter-examples) to every file below 60.
4. Fix dangling relative links (list above) — broken refs make blind-AI fail-fast.
5. Promote thin files (<80 words) to inline summary + at least one example.

## Heuristic transparency

Scores are computed by `/tmp/audit_scan.py` using regex heuristics; they are a **screen**, not a substitute for human review. They correlate strongly with blind-AI implementability but can over-penalize index/README files and over-reward verbose prose.
