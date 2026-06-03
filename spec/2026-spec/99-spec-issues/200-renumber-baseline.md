# Renumber Baseline — Phase A complete

**Date:** 2026-06-03 (Asia/Kuala_Lumpur)
**Plan:** `.lovable/plans/prompt-spec-2026-renumber-100.md`
**Status:** Phase A (steps 1–10) ✅ complete · Phase B not started

## Discovery metrics

| Metric | Value | Source |
|---|---:|---|
| Files under `spec/2026-spec/` | **105** | `inventory-before.txt` |
| Repo-wide reference hits | **60** | `refs-before.txt` |
| References by kind | memory 24 · script 16 · spec 14 · poc 6 | `refs-classified.csv` |
| References by ext | md 42 · mjs 16 · html 2 | `refs-classified.csv` |
| Deep-path references | **5** (need anchored rewrite) | `refs-classified.csv` |
| Hard-coded paths in `scripts/spec/*.mjs` | **0** | `scripts-hardcoded.txt` |
| `package.json` scripts mentioning path | **0** | `pkg-scripts.txt` |
| PoC refs (`poc/2026-spec/**`) | **6** lines across 2 files | `poc/2026-spec/{README.md,index.html}` |
| Audit back-refs | **3** files | `audit-backrefs.txt` |
| Memory / Q&A refs | **4** files | `memory-refs.txt` |
| Path-map entries | **105** | `path-map.json` |

## Key findings

1. **No script or `package.json` entry hard-codes `spec/2026-spec/`** — Phase E shrinks substantially (steps 73–80 become no-ops; verify-only).
2. The only "deep" references (5 total) target `190-reference-snippets/` from the PoC; trivial to rewrite.
3. CI workflows (`spec-gates.yml`, `spec-governance-quarterly.yml`) operate on `spec/21-app/05-prompts/` — **not touched** by this rename.
4. Audit back-refs (`spec/audit/blind-ai-implementation-audit/**`) cite the old root in historical narrative; will get a single-line addendum rather than rewrites (preserve audit lineage).
5. PoC folder `poc/2026-spec/` itself is **deferred** (step 70).

## Artifacts (under `.lovable/audits/2026-06-03-renumber/`)

- `inventory-before.txt`
- `refs-before.txt`
- `refs-classified.csv`
- `scripts-hardcoded.txt`
- `pkg-scripts.txt`
- `audit-backrefs.txt`
- `memory-refs.txt`
- `path-map.json`

## Next

Phase B (steps 11–20): atomic root rename `spec/2026-spec` → `spec/01-prompt-spec-2026`, leave redirect stub, rerun linter.
