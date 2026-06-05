# Final Score — Blind-AI Audit of `spec/2026-spec/`

**Date:** 2026-06-05
**Method:** see `00-method.md`. Heuristic scoring across 229 markdown files.

## Composite

| Metric | Value |
| --- | --- |
| Files audited | 229 |
| Repo composite score | **65.7 / 100** |
| Files ≥ 90 (pass bar) | 8 |
| Files < 60 (red) | 67 |
| Pass-rate | 3.5% |

## Per-folder

| Folder | Files | Mean | <60 | ≥90 |
| --- | --- | --- | --- | --- |
| `01-prompt-spec` | 131 | 61.3 | 55 | 0 |
| `02-ci-cd-spec-for-chrome-extensions` | 20 | 61.0 | 9 | 0 |
| `03-chrome-ext-features` | 35 | **81.5** | 0 | 7 |
| `03-db-and-sqlite-integration-with-chrome-extension` | 42 | 69.4 | 2 | 1 |
| top-level `README.md` | 1 | 39.0 | 1 | 0 |

## Top-5 blockers (repo-wide)

1. **Missing pitfalls/counter-examples** — 174 files still lack explicit edge-case coverage.
2. **Vague prose** — 158 files still need more MUST/SHALL rules or bound numeric defaults.
3. **Low-scoring prompt-spec tail** — 55 `01-prompt-spec` files remain below 60 despite acceptance backfill.
4. **CI/CD spec hardening** — 9 CI/CD files remain below 60 and need concrete failure examples.
5. **Pass-bar gap** — only 8 files are ≥90; next uplift must target determinism and pitfalls, not acceptance.

## Fix-to-100 path (rough ETA, 1 dev)

| Wave | Steps (from `30-remediation-backlog.md`) | ETA |
| --- | --- | --- |
| P0 pitfalls + determinism | 1–5 | 1.5 days |
| P1 dangling + thin + schema | 6–15 | 2 days |
| P2 cross-folder consistency | 16–25 | 1 day |
| P3 machine-check + CI gates | 26–30 | 0.5 day |
| **Total** | **30** | **~5 days** |

Expected composite score after all 30: **≥ 92** (extrapolated; rerun `scripts/audit/audit-scan.py` to confirm).

## Self-audit note

`01-prompt-spec` carries the most files; even a +15pt uplift there moves the composite materially. Delay determinism and failure-handling pitfalls were improved; acceptance, dangling-link, numeric-constant, and scorer tests are green.
