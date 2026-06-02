# Audit — .lovable/memory/index.md (Stale References)

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

### Stale references (confirmed)
| Line | Reference | Status |
|---|---|---|
| 32 (Core) | `mem://features/prompt-macros` | **MISSING** (see C66) |
| 127 (Memories) | `mem://features/prompt-macros` | **MISSING** |
| 128 (Memories) | `mem://features/prompt-variables` | **MISSING** (see C67) |
| 126 (Memories) | `mem://audits/spec-prompt-macros` | EXISTS (active) |
| 129 (Memories) | `mem://architecture/macro-prompts-folder` | EXISTS (see C68) |

### Drift signals
- Core rule line 32 makes a normative claim ("Variables resolve Step → Macro → RunContext → Default → fail-fast") whose authority pointer is broken.
- READINESS-SCORE row 3 evidence column points at spec files (`engine/05-variable-interpolator.md`, `guards/04`) that exist, but index Core rule points elsewhere — two contradictory sources of truth.

### Pattern
Every prompt-macros related memory advertised in index has at most 1/3 files present. Confidence in the index for this subsystem: **33%**.

## Severity
**Critical.** Index.md is always-in-context; broken pointers there propagate to every session.

## Fix order
1. Repair or remove the 3 broken pointers (lines 32, 127, 128).
2. Add a smoke test (`scripts/__tests__/mem-index-references-exist.test.mjs`) that fails CI if `mem://` references in index.md don't resolve.
3. Run smoke test against the rest of the index for collateral damage.
