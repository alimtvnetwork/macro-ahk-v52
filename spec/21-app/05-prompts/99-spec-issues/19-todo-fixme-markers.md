# C18 — TODO / FIXME / XXX Markers

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Low
**Files affected:** 2

---

## Evidence

```
./04-unified-ai-prompt-v4.md:236:**TODO and follow-ups**
./05-issues-tracking.md:88:#### TODO and follow-ups
```

Both occurrences are **section headers labelled "TODO and follow-ups"**, not stray inline TODOs. They are **structurally intentional** — but they DO mean the spec advertises unfinished work.

## Why a blind AI fails (mildly)

The AI treats `TODO` as an explicit invitation to defer. If those follow-ups are blockers, a blind AI may skip them entirely.

## Fix outline

For each `TODO and follow-ups` section:

1. Confirm the listed items are tracked elsewhere (issue tracker, plan doc).
2. Either resolve them and remove the section, or rename to **"Known limitations"** with explicit "status: deferred".

## Atomic sub-tasks

2 reviews = 2 fix tasks.
