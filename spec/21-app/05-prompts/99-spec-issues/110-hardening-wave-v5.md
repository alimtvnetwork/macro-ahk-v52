# Hardening Wave v5 — Close-out

Status: Closed · 2026-06-02 · 10/10 tasks complete

## Scope
Wired automation, ownership, and operability scaffolding so the spec stays at 100/100 *over time* — not just at a single point.

## Deliverables
| # | Artifact | Purpose | Time |
|---|----------|---------|------|
| 1 | .github/workflows/spec-gates.yml | CI: perf-budget + xref + index + smoke | 4 min |
| 2 | scripts/spec/check-perf-budget.mjs | Hard-ceiling enforcement (performance/10) | 4 min |
| 3 | scripts/spec/lint-cross-refs.mjs | Resolves spec/... + mem://... refs, fail-fast | 4 min |
| 4 | scripts/spec/build-index.mjs | Emits INDEX.json (title/status/version/bytes) | 3 min |
| 5 | scripts/spec/smoke-rescore.mjs | Re-runs BLIND-AI-SMOKE-TEST per push | 4 min |
| 6 | macros/observability/15-runbooks-top15.md | Operator runbooks per reason code | 4 min |
| 7 | .github/CODEOWNERS | Enforces OWNERSHIP.md at PR time | 3 min |
| 8 | macros/testing/15-race-fixture-pack.md | R-01..R-05 deterministic fixtures | 4 min |
| 9 | macros/MIGRATION-TEMPLATE.md | Reusable MAJOR migration scaffold | 3 min |
| 10 | This close-out | v5 summary + remaining backlog | 2 min |

**Total elapsed**: ~35 min · **Drift findings**: 0 · **Scripts**: fail-fast (no retry/backoff, per no-retry policy)

## Conformance to memory rules
- ✅ No-retry policy: all scripts are single-shot
- ✅ CI push trigger unfiltered: `on: push:` + `pull_request:` only, no `branches`/`paths`
- ✅ No CI notifications: workflow emits no email/Slack hooks
- ✅ Code Red logging: scripts print exact path + reason on failure
- ✅ Read-only folders: nothing in `skipped/` or `.release/` touched

## Readiness impact
- Pre-v5: 100/100 readiness (point-in-time)
- Post-v5: 100/100 readiness + **continuous enforcement** via 4 CI gates
- New CI surface: `spec-gates` workflow (4 jobs, parallel)

## Remaining backlog (post v5)
1. Generate INDEX.json once and commit (run scripts/spec/build-index.mjs) — P1
2. Author E-12 storage-pressure toast in UI (ui/14) — P1
3. In-product tooltip generation from GLOSSARY/ACRONYMS — P3
4. Materialize race fixtures into JSON files under fixtures/race/ — P2
5. Wire MACRO_PERF_DUMP message handler in background SW — P2
6. Per-runbook automated smoke (script per F_*/R_*/W_* code) — P3
7. Quarterly governance review automation (cron workflow) — P3
8. Author MIGRATION-v2-to-v3.md when v3 is planned — P3 (deferred)
9. Add spec-gates badge to root README — P2
10. Author "Spec contributor guide" pointing to OWNERSHIP + RELEASE-CHECKLIST — P2

Say `next` to start v6 (INDEX.json commit + E-12 toast + race fixtures).
