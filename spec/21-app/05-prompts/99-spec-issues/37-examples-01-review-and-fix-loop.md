---
name: examples-01-review-and-fix-loop audit
description: Per-doc audit of examples/01-review-and-fix-loop.md
type: audit
---

# Audit — examples/01-review-and-fix-loop.md

**Target:** `spec/21-app/05-prompts/macros/examples/01-review-and-fix-loop.md` (60 lines)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C15 Bare code fences (8)** — highest fence-count in `examples/`; mixes JSON, pseudo-DSL, and log output without language tags.
- **C27 Discriminated union ambiguity** — references iteration verdicts (`PASS`, `RETRY`, `ABORT`) but does not enumerate the full set or cite the engine doc that owns it.
- **C13 Duplicate heading** — `## Failure log` repeats the engine-folder pattern; should `See: engine/06-message-contract.md` instead of redefining.
- **C28 Tests not addressed** — `TargetScore=95` is asserted; no test reference shows how the score is computed.

## Severity
Medium-High. This is the canonical loop example; ambiguity here propagates to every macro author.

## Recommended fix order
1. Metadata header.
2. Language-tag fences.
3. Replace inline `## Failure log` with a cross-ref.
4. Add `See verdict enum: engine/01-state-machine.md#verdicts`.
