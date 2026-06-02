---
name: guards-02-no-supabase audit
description: Per-doc audit of guards/02-no-supabase.md
type: audit
---

# Audit — guards/02-no-supabase.md

**Target:** `spec/21-app/05-prompts/macros/guards/02-no-supabase.md` (34 lines)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C10 Parallel doc** — restates Core memory `mem://constraints/no-supabase`; risk of drift if memory updates and this file does not.
- **C8 Reference rot** — should `Supersedes: mem://constraints/no-supabase` or `Mirrors:` annotation so future edits sync.
- **C28 Tests not addressed** — guard lists banned tokens but does not name the lint rule / CI check that enforces them.

## Severity
High. Drift risk is the main hazard; content itself is correct today.

## Recommended fix order
1. Add `Mirrors: mem://constraints/no-supabase` header with sync-check rule.
2. Link CI lint rule file.
3. Metadata header.
