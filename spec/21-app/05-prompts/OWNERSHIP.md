# Spec Ownership

Status: Normative · v1.0.0 · 2026-06-02

This spec subsystem (`spec/21-app/05-prompts/**`) is co-owned by:

| Area | Primary | Backup | Review SLA |
|------|---------|--------|------------|
| macros/engine/** | Macro runtime team | Platform | 2 business days |
| macros/json/** (schemas) | Macro runtime team | QA | 1 day (breaking) |
| macros/guards/** | Security | Macro runtime | 1 day |
| macros/observability/** | Platform | QA | 2 days |
| macros/testing/** | QA | Macro runtime | 2 days |
| variables/** | Macro runtime team | Security (for sensitive/13) | 2 days |
| ui/** | Frontend | UX | 2 days |
| 99-spec-issues/** | Whoever opened | — | best effort |

## Change protocol
1. PR touching any normative doc requires sign-off from Primary.
2. Schema (json/**) or grammar (variables/10) changes require Primary + Backup.
3. Security/Guards changes always require Security sign-off.

## Drift detection
- CI runs `audit-error-swallow` + spec cross-ref check (per 99-spec-issues/106).
- Quarterly readiness re-score against BLIND-AI-SMOKE-TEST.md.
