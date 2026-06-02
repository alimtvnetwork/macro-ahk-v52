# Step 58 — Dynamic script loading (`RiseupAsiaMacroExt.require`)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://architecture/dynamic-script-loading` (audited via SQLite)

## Reasoning
A low-grade LLM trying to add a new builtin must hit one path: `.require()`. If multiple loader entry points exist, ambiguity → drift.

## Findings
- ✅ `dependency-resolver.ts` + `script-resolver.ts` form a coherent loader pair.
- 🟡 **Med**: no `require()` usage audit test; no doc enumerating "allowed loader entry points".
- 🟢 **Low**: SQLite audit table exists but not exposed via Options UI for visibility.

## Recommendation
Add a smoke test that asserts each builtin script is reachable through `.require()` exactly once.
