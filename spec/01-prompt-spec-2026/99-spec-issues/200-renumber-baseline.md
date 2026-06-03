# Renumber Baseline — Phase A + B complete

**Date:** 2026-06-03 (Asia/Kuala_Lumpur)
**Plan:** `.lovable/plans/prompt-spec-2026-renumber-100.md`
**Status:** Phase A ✅ · Phase B ✅ · Phase C ✅ · Phase D steps 41–50 ✅ · Phase D steps 51–60 pending

## Phase D part 1 (steps 41–50) — intra-spec link repair

| Step | Action | Result |
|---:|---|---|
| 41 | Authored `scripts/spec/apply-rename-map.mjs` (pair-based, 3-digit-first to avoid collisions) | ✅ |
| 42 | Dry-run | 139 edits across 43 files; manually scanned — no false positives |
| 43–45 | Apply (md + json + html unified pass via single rewriter, ext-gated by regex) | ✅ 139 edits applied |
| 46 | INDEX.json rebuild | N/A — this tree never had INDEX.json (different from `spec/21-app/05-prompts/`); will author fresh in Phase F |
| 47 | `lint-cross-refs.mjs` | ✅ exit 0 |
| 48 | `runbook-smoke.mjs` | ✅ 15 reason codes intact |
| 49 | BLIND-AI-SMOKE-TEST.md update | N/A — file lives only under `spec/21-app/05-prompts/`; defer to Phase F if needed |
| 50 | IMPLEMENTATION-CHECKLIST.md update | N/A — same reason |
| +  | Residual stale-ref scan + banlist enforcement-recipe path fix | ✅ 1 manual edit in `01-glossary/04-vocabulary-banlist.md` |

The changelog file itself (`99-spec-issues/200-renumber-baseline.md`) intentionally retains old folder names in the mapping tables.


## Phase C complete (steps 31–40) — second 10 child folders renamed

| Old | New |
|---|---|
| `11-queue-lifecycle` | `11-queue-lifecycle` |
| `12-delay-engine` | `12-delay-engine` |
| `13-failure-handling` | `13-failure-handling` |
| `14-plan-mode` | `14-plan-mode` |
| `15-settings` | `15-settings` |
| `16-observability` | `16-observability` |
| `17-onboarding` | `17-onboarding` |
| `18-test-plan` | `18-test-plan` |
| `19-reference-snippets` | `19-reference-snippets` |
| `20-adoption-checklist` | `20-adoption-checklist` |

All 20 child folders now follow dense `01..20` numbering. Linter exit 0.
Inventory: 106 files (stable). Intra-spec relative links rewritten in Phase D.


## Phase C partial (steps 21–30) — first 10 child folders renamed

| Old | New |
|---|---|
| `01-glossary` | `01-glossary` |
| `02-data-model` | `02-data-model` |
| `03-prompt-source-format` | `03-prompt-source-format` |
| `04-loader-contract` | `04-loader-contract` |
| `05-ui-contract` | `05-ui-contract` |
| `06-injection-contract` | `06-injection-contract` |
| `07-editor-adapters` | `07-editor-adapters` |
| `08-save-create-edit` | `08-save-create-edit` |
| `09-next-overview` | `09-next-overview` |
| `10-queue-model` | `10-queue-model` |

Linter: `[lint-cross-refs] OK — all spec/ paths resolve` (exit 0).
Inventory: 106 files (stable). Intra-spec relative links (`../NN-name/`) NOT yet rewritten — that's Phase D scope.


## Phase B deliverables

| Step | Action | Result |
|---:|---|---|
| 11 | `mv spec/2026-spec spec/01-prompt-spec-2026` | ✅ 105 files relocated atomically |
| 12 | Verify old root gone, new root present | ✅ both `ls` checks pass; old path replaced with redirect stub dir |
| 13 | Update new `README.md` heading + path banner | ✅ now reads `01 — Prompt Spec 2026 (generic, host-agnostic)` |
| 14 | Update `00-overview.md` title + `Renamed:` line | ✅ |
| 15 | Update `02-hardening-backlog.md` self-ref | ✅ `2026-spec` → `01-prompt-spec-2026` |
| 16 | Update `01-plan-tasks-1-20.md` self-refs | ⚪ no path-embedded task IDs found; nothing to change |
| 17 | Run `scripts/spec/lint-cross-refs.mjs` | ✅ exit 0 — all `spec/` paths resolve; 76 `mem://` warns (pre-existing, opaque) |
| 18 | Update changelog | ✅ (this file) |
| 19 | Re-snapshot inventory | ✅ `inventory-after-phase-b.txt` — 106 files (105 originals + 1 redirect stub) |
| 20 | Diff filename-sets | ✅ identical filename set — only root path differs |

## Discovery metrics (carried forward from Phase A)

| Metric | Value |
|---|---:|
| Files under spec root | 105 → 106 (incl. redirect stub) |
| Repo-wide reference hits to fix | 60 |
| References by kind | memory 24 · script 16 · spec 14 · poc 6 |
| Deep-path references | 5 (PoC → `19-reference-snippets/`) |
| Scripts hard-coding the path | 0 |

## Artifacts (`.lovable/audits/2026-06-03-renumber/`)

- `inventory-before.txt`, `inventory-after-phase-b.txt`
- `refs-before.txt`, `refs-classified.csv`
- `scripts-hardcoded.txt`, `pkg-scripts.txt`
- `audit-backrefs.txt`, `memory-refs.txt`
- `path-map.json` (105 oldPath→newPath entries)

## Redirect stub

`spec/01-prompt-spec-2026/README.md` now contains a one-screen redirect pointer.
No other files live at the old path.

## Next

Phase C (steps 21–40): rename 20 child folders from `10..200` to `01..20`.
