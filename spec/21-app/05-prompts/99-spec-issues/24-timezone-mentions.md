# C23 — Timezone Mention Consistency

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** None — but volume is high enough to extract
**Files affected:** 55 files mention timezone-related strings

---

## Evidence

```
$ grep -rln 'Asia/Kuala_Lumpur\|UTC\|GMT\|MYT' --include='*.md' spec/21-app/05-prompts | wc -l
55
```

Spot-check shows the overwhelming majority use `Asia/Kuala_Lumpur` (per core memory rule). The volume — **55 files** — suggests boilerplate that could be **factored into one canonical section** and `→ see` from each doc.

## Why this matters

If the project ever changes timezone policy, 55 files need editing. Single source-of-truth would make that a 1-file change.

## Fix outline

1. Create `spec/21-app/05-prompts/conventions.md` (or amend existing root overview) with a single "Timezone" section.
2. Replace the 55 in-file mentions with a 1-line reference: `> Timestamps in **Asia/Kuala_Lumpur** — see [conventions](…).`

## Atomic sub-tasks

1 conventions doc + 5 batch sweeps of ~11 files = 6 fix tasks.

## Sub-issue C23a — Inconsistent spelling

Sample shows `Asia/Kuala_Lumpur` (per memory) is used; need to confirm none use `Asia/Kuala Lumpur` or `KL`. Defer to fix-pass full grep.
