# Hardening Wave v7 — Close-out

Status: Closed · 2026-06-02 · 10/10 tasks complete

## Scope
Glue layer + drift gates. Closes the loop so the documentation, fixtures,
and CI gates from v4..v6 cannot silently drift out of sync.

## Deliverables
| # | Artifact | Purpose | Time |
|---|----------|---------|------|
| 1 | scripts/spec/runbook-smoke.mjs | Every top-15 reason code must have runbook section | 3 min |
| 2 | scripts/spec/tooltip-dict-gate.mjs | spec-tooltips.json must equal latest rebuild | 3 min |
| 3 | spec-gates.yml +2 jobs | runbook-smoke, tooltip-dict-gate wired into CI | 2 min |
| 4 | 99-spec-issues/README.md | Issue tracker navigation map (file ranges + conventions) | 3 min |
| 5 | mem://workflow/spec-hardening-waves | Cross-wave summary memory | 4 min |
| 6 | SPEC-GATES-BADGE.md | README badge integration snippet | 2 min |
| 7 | macros/CHANGELOG.md | Added v2.1.0–v2.4.0 entries (waves v4..v7) | 4 min |
| 8 | macros/testing/16-race-fixture-executor.md | Driver spec for fixture pack | 4 min |
| 9 | Regression check — all 6 gates green | perf-budget, xref-lint, index-drift, smoke-rescore, runbook-smoke, tooltip-dict-gate | 1 min |
| 10 | This close-out | v7 summary + backlog | 2 min |

**Total elapsed**: ~28 min · **Drift findings**: 0 · **CI gates now active**: 6

## Conformance to memory rules
- ✅ No-retry policy: all new scripts are single-shot
- ✅ Code Red logging: runbook-smoke prints exact missing section + file path
- ✅ readme.txt prohibitions: badge snippet explicitly excludes readme.txt
- ✅ Read-only folders: skipped/ and .release/ untouched
- ✅ Test-with-features: race-fixture-executor spec lists vitest harness path
- ✅ Untouched extension src/: pure spec + CI work this wave

## Cumulative state v1..v7
- 100/100 readiness · 20/20 BLIND-AI smoke · 0 Criticals · 0 drift findings
- **6 enforcing CI gates** + 1 quarterly cron
- 248+ files indexed · 38 tooltip terms · 5 race fixtures live
- Full chain: OWNERSHIP → CODEOWNERS → CONTRIBUTING → RELEASE-CHECKLIST → spec-gates → quarterly review

## Remaining backlog (post v7)
1. Implement E-12 toast component in extension src/ (frontend impl)
2. Implement `<TermTooltip>` walker component
3. Implement MACRO_PERF_DUMP handler in background SW
4. Implement `scripts/spec/run-race-fixture.mjs` driver per 16-race-fixture-executor.md
5. Author MIGRATION-v2-to-v3.md (deferred until v3 planned)
6. Wire governance-report.md artifact into Options "Spec health" panel
7. Add vitest harness `race-fixtures` job to spec-gates
8. CHANGELOG release note in root CHANGELOG.md (currently only macros/CHANGELOG)
9. Bot to auto-open issue when smoke-rescore drops below 20/20
10. Quarterly memory-store snapshot diff (detect stale mem:// refs)

Say `next` for v8 (extension-side frontend impl + race driver).
