# Spec Issues — Prompt-Macros Subsystem Audit

**Version:** 1.0.0 (audit COMPLETE)
**Updated:** 2026-06-02 (Asia/Kuala_Lumpur)
**Auditor:** Lovable agent (self-audit of own last spec)
**Scope:** every file under `spec/21-app/05-prompts/` (95 markdown files)
**Reference:** `spec/01-spec-authoring-guide/`

---

## Headline finding

> Self-issued "Readiness 100/100" in `macros/READINESS-SCORE.md` is **invalid**. Honest score: **37 / 100** (see `94-revised-readiness-score.md`). A blind AI handed this folder today fails **7 of 7** representative tasks at the spec layer (see `93-blind-ai-failure-modes.md`).

---

## Final tallies

- **Files audited:** 95 spec docs + 4 top-level (`README`, `CHANGELOG`, `MIGRATION`, `READINESS-SCORE`) + 3 memory references.
- **Per-doc audit files written:** 72 (`01-…md` through `72-…md`).
- **Consolidation files:** 5 (`90-master-issue-list.md`, `91-severity-matrix.md`, `92-fix-effort-estimate.md`, `93-blind-ai-failure-modes.md`, `94-revised-readiness-score.md`).
- **Distinct issue categories:** **33** (C1–C29 + C66–C72).

## Severity counts

| Severity | Count |
|---|---:|
| **CRITICAL** | 14 |
| High | 17 |
| Medium | 8 |
| Low/clean | 8 |

## Top 5 critical defects (must fix first)

1. **C29** — Planned subfolders `json/`, `ui/`, `macro-prompts/`, `variables/` DO NOT EXIST (~30 missing docs).
2. **C70** — READINESS-SCORE 100/100 is falsified; honest ≈37.
3. **C66 + C67** — 2 of 3 advertised `mem://features/prompt-*` files are missing.
4. **C72** — CHANGELOG cites thresholds + test counts that don't appear in any spec doc.
5. **C62 + C63** — De-facto canonical failure-mode and storage-contract docs don't cite their Core-memory anchors.

## Fix-effort summary
- ~14 agent batches → realistic 85/100 (see `92-fix-effort-estimate.md`).
- ~20 batches → genuine 100/100 (includes writing the 30 missing docs at production quality).

---

## Index of issue files

- `01`–`25` Structural sweep (metadata, naming, overviews, reserved prefixes, hygiene)
- `26` Engine folder batch audit (10 docs)
- `36`–`40` `examples/` per-doc
- `41`–`45` `guards/` per-doc
- `46`–`50` `testing/` per-doc
- `51`–`55` `observability/` per-doc
- `56` **C29 missing subfolders** (subsumes 66–85 from plan)
- `57`–`64` Top-level concept docs (`00-concept` … `07-permissions-and-scope`)
- `65` `folder-layout/` batch audit
- `66`–`69` Memory cross-checks (`mem://features/prompt-macros`, `prompt-variables`, `macro-prompts-folder`, `index.md`)
- `70`–`72` Top-level docs (`READINESS-SCORE`, `MIGRATION`, `CHANGELOG`)
- `90`–`94` Consolidation

---

## What is NOT in scope of this audit
- Content correctness of macros engine itself.
- Code under `src/`.
- Other spec folders (`02-features/`, `03-…`).

## Next step
Audit is **closed**. To proceed, request a **fix-pass plan** (separate document, ~14 batches). Per Core memory, the user must approve the fix scope before any spec file outside `99-spec-issues/` is modified.
