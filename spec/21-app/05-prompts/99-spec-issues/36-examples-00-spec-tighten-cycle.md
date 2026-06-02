---
name: examples-00-spec-tighten-cycle audit
description: Per-doc audit of examples/00-spec-tighten-cycle.md
type: audit
---

# Audit — examples/00-spec-tighten-cycle.md

**Target:** `spec/21-app/05-prompts/macros/examples/00-spec-tighten-cycle.md` (70 lines)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header** — no `**Version:**` / `**Updated:**` / `**Owner:**` block.
- **C15 Bare code fences (4)** — every fenced block lacks a language hint (`json`, `text`, `bash`).
- **C26 Authority overlap** — references `standalone-scripts/macros/001-spec-tighten-cycle.macro.json` as source of truth; spec must declare whether spec or JSON wins on conflict (`Supersedes:` field absent).
- **C28 Tests not addressed** — example shows happy-path only; no failure-mode walkthrough (what RunId looks like when score plateaus, when guard trips).
- **C6 No acceptance criteria** — folder lacks `97-acceptance-criteria.md` so "this example is correct" is undefined.

## Severity
Medium. Authoring example is illustrative, not normative, but blind AIs will treat it as ground truth.

## Recommended fix order
1. Add metadata header.
2. Tag fences (`json` / `text`).
3. Add `Supersedes:` pointer to JSON macro.
4. Add 1 failure-mode subsection.
