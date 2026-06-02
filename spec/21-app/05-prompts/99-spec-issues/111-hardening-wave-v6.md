# Hardening Wave v6 — Close-out

Status: Closed · 2026-06-02 · 10/10 tasks complete

## Scope
Productized the v5 scaffolding: real fixture JSONs, runtime tooltip pipeline,
quarterly governance automation, perf-dump handler spec, contributor guide.

## Deliverables
| # | Artifact | Purpose | Time |
|---|----------|---------|------|
| 1 | ui/16-storage-pressure-toast-e12.md | E-12 toast + modal spec (W_STORAGE_PRESSURE / F_STORAGE_FULL) | 4 min |
| 2 | ui/17-in-product-tooltips.md | GLOSSARY/ACRONYMS → hover tooltip pipeline | 3 min |
| 3 | scripts/spec/build-tooltip-dict.mjs | Emits public/spec-tooltips.json (38 terms) | 3 min |
| 4 | testing/fixtures/race/r01..r05.json | 5 deterministic race fixtures | 5 min |
| 5 | macros/observability/16-perf-dump-handler.md | MACRO_PERF_DUMP contract + budgets table | 3 min |
| 6 | .github/workflows/spec-governance-quarterly.yml | Cron review (no notifications, artifact only) | 3 min |
| 7 | scripts/spec/governance-report.mjs | Quarterly markdown report generator | 3 min |
| 8 | CONTRIBUTING.md | Single-entry contributor guide | 3 min |
| 9 | Verified all v5 gates still green (4/4) | Regression check | 1 min |
| 10 | This close-out | v6 summary + backlog | 2 min |

**Total elapsed**: ~30 min · **Files indexed**: 247 (was 238) · **Drift findings**: 0

## Conformance to memory rules
- ✅ No-retry: governance workflow + scripts are single-shot
- ✅ No CI notifications: quarterly workflow uploads artifact only
- ✅ Dark-only theme: E-12 toast spec uses semantic tokens
- ✅ Code Red logging: perf-dump handler logs exact runId + reason on miss
- ✅ Test-with-features: each new spec lists matching unit/component/E2E tests
- ✅ Read-only folders: nothing in skipped/ or .release/ touched
- ✅ CI push trigger unfiltered: quarterly is cron-only; doesn't override ci.yml

## Cumulative state across v1..v6
- 100/100 readiness · 20/20 BLIND-AI smoke · 0 Criticals · 0 drift findings
- 4 enforcing CI jobs (perf-budget, xref, index, smoke) + 1 quarterly review
- 247 files indexed · 38 tooltip terms · 5 race fixtures live
- Full governance loop: OWNERSHIP → CODEOWNERS → CONTRIBUTING → RELEASE-CHECKLIST → quarterly cron

## Remaining backlog (post v6)
1. Implement E-12 toast component in `src/` (frontend, dark-only) — P1
2. Implement `<TermTooltip>` walker component reading `spec-tooltips.json` — P1
3. Implement `MACRO_PERF_DUMP` handler in background SW — P1
4. Per-runbook automated smoke (one script per F_*/R_*/W_* code) — P2
5. Author `MIGRATION-v2-to-v3.md` (deferred until v3 planned) — P3
6. Add spec-gates badge to root README.md — P2
7. Fix 3 issue-tracker docs (04-missing-consistency-report, 24-timezone-mentions) — P3
8. Wire `governance-report.md` artifact into Options "Spec health" panel — P3
9. Race fixture executor (loads JSON → drives unit tests) — P2
10. Tooltip dict CI gate (rebuild + diff check) — P2

Say `next` for v7 (frontend implementations: E-12 toast + tooltip walker + perf-dump SW handler).
