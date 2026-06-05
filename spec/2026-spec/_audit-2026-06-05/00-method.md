# Method — Blind-AI Implementability Audit

## Inventory snapshot

Total Markdown files under `spec/2026-spec/`: **229**

- `.`: 1 file(s)
- `01-prompt-spec`: 131 file(s)
- `02-ci-cd-spec-for-chrome-extensions`: 20 file(s)
- `03-chrome-ext-features`: 35 file(s)
- `03-db-and-sqlite-integration-with-chrome-extension`: 42 file(s)

## Blind-AI protocol

Each file is reviewed as if the implementer can see only that file plus explicitly linked local specs. The review asks five questions:

1. Are identifiers, actors, statuses, events, paths, and constants defined locally or through resolvable links?
2. Are schemas, types, payload shapes, and storage contracts present or linked to versioned sources?
3. Are acceptance criteria machine-checkable with tests, scripts, lint gates, or deterministic manual checks?
4. Are cross-references resolvable inside `spec/2026-spec/` or a named canonical spec folder?
5. Are pitfalls, counter-examples, edge cases, and failure modes described enough to prevent silent breakage?

## Rubric

| Dimension | Weight | Full-credit standard |
|---|---:|---|
| Clarity | 25 | A blind AI can state the required behavior without guessing. |
| Determinism | 25 | The spec gives exact rules, order, constants, and conflict resolution. |
| Acceptance | 20 | The spec gives verifiable checks and pass/fail criteria. |
| Cross-refs | 15 | Dependencies and canonical sources are linked and resolvable. |
| Pitfalls | 15 | Known failure modes and edge cases are explicit. |

Pass bar: **90/100**.

## Score mapping

- **90–100:** Blind-AI ready.
- **75–89:** Mostly implementable; needs targeted gap closure.
- **60–74:** Risky; likely partial implementation or silent drift.
- **0–59:** Not safe for blind-AI implementation without human clarification.

## Implementable and failure percentages

- **Implementable %** estimates how much can be shipped without escalation.
- **Failure %** estimates how much is likely to fail, drift, or require human interpretation.
- `Implementable % + Failure %` should equal 100 for every file row.

## Guidelines applied

- `.lovable/coding-guidelines.md` exists and was reviewed.
- `spec/coding-guidelines/` is missing, so it was skipped silently per instruction.
- This pass is documentation/audit work, not SEO.
