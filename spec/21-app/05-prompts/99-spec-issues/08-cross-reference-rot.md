# C8 — Cross-Reference Rot (`mem://` links inside spec)

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Medium
**Files affected:** 39 spec files contain `mem://` links

---

## Rule violated

`spec/01-spec-authoring-guide/08-cross-references.md` (implied): spec files are the **authoritative source**; `mem://` URIs are agent-internal and unresolvable by a blind AI reading the spec directly on disk or via GitHub web view.

## Evidence

```
$ grep -rln 'mem://' spec/21-app/05-prompts/ --include='*.md' | wc -l
39
```

Examples of broken-when-read-blind links:

- `macros/00-concept.md` → references `mem://features/prompt-macros`
- `macros/engine/04-audit-folder-writer.md` → references `mem://constraints/skipped-folders`
- `macros/READINESS-SCORE.md` → references multiple `mem://` paths in the Evidence column

## Why a blind AI fails

GitHub/IDE preview cannot resolve `mem://`. The AI either:

1. Treats the link as broken and skips the context, or
2. Hallucinates the contents.

## Fix outline

For each `mem://X/Y` link:

- If a public spec equivalent exists → replace with relative path (`../../../some-spec.md`).
- Else → footnote-style block: "Agent-only memory; canonical spec at `<path>`."
- Add to `spec/01-spec-authoring-guide/08-cross-references.md` a rule banning bare `mem://` in spec body.

## Atomic sub-tasks

~5 batches of ~8 files = 5 fix tasks.
