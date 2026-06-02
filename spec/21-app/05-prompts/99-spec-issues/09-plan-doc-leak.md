# C9 — Spec Files Link Into `.lovable/plans/` as Authoritative

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Medium
**Files affected:** 5

---

## Rule violated

The spec tree must be **self-contained**. `.lovable/` is agent scratch space and is not shipped with the spec deliverable. Linking out to `.lovable/plans/prompt-macros-50-step.md` as the "source of truth" means a blind AI reading only `spec/` cannot resolve the reference.

## Evidence

```
$ grep -rln '\.lovable/plans' spec/21-app/05-prompts/ --include='*.md'
spec/21-app/05-prompts/macros/README.md
spec/21-app/05-prompts/macros/00-concept.md
spec/21-app/05-prompts/macros/READINESS-SCORE.md
spec/21-app/05-prompts/99-spec-issues/00-overview.md       ← intentional, this audit
spec/21-app/05-prompts/99-spec-issues/06-…                 ← intentional, this audit
```

The 3 non-audit files leak. Worst offender: `00-concept.md` calls the plan doc "Source: Verbatim mirror of Part A of `.lovable/plans/...`" — making the plan canonical and the spec a copy.

## Why a blind AI fails

If the plan ever changes, the spec drifts silently. A blind AI sees the "verbatim mirror" claim and assumes equivalence even when false.

## Fix outline

1. Invert: the spec becomes canonical; the plan becomes a reference to the spec.
2. Strip `.lovable/plans/…` mentions from non-audit spec files; replace with the relevant spec path.

## Atomic sub-tasks

3 file edits + 1 sweep verification = 4 tasks.
