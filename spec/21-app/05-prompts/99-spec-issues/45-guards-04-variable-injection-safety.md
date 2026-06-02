---
name: guards-04-variable-injection-safety audit
description: Per-doc audit of guards/04-variable-injection-safety.md
type: audit
---

# Audit — guards/04-variable-injection-safety.md

**Target:** `spec/21-app/05-prompts/macros/guards/04-variable-injection-safety.md` (52 lines, largest guard)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C27 Enum missing** — talks about "placeholder syntax" without enumerating accepted forms (`${Var}`, `{{Var}}`, `<<Var>>`?). Blind AI will pick wrong.
- **C28 Test pointer missing** — no fuzz-corpus or injection-vector list (newline, backtick, fence-breakout, JSON-escape).
- **C8 Reference rot** — implies a sanitizer module but does not link the implementation file.
- **C13 Duplicate concept** — overlaps `variables/` (once written); needs `Supersedes:` direction.

## Severity
Critical. Injection guard without a vector list and canonical placeholder syntax is a security hole AND an implementation guess.

## Recommended fix order
1. Define ONE canonical placeholder syntax (recommend `${Var}` per existing examples).
2. Enumerate injection vectors + expected escape behavior.
3. Link sanitizer module + test fixture.
4. Metadata header.
