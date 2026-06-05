# Final Score — Blind-AI Audit of `spec/2026-spec/`

**Date:** 2026-06-05
**Method:** see `00-method.md`. Heuristic scoring across 229 markdown files.

## Composite

| Metric | Value |
| --- | --- |
| Files audited | 229 |
| Repo composite score | **90.22 / 100** |
| Files ≥ 90 (pass bar) | 169 |
| Files < 60 (red) | 0 |
| Pass-rate | 73.8% |

## Per-folder

| Folder | Files | Mean | <60 | ≥90 |
| --- | --- | --- | --- | --- |
| `01-prompt-spec` | 131 | 90.2 | 0 | 96 |
| `02-ci-cd-spec-for-chrome-extensions` | 20 | 89.5 | 0 | 14 |
| `03-chrome-ext-features` | 35 | 89.7 | 0 | 21 |
| `03-db-and-sqlite-integration-with-chrome-extension` | 42 | **91.1** | 0 | 37 |
| top-level `README.md` | 1 | 90.0 | 0 | 1 |

## Top-5 remaining blockers (repo-wide)

1. **`03-chrome-ext-features/audit/` subfolder** — 14 audit files still on the generic ext footer; needs per-topic counter-examples.
2. **`02-ci-cd-spec` last-mile** — 6 files between 80–89 still on generic CI footer; topic-aware uplift will clear 90.
3. **`01-prompt-spec` 35 stragglers (60–89)** — folders without a topic preset (08, 09, 10, 11, 15, 17, 18, 19, 20, 99, reference, ui-reference) still on generic footer.
4. **CI snapshot artefact** — wire `scores.json` upload to `.github/workflows/spec-audit.yml` for regression tracking.
5. **Top-level `README.md`** — currently 90; push to 95+ with deterministic links to all four sub-folders.

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
