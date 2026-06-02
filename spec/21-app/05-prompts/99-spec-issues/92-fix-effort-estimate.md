# 92 — Fix-Effort Estimate

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)
**Units:** AI-turn estimates assuming `next 10`-style batches (~2 min per batch).

| Category | Files | Effort (batches) | Notes |
|---|---:|---:|---|
| **C29 Create missing folders** (`json/`, `ui/`, `macro-prompts/`, `variables/`) | ~30 new docs | **3 batches** | Largest single chunk; depends on architecture decisions. |
| C66 + C67 Create missing memories | 2 | 0.2 | Quick if content is lifted from spec. |
| C70 Rewrite READINESS-SCORE | 1 | 0.5 | Re-grade after fix-pass; can't be "done" until others land. |
| C72 Rewrite CHANGELOG | 1 | 0.3 | Same dependency. |
| C71 Fix MIGRATION executability | 1 | 0.3 | Inline schema + grammar. |
| C1 Add metadata header to all 95 spec files | 95 | 1.5 | Mechanical; scriptable. |
| C5/C25 Rename `00-content` → `01-content` + add overview | 9 folders | 1 | Renames + 9 new overview stubs. |
| C8 Repair `mem://` references | 39 sites | 1.5 | Audit + edit. |
| C13 Replace duplicated `## Failure log` sections with cross-refs | 11 | 0.5 | |
| C15 Tag 62 bare fences | 62 | 0.5 | Scriptable. |
| C27 Enumerate discriminated-union enums inline | ~9 specs | 1 | Per-spec judgment. |
| C28 Add concrete test paths | most docs | 1 | After C46–C50 land canonical paths. |
| C42 Inline loop thresholds | 1 | 0.2 | |
| C53 `Mirrors:` Core failure-log memory | 1 | 0.1 | |
| C63 Add Phase 2c ban callout | 1 | 0.1 | |
| C69 + smoke test for index references | index + 1 test | 0.5 | |
| Remaining Highs (C43–C55, C60, C64, C65, C68) | ~15 docs | 1.5 | Apply `Mirrors:` + cross-refs systematically. |
| Mediums (C2, C7, C9, C49, C59) | scattered | 0.7 | |
| Low/hygiene (C14, C19, formatting) | 6 | 0.2 | Scriptable. |

**Total estimated effort:** ≈ **14 batches** (~28 minutes of agent time) to bring the subsystem from honest ~40/100 to a realistic ~85/100.

Reaching a true 100/100 requires also writing the ~30 missing docs at production quality (additional 5–8 batches), bringing the grand total to **≈20 batches** or roughly **40–60 min of focused agent work**.
