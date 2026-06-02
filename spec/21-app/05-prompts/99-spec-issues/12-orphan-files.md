# C12 — Orphan Files (Not Linked from Any Overview)

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Medium
**Estimated orphans:** high — because 9 of the folders lack `00-overview.md` entirely (see C3)

---

## Rule violated

`spec/01-spec-authoring-guide/03-required-files.md` (implied): every content file must be referenced from its folder's `00-overview.md`. Today, since most overviews don't exist, **every file in those 9 folders is orphan-by-default**.

## Evidence

- Folders with overviews: `json/`, `variables/`, `macros/folder-layout/` → 3 overviews exist.
- Combined link count from existing overviews: small (few dozen `[…](…)` refs).
- Total content files: 95.

Conservative estimate: **70+ orphan files**.

## Why a blind AI fails

The onboarding prompt builds its reading list from `00-overview.md` references. Orphan files are simply never read.

## Fix outline

After C3 creates the 9 missing overviews, each must enumerate every sibling content file. Then a re-scan should show **zero orphans**.

## Atomic sub-tasks

Resolved as a side-effect of C3 fix tasks. 1 verification task: `grep -L` after fix.
