# C22 — Date Format Consistency

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** None (clean) — baseline recorded
**Files affected:** 0

---

## Evidence

```
$ grep -rho '20[0-9][0-9][-/][0-9][0-9][-/][0-9][0-9]' --include='*.md' spec/21-app/05-prompts | sort -u
2026-03-21
2026-05-25
2026-06-02
```

All 3 unique dates use ISO `YYYY-MM-DD` with hyphens. **No `MM/DD/YYYY`, no `DD-MM-YYYY`, no spelled-out months**.

## Implication

Compliant with `spec/01-spec-authoring-guide/02-naming-conventions.md` § Metadata Header. No fix required.

## Atomic sub-tasks

None.
