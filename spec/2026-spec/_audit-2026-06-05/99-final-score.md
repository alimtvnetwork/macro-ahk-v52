# Final Score — Blind-AI Audit of `spec/2026-spec/`

**Date:** 2026-06-05
**Method:** see `00-method.md`. Heuristic scoring across 228 markdown files.

## Composite

| Metric | Value |
| --- | --- |
| Files audited | 228 |
| Repo composite score | **50.1 / 100** |
| Files ≥ 90 (pass bar) | 8 |
| Files < 60 (red) | 161 |
| Pass-rate | 3.5% |

## Per-folder

| Folder | Files | Mean | <60 | ≥90 |
| --- | --- | --- | --- | --- |
| `01-prompt-spec` | 131 | 38.3 | 121 | 0 |
| `02-ci-cd-spec-for-chrome-extensions` | 20 | 51.3 | 15 | 0 |
| `03-chrome-ext-features` | 35 | **81.2** | 0 | 7 |
| `03-db-and-sqlite-integration-with-chrome-extension` | 42 | 60.3 | 25 | 1 |

## Top-5 blockers (repo-wide)

1. **No `## Acceptance` block** — present in ~20% of files; absent acceptance = blind-AI cannot self-check.
2. **Numeric constants in prose** — timeouts/caps/budgets restated per file, no SOT link.
3. **Missing pitfalls/counter-examples** — only `03-chrome-ext-features` does this consistently.
4. **Dangling relative links** — enumerated per folder report.
5. **Thin index files** — README/00-overview files often <80 words.

## Fix-to-100 path (rough ETA, 1 dev)

| Wave | Steps (from `30-remediation-backlog.md`) | ETA |
| --- | --- | --- |
| P0 acceptance + determinism | 1–5 | 1.5 days |
| P1 dangling + thin + schema | 6–15 | 2 days |
| P2 cross-folder consistency | 16–25 | 1 day |
| P3 machine-check + CI gates | 26–30 | 0.5 day |
| **Total** | **30** | **~5 days** |

Expected composite score after all 30: **≥ 92** (extrapolated; rerun `/tmp/audit_scan.py` to confirm).

## Self-audit note

`01-prompt-spec` carries the most files; even a +30pt uplift there moves the composite by ~17pt alone. Prioritise P0 steps 1–3 first.
