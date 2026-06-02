# C20 — Image Asset Rot

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** None (clean)
**Files affected:** 0

---

## Evidence

```
$ grep -rln '!\[' --include='*.md' spec/21-app/05-prompts | wc -l
0
```

No `![…](…)` image references anywhere in the prompts spec tree.

## Implication

Either:

- A. The spec is intentionally text-only (consistent with the spec guide's ASCII-diagram rule), OR
- B. Diagrams that should be images are being expressed as ASCII / markdown tables.

Both are acceptable. Baseline recorded for future regressions.

## Atomic sub-tasks

None.
