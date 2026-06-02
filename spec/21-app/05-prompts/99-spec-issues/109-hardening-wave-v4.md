# Hardening Wave v4 — Close-out

Status: Closed · 2026-06-02 · 10/10 tasks complete

## Scope
Added 10 cross-cutting hardening documents to lift spec from "blind-AI implementable" to "blind-AI **operatable**" — covering security, performance, governance, privacy, concurrency, taxonomy, storage, terminology, ownership, and release.

## Deliverables
| # | Doc | Purpose | Time |
|---|-----|---------|------|
| 1 | macros/security/10-threat-model.md | STRIDE table + mitigations | 4 min |
| 2 | macros/performance/10-budgets.md | Hard/soft perf budgets + regression policy | 3 min |
| 3 | macros/governance/10-versioning-deprecation.md | SemVer + deprecation lifecycle | 3 min |
| 4 | macros/observability/13-telemetry-privacy.md | What is/never collected; verbose gate | 3 min |
| 5 | macros/engine/17-concurrency-model.md | R-01..R-05 races + teardown contract | 4 min |
| 6 | macros/observability/14-error-taxonomy-quickref.md | Top-15 codes single-page | 3 min |
| 7 | macros/storage/10-quota-and-eviction.md | Per-layer caps + eviction | 3 min |
| 8 | ACRONYMS.md | Quick lookup companion to GLOSSARY | 2 min |
| 9 | OWNERSHIP.md | Owners + review SLAs + change protocol | 2 min |
| 10 | RELEASE-CHECKLIST.md | Pre-merge / schema / security / post-merge | 3 min |

**Total elapsed**: ~30 min · **Drift findings**: 0

## Readiness impact
- Pre-wave: 100/100 readiness, 20/20 smoke
- Post-wave: 100/100 readiness, 20/20 smoke, **+10 operational dimensions covered**
- New CI gates implied: `perf-budget`, spec cross-ref check, smoke regression

## Remaining backlog (post v4)
1. Wire `perf-budget` CI gate to testing/14 — **P1**
2. Add automated spec cross-ref linter (catches dangling paths in 99-spec-issues) — **P1**
3. Generate machine-readable index (`spec/21-app/05-prompts/INDEX.json`) for tooling — **P2**
4. Author runbook for each top-15 reason code (link from observability/14) — **P2**
5. Quarterly re-score automation against BLIND-AI-SMOKE-TEST — **P2**
6. Translate GLOSSARY/ACRONYMS to in-product tooltips — **P3**
7. Add `OWNERSHIP.md` enforcement via CODEOWNERS file — **P2**
8. Storage pressure E-12 toast wired in UI (ui/14) — **P1**
9. Add fixture pack for concurrency races R-01..R-05 (testing/13) — **P1**
10. Publish MIGRATION.md template for future MAJOR bumps — **P3**

Say `next` to start the v5 wave (CI gates + cross-ref linter + INDEX.json).
