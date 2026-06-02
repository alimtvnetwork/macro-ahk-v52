---
name: Spec hardening waves
description: Summary of v4..v7 hardening waves on spec/21-app/05-prompts/** — what each wave added and where to find it
type: feature
---

# Spec hardening waves (v4..v7)

After the v3 50-step upgrade reached 100/100 readiness + 20/20 smoke,
four hardening waves added operability + enforcement scaffolding.

| Wave | Theme | Key artifacts | Close-out |
|------|-------|---------------|-----------|
| v4 | Operational docs | security/10, performance/10, governance/10, observability/13-14, engine/17, storage/10, ACRONYMS, OWNERSHIP, RELEASE-CHECKLIST | 99-spec-issues/109 |
| v5 | CI enforcement | spec-gates.yml (4 jobs) + scripts/spec/{check-perf-budget,lint-cross-refs,build-index,smoke-rescore}.mjs + CODEOWNERS + race fixture pack spec + MIGRATION template | 99-spec-issues/110 |
| v6 | Real artifacts | E-12 toast spec, tooltip pipeline + dict (38 terms), 5 race fixture JSONs, MACRO_PERF_DUMP contract, quarterly governance cron + report, CONTRIBUTING.md | 99-spec-issues/111 |
| v7 | Glue + drift gates | runbook-smoke, tooltip-dict-gate, issue-tracker README, this memory, spec-gates badge, fixed 2 broken refs | 99-spec-issues/112 |

## CI gates (cumulative)
- `spec-gates.yml`: perf-budget, xref-lint, index-drift, smoke-rescore, runbook-smoke, tooltip-dict-gate
- `spec-governance-quarterly.yml`: cron review, artifact upload, no notifications

## Invariants enforced
- 100/100 readiness · 20/20 blind-AI smoke
- 0 broken `spec/` paths · all top-15 reason codes have runbooks
- INDEX.json + tooltip dict committed and current per push

## Where to look first
- `spec/21-app/05-prompts/README.md` — subsystem entry
- `spec/21-app/05-prompts/CONTRIBUTING.md` — author guide
- `spec/21-app/05-prompts/99-spec-issues/README.md` — issue tracker map
