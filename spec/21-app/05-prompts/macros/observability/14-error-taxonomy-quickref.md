# Error Taxonomy Quick Reference

Status: Normative · v1.0.0 · 2026-06-02

Single-page lookup. Authoritative source: observability/12-failure-reason-codes.md.

## Tiered codes
| Tier | Prefix | Meaning | Surfaces |
|------|--------|---------|----------|
| Fatal | `F_` | Run cannot continue | UI E-01..E-05, audit `outcome=failed` |
| Recoverable | `R_` | Step retried or skipped per policy | audit `outcome=partial` |
| Warn | `W_` | Soft budget / deprecation | log only |

## Top 15 codes
| Code | Tier | Trigger | First action |
|------|------|---------|--------------|
| F_SELECTOR_MISS | Fatal | All strategies exhausted | check SelectorAttempts[] |
| F_VAR_UNRESOLVED | Fatal | Required var = null | check VariableContext[] |
| F_JS_THREW | Fatal | JsInline threw | inspect JsLog |
| F_SCHEMA_INVALID | Fatal | Macro JSON fails json/10 | re-run schema validator |
| F_BUSY | Fatal | Runner busy on tab | wait/stop existing run |
| F_NAV_INTERRUPT | Fatal | Tab navigated | re-run after navigation settled |
| F_WATCHDOG | Fatal | Loop/time budget exceeded | guards/12 |
| F_FORBIDDEN | Fatal | Guard matrix violation | guards/10 |
| R_RETRY_OK | Recov | Selector resolved on retry | none |
| R_VAR_DEFAULT | Recov | Used default value | review variables/14 |
| R_SCORE_LOW | Recov | Score parser below threshold | tune threshold |
| W_PERF_BUDGET | Warn | Soft budget exceeded | performance/10 |
| W_DEPRECATION | Warn | Deprecated field used | governance/10 |
| W_TRUNCATED | Warn | Non-verbose truncation | enable verbose |
| W_MASKED | Warn | Sensitive value masked | expected |

## Cross-refs
- UI mapping: ui/14-error-surface-catalog.md
- Test fixtures: testing/13-fixture-catalog.md
