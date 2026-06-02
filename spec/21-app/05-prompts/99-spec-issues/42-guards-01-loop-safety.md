---
name: guards-01-loop-safety audit
description: Per-doc audit of guards/01-loop-safety.md
type: audit
---

# Audit — guards/01-loop-safety.md

**Target:** `spec/21-app/05-prompts/macros/guards/01-loop-safety.md` (27 lines)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C8 Reference rot** — refers to "No-Retry policy" without `mem://constraints/no-retry-policy` link.
- **C7 Magic numbers** — mentions "three layers" but does not enumerate concrete thresholds (max iterations, time budget, sentinel cap). A blind AI cannot derive defaults.
- **C13 Duplicate concept** — overlaps `engine/01-state-machine.md` halt conditions without `Supersedes:`.
- **C28 No test pointer.**

## Severity
Critical. Loop safety without enumerated thresholds is unimplementable.

## Recommended fix order
1. Enumerate the three layers with exact integer thresholds.
2. Link No-Retry policy memory.
3. Add metadata + test pointer.
