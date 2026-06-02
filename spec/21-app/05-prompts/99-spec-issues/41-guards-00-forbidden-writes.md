---
name: guards-00-forbidden-writes audit
description: Per-doc audit of guards/00-forbidden-writes.md
type: audit
---

# Audit — guards/00-forbidden-writes.md

**Target:** `spec/21-app/05-prompts/macros/guards/00-forbidden-writes.md` (36 lines)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C5 Reserved-prefix conflict** — uses slot `00-` but is NOT an overview; mirrors the `engine/00-architecture.md` violation (C25).
- **C3 No `00-overview.md`** in `guards/` folder.
- **C8 Reference rot** — cites "deny-list" but does not link to where the list is defined (constant file? memory? spec?).
- **C28 Tests not addressed** — guard implies enforcement; no test fixture or path-traversal vector list.

## Severity
Critical (security guard). A blind AI cannot implement this without the deny-list source.

## Recommended fix order
1. Rename to `01-forbidden-writes.md`; create proper `00-overview.md` for `guards/`.
2. Inline or link the authoritative deny-list.
3. Enumerate path-traversal attack vectors (`..`, symlink, absolute, UNC).
4. Add metadata + test pointer.
