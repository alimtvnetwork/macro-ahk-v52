# Audit — mem://features/prompt-variables (REFERENCED BUT MISSING)

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Finding
`mem://features/prompt-variables` is **referenced from index.md line 128** but the file `.lovable/memory/features/prompt-variables.md` **DOES NOT EXIST**.

## Cross-impact
- Index entry advertises "`{{ VarName }}` syntax + shared declaration shape + 5-tier resolution waterfall" — no actual file backs the claim.
- C29 (missing `variables/` spec folder) compounds: neither the memory nor the spec defines variable syntax.
- `examples/03-variable-driven-audit.md` and `examples/04-macro-prompt-authoring.md` both lean on this contract.

## Severity
**Critical.** Variable syntax is the user-facing surface; with both the memory AND the spec folder missing, a blind AI cannot resolve a single placeholder.

## Fix order
1. Create `.lovable/memory/features/prompt-variables.md` with `{{ VarName }}` grammar + 5-tier waterfall, OR
2. Remove index reference and consolidate into `macros/00-concept.md`.
3. Either way: align with eventual fix of C29.
