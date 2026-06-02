# C24 — Version-Bump Policy Missing + Changelog Coverage Gap

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** High
**Files affected:** 95 (no doc declares semver intent) + `macros/CHANGELOG.md` is 24 lines for a 95-file subsystem

---

## Sub-issue C24a — No version-bump policy

The spec guide mandates `**Version:** X.Y.Z` per file (see C1). It does **not** define WHEN to bump major / minor / patch. Without that policy:

- Every fix-pass risks bumping wrong.
- Diff readers can't tell if a change is breaking.

### Fix outline

Add `spec/21-app/05-prompts/CONVENTIONS.md` § "Versioning":

- **Patch (Z)** — typo, formatting, link fix.
- **Minor (Y)** — additive section, new acceptance criterion.
- **Major (X)** — semantics change, deletion, rule reversal.

## Sub-issue C24b — Changelog coverage gap

```
$ wc -l spec/21-app/05-prompts/macros/CHANGELOG.md
24 lines
```

24 lines covers exactly **one** release (`[1.0.0] — 2026-06-02`). For a subsystem that just landed **95 files**, the changelog should at minimum enumerate the major doc groups (engine, examples, guards, observability, testing, json, ui, macro-prompts, variables) with one-line summaries each.

### Fix outline

Expand the existing `[1.0.0]` entry from "Added: <bullets>" into a per-folder breakdown. No new version needed.

## Atomic sub-tasks

1 conventions doc + 1 changelog expansion = 2 fix tasks.
