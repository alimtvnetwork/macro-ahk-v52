# C14 — Trailing Whitespace / Tabs

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Low (hygiene)
**Files affected:** 6

---

## Evidence

```
$ grep -rln ' $' --include='*.md' spec/21-app/05-prompts | wc -l
6
```

(Full list deferred to the fix-pass scan; the count is what matters here.)

## Why it matters

- Markdown linters fail on trailing whitespace.
- Diffs become noisy when other edits land.
- Some renderers interpret two trailing spaces as a `<br>`, accidentally changing layout.

## Fix outline

`sed -i 's/[[:space:]]\+$//' <file>` per file, then verify with the grep above returns 0.

## Atomic sub-tasks

1 batch task covering all 6 files = 1 fix task.
