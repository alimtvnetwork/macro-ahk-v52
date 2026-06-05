# 99 — CONFIRMED: C66 + C67 — Two memory files genuinely missing
**Confirmed:** 2026-06-02
## Verified missing
Direct `ls` confirms these two paths do **not** exist:
- `.lovable/memory/features/prompt-macros.md` — referenced by `index.md` Core
- `.lovable/memory/features/prompt-variables.md` — referenced by `index.md` Core
## Adjacent files that DO exist (not substitutes)
- `.lovable/memory/features/prompt-management.md` (different scope — IndexedDB caching)
- `.lovable/memory/architecture/prompt-pipeline.md` (architecture, not features)
- `.lovable/memory/architecture/macro-prompts-folder.md` (folder layout only)
## Impact (Critical retained)
`mem://index.md` Core rule pointers are broken — a blind AI following the index will hit two dead links for prompt-macros and prompt-variables concepts.
## Fix (out of scope for audit, but proposed)
Create the two memory files synthesized from:
- `prompt-macros.md` ← `spec/21-app/05-prompts/macros/00-concept.md` + `engine/00-architecture.md`
- `prompt-variables.md` ← `spec/21-app/05-prompts/variables/00-overview.md`+`01-syntax.md`+`07-sensitive-masking.md`
Effort: 1 batch.
