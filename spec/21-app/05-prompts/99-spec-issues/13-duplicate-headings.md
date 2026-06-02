# C13 — Duplicate `## Headings` Across Sibling Files

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Low (signal of unfactored content)
**Top offender count:** 11

---

## Evidence

```
$ grep -rh '^## ' --include='*.md' spec/21-app/05-prompts | sort | uniq -c | sort -rn | head
11 ## Failure log
 8 ## Tests
 8 ## Test coverage (`mem://preferences/test-with-features`)
 7 ## Prompt Text
 5 ## Why a blind AI fails
 5 ## Trigger
 5 ## Test coverage
 5 ## Rule violated
```

`## Failure log` appearing 11 times is a smell that the failure-log schema should be **extracted** into a single canonical doc (`macros/observability/02-failure-log-schema.md` already exists — siblings should link to it, not repeat).

Also `## Test coverage` appears in two flavours (with and without the `mem://` suffix), one of which violates C8 (mem-link inside spec).

## Why a blind AI fails

Repeated heading = repeated definition = silent drift over time.

## Fix outline

For each repeated heading with > 3 occurrences:

1. Identify canonical doc.
2. Replace duplicates with a 1-line summary + link.
3. Standardise the `## Test coverage` heading (drop the `mem://` parenthetical).

## Atomic sub-tasks

3 dedup passes (Failure log, Tests, Test coverage) = 3 tasks.
