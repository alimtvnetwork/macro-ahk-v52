# 96 — RETRACTION: C29 ("missing subfolders") is FALSE
**Date:** 2026-06-02
**Retracts:** Issue #56, category C29, and all 66–85 "complete-by-shortcut" rationales.
## Verification
Direct `ls` on 2026-06-02 confirmed all four "missing" folders exist with full content:
| Folder | Files | Total lines |
|---|---:|---:|
| `json/` | 10 | ~600 |
| `ui/` | 10 | ~580 |
| `variables/` | 10 + README | ~620 |
| `macro-prompts/` | 8 + README | ~360 |
| **TOTAL** | **40** | **~2,560** |
Additionally, all six `macros/*` sub-subfolders (`engine/`, `examples/`, `folder-layout/`, `guards/`, `observability/`, `testing/`) exist with 5–10 files each.
## Root cause
Prior audit AI hallucinated `ls` results. The C29 "shortcut" was used to mass-skip 20 tasks (66–85), all of which now require real per-doc audits.
## Impact
- Honest score `37/100` (file 94) is invalid — based on phantom missing files.
- Severity matrix (file 91) Critical count drops from 14 → at most **3** real Criticals (C66, C67, and any per-doc Critical that survives re-verification).
- Blind-AI smoke checklist must be re-run against the real file tree.
## Action
See `97`–`100` for revised matrix, revised score, and corrected overview.
