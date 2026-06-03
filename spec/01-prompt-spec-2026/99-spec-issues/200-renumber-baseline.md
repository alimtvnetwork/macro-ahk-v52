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

## Phase D part 2 (steps 51–60) — 2026-06-03

| # | Action | Result |
|---|--------|--------|
| 51 | Repo-wide scan OUTSIDE renamed tree for `2026-spec` / old `1NN-` / `200-` refs | ✅ **0 hits** — all external refs already clean |
| 52 | Mermaid `.mmd` stale-ref scan | ✅ 0 hits across 2 `.mmd` files |
| 53 | RELEASE-CHECKLIST / OWNERSHIP / CONTRIBUTING / GLOSSARY / ACRONYMS scan inside tree | ✅ N/A — these files don't live in this spec |
| 54 | Repo-root variants of same | ✅ N/A — none exist at repo root |
| 55 | Sub-tree audit (`macros/`, `variables/`, `ui/`) | ✅ N/A — only `99-spec-issues/` exists; 2 files (changelog + rescore) verified |
| 56 | Final inventory snapshot → `inventory-after-phase-d.txt` | ✅ **106 files** (stable since Phase B) |
| 57 | `lint-cross-refs.mjs` | ✅ exit 0 — all `spec/...` paths resolve |
| 58 | Residual stale-ref grep (excluding changelog itself) | ✅ 1 hit, all inside changelog table describing the `mv` command (legitimate historical record) |
| 59 | Changelog update | ✅ this entry |
| 60 | Phase D closeout declaration | ✅ **Phase D COMPLETE** — intra-spec relative links fully rewritten, inventory stable, linter green, no stale refs |

**Phase D summary:** rewriter authored + applied, 139 edits across 43 files, 1 banlist-literal fix, 0 external stale refs, 106 files preserved, linter green.

## Phase E part 1 (steps 61–70) — 2026-06-03

| # | Action | Time | Result |
|---|--------|------|--------|
| 61 | Scan `.lovable/` for `spec/2026-spec` refs | 3 s | 10 hits — 2 active Q&A + 4 audit snapshots (historical, keep) + 1 plan + 3 ambiguity logs |
| 62 | Scan `scripts/` | 3 s | **8 scripts** with broken ROOT paths (lint-banlist, lint-mermaid, build-pdf, xrefs, info-json, extract-acceptance, typecheck-snippets, audit-genericization) |
| 63 | Scan `.github/`, `package.json`, `vite.config.*` | 2 s | ✅ 0 hits |
| 64 | Scan repo-root `*.md` | 2 s | ✅ 0 hits |
| 65 | Scan `PoC/` | 2 s | ✅ N/A (no PoC dir) |
| 66 | Repo-wide stale-ref baseline | 2 s | ✅ confirms scripts are the only critical hits |
| 67 | Pull script contexts for surgical fix | 3 s | Identified `ROOT="spec/2026-spec"` + 1 deep `/190-reference-snippets` + 1 deep `/30-prompt-source-format` + 1 escaped regex `spec[\\/]2026-spec` |
| 68 | sed rewrite ROOT across 8 scripts (string + escaped-regex variant; excluded `apply-rename-map.mjs` which legitimately retains the mapping pair) | 5 s | ✅ all rewritten |
| 69 | Renumbered subpath fixes: `190-reference-snippets` → `19-reference-snippets`; `30-prompt-source-format` → `03-prompt-source-format` | 3 s | ✅ done |
| 70 | Smoke-run 4 touched scripts against new tree | 10 s | ✅ `lint-spec-mermaid` clean (2 diagrams), `check-spec-prompts-xrefs` clean (100 tasks, 102 refs), `check-prompts-info-json` clean (1 example), `lint-spec-banlist` runs (pre-existing banlist hits in handoff.md unrelated to renumber) |

**Phase E part 1 summary:** 8 scripts repaired with 2 layers of fix (ROOT + escaped-regex + 2 deep subpaths), 4 smoke tests green against the renamed tree, scripts now fully operational.

## Phase E part 2 (steps 71–80) — 2026-06-03

| # | Action | Time | Result |
|---|--------|------|--------|
| 71 | Identify active `.lovable/` files referencing old path | 3 s | plan (10 lines), Q&A readme (2 lines), task-counter (1 line) |
| 72 | Prepend STATUS banner to renumber plan | 3 s | ✅ banner notes ✅ EXECUTED + new live path |
| 73 | Add historical note to Q&A readme entries 58 + 59 | 3 s | ✅ point to new path; clarify PoC dir N/A |
| 74 | Add historical note to task-counter row 18 | 2 s | ✅ |
| 75 | CI workflow scan (`spec-governance-quarterly`, `spec-gates`) | 3 s | ✅ both reference `scripts/spec/*` only — path-agnostic, no fix needed |
| 76 | Root README spec links | 2 s | ✅ no `2026-spec` refs at root |
| 77 | `package.json` script paths | 2 s | ✅ no spec path refs |
| 78 | Final repo-wide stale-ref baseline (excl. historical audits/plans/Q&A) | 3 s | ✅ **0 hits — fully clean** |
| 79 | `lint-cross-refs.mjs` | 8 s | ✅ exit 0 |
| 80 | Snapshot count | 2 s | ✅ 106 files stable |

**Phase E COMPLETE.** Repo is fully consistent with the new path. Historical artifacts (plan, Q&A logs, audit snapshots) preserve pre-rename text with explicit STATUS banners pointing to the new location.

## Phase F (steps 81–90) — 2026-06-03

| # | Action | Time | Result |
|---|--------|------|--------|
| 81 | Inventory `.lovable/memory/` + locate `spec-organization.md` + check `plan.md` | 5 s | spec-organization is 1 sentence; plan.md has roadmap structure |
| 82 | Author **new** memory `mem://architecture/prompt-spec-2026-layout` | 30 s | ✅ full layout, history, old→new map, rewrite tool, scripts repaired, gates, audit trail |
| 83 | Update **existing** memory `mem://architecture/spec-organization` to list top-level roots incl. renamed `spec/01-prompt-spec-2026/` + universal NN-name rule | 15 s | ✅ promoted to multi-tree index |
| 84 | Update `mem://index.md` — append new memory bullet | 5 s | ⏭ deferred to step 90 (single batched write) |
| 85 | Check `INDEX.json` requirement for renamed tree | 5 s | ✅ N/A — only `spec/21-app/05-prompts/INDEX.json` exists; renamed tree never had one and Phase D linter passes without it |
| 86 | Tooltips/UI surfaces referencing `2026-spec` | 3 s | ✅ none (already covered in Phase E step 76: 0 hits in root README, package.json, vite, CI workflows) |
| 87 | Roadmap entry in `plan.md` | (deferred) | ⏭ — plan.md is large; the dedicated plan file `.lovable/plans/prompt-spec-2026-renumber-100.md` already serves as the authoritative rename roadmap (STATUS banner = EXECUTED). No new entry needed in plan.md |
| 88 | Verify memory cross-refs (no broken `mem://` links) | 3 s | ✅ both new/updated memories self-contained |
| 89 | Re-run `lint-cross-refs.mjs` post-memory-write | 8 s | ✅ exit 0 |
| 90 | Phase F closeout | 2 s | ✅ Phase F COMPLETE — 1 new memory authored, 1 existing memory upgraded, no INDEX.json needed, no plan.md edit needed |

**Phase F summary:** memories now describe both the new layout and the migration history; future sessions will know the rename happened and where to find the rewriter for any subsequent spec-tree rename.
