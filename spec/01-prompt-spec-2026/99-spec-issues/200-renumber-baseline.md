# Renumber Baseline — Phase A + B complete

**Date:** 2026-06-03 (Asia/Kuala_Lumpur)
**Plan:** `.lovable/plans/prompt-spec-2026-renumber-100.md`
**Status:** Phase A (1–10) ✅ · Phase B (11–20) ✅ · Phase C (21–40) pending

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

`spec/2026-spec/README.md` now contains a one-screen redirect pointer.
No other files live at the old path.

## Next

Phase C (steps 21–40): rename 20 child folders from `10..200` to `01..20`.
