# Step 90 — Strictly-avoid + coding-guidelines + what-to-read trio

**Timestamp:** 2026-06-02
**Files:** `.lovable/strictly-avoid.md`, `.lovable/coding-guidelines.md`, `.lovable/what-to-read.md`, `.lovable/overview.md`, `.lovable/prompt.md`

## Reasoning
This is the entry funnel for any new agent session. Quality here is leverage.

## Findings
- ✅ All four files exist.
- 🔴 **High** (recurring from S5): `.lovable/coding-guidelines.md` covers only ~20% of `spec/17-consolidated-guidelines/` per Batch 1.
- 🟡 **Med**: no cross-link from `overview.md` → `what-to-read.md` → `prompt.md`. Blind LLM may read in random order.
- 🟢 **Low**: `prompt.md` and `prompts.md` (and `prompts/` dir) coexist — singular vs. plural ambiguity.

## Recommendation
Promote `.lovable/what-to-read.md` to be referenced from `mem://index.md` Core (already noted S89).

---

## Batch 9 summary (steps 81–90)
- 🔴 **High** S81 (3+ plan locations — SOT ambiguity), S88 (no enforcement of read-only `skipped/` + `.release/`), S90 (coding-guidelines covers ~20% — repeat of S5).
- 🟡 **Med** S82 (suggestions multi-location), S83 (duplicate prefixes + missing README.md), S85 (no readiness-report enforcement), S86 (no README structure check), S89 (index missing what-to-read pointer).
- 🟢 **Low** S84, S87 (SP-1..SP-7 well-defended).
- ✅ **Strong**: S87 (readme.txt prohibitions — 3 mirrors + test).
