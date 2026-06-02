# 99-spec-issues — Index

Status: Reference · v1.0.0 · 2026-06-02

Chronological navigation aid for the issue tracker. Issues never disappear;
they are added (and may be retracted via paired files).

## File ranges

| Range | Purpose |
|-------|---------|
| 00 | Overview + status |
| 01..40 | Original v1 audit findings (C1..C40) |
| 41..65 | Provisional Medium-severity v1 findings |
| 66..89 | C66..C89 confirmed/refuted detail files |
| 90..95 | v1 master list + severity matrix + close-out |
| 96..99 | v1 RETRACTIONs + confirmed-true entries |
| 100..103 | v2 revised matrix + RCA + action plan |
| 104..108 | v3 50-step upgrade + scorecard + polish |
| 109 | Hardening wave v4 — operational docs |
| 110 | Hardening wave v5 — CI gates |
| 111 | Hardening wave v6 — fixtures + tooltips + governance |
| 112 | Hardening wave v7 — runbook smoke + drift gates + glue |

## Conventions
- One file = one finding / one wave close-out.
- Retraction filename pattern: `9X-RETRACTION-<id>-<slug>.md`.
- Confirmed-true pattern: `9X-CONFIRMED-<ids>-<slug>.md`.
- Wave close-outs are even numbers (109, 110, 111, 112).

## Reading order for newcomers
1. `00-overview.md` — current state
2. `105-final-100-scorecard.md` — last full readiness
3. Latest wave close-out (highest numbered `1XX-hardening-wave-vN.md`)
4. CI gate scripts under `scripts/spec/`
