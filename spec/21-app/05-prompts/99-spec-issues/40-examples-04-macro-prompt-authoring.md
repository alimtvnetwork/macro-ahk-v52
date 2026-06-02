---
name: examples-04-macro-prompt-authoring audit
description: Per-doc audit of examples/04-macro-prompt-authoring.md
type: audit
---

# Audit — examples/04-macro-prompt-authoring.md

**Target:** `spec/21-app/05-prompts/macros/examples/04-macro-prompt-authoring.md` (81 lines, longest example)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C15 Bare code fences (7)** — JSON + prompt text + filesystem listings all untagged.
- **C5 Reserved-prefix risk** — example may emit numeric filenames that collide with reserved `00-` / `99-` slots; spec text does not call this out.
- **C10 Parallel doc overlap** — duplicates portions of `macro-prompts/` authoring guide; needs `Supersedes:` or `See canonical:` pointer.
- **C26 Authority overlap** — both this file and `macro-prompts/00-overview.md` claim to be "the" authoring guide.
- **C28 Tests not addressed** — no lint/validation step shown after author writes the macro.

## Severity
High. New-author entry point; conflicting guidance here multiplies downstream errors.

## Recommended fix order
1. Decide canonical authoring guide (recommend `macro-prompts/00-overview.md`).
2. Convert this file into a "walk-through" with a `Canonical:` pointer at top.
3. Add reserved-prefix warning + lint step.
4. Metadata header + fence tags.
