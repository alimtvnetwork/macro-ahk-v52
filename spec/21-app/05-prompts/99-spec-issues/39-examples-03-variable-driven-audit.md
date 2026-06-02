---
name: examples-03-variable-driven-audit audit
description: Per-doc audit of examples/03-variable-driven-audit.md
type: audit
---

# Audit — examples/03-variable-driven-audit.md

**Target:** `spec/21-app/05-prompts/macros/examples/03-variable-driven-audit.md` (32 lines)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C15 Bare code fences:** none.
- **C8/C9 Reference rot** — points at `variables/` folder generically; no per-variable link. Once `variables/` gets numeric files, each `${var}` mention here will need an anchor.
- **C12 Orphan risk** — example introduces variable patterns (`${ScoreFloor}`, `${MaxIters}`) that are NOT enumerated in any current `variables/` doc.
- **C27 Enum ambiguity** — `audit verdict` mentioned without enumeration.
- **C28 Tests not addressed** — no fixture file path.

## Severity
High. This is the only example tying Variables to Engine; the missing variable inventory is a blind-AI blocker.

## Recommended fix order
1. Create authoritative variable inventory in `variables/01-inventory.md`.
2. Replace generic `variables/` refs with anchored links.
3. Add metadata header.
