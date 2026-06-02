# C17 — Empty / Stub Sections

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Low
**Files affected:** 1 confirmed (sweep was conservative)

---

## Evidence

```
./04-unified-ai-prompt-v4.md:## Prompt Text   ← heading followed by blank then next heading
```

A more permissive sweep (counting headings with < 3 content lines) will likely surface more — added to fix-pass.

## Why a blind AI fails

Empty sections imply the author intended content but never wrote it. The AI either invents content or treats the doc as broken.

## Fix outline

1. Audit each empty section: either fill it, delete the heading, or replace with explicit "Intentionally blank — see `<link>`."
2. Re-run the awk sweep to confirm 0 empties.

## Atomic sub-tasks

1 inventory + 1 per-section fix = 2 tasks.
