# Step 7 — `spec/17-consolidated-guidelines` single source of truth

**Time:** ~2 min · **Severity:** Med

- **Sources:** `spec/17-consolidated-guidelines/00-overview.md` (52 lines), `99-consistency-report.md` (36 lines).
- **Blind-AI likely output:** Folder name implies "the" canonical guideline file. A low-grade LLM would treat it as authoritative and skip the longer `spec/02-coding-guidelines/consolidated-review-guide.md` (723 lines).
- **Actual:** 17- is a thin pointer (52 lines); the real content lives in 02-. Naming is misleading.
- **Gap:** Two competing "consolidated" docs. `17-` is short; `02-coding-guidelines/consolidated-review-guide.md` is the deep one. Blind AI gets partial rules.
- **Recommendation:** Either expand 17- to actually consolidate, or rename to `17-guideline-quickref/` and add a banner pointing to the 02- master file.
