# C1 — Missing Mandatory Metadata Header

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Critical
**Files affected:** 95 / 95 (100 %)

---

## Rule violated

`spec/01-spec-authoring-guide/02-naming-conventions.md` § "Metadata Header":

> Every `.md` file MUST begin with a standardized metadata header:
> ```
> # Title of the Document
>
> **Version:** X.Y.Z  
> **Updated:** YYYY-MM-DD
>
> ---
> ```

## Evidence

```bash
$ grep -rL '^\*\*Version:\*\*' --include='*.md' spec/21-app/05-prompts/ | wc -l
95
$ find spec/21-app/05-prompts -name '*.md' | wc -l
95
```

Zero compliant files. Every file currently uses ad-hoc lead-ins like
`**Created:**`, `**Source:**`, `**Status:**`, `**Date:**`, or no header at all
(e.g. `macros/engine/00-architecture.md` jumps straight from `# Engine Architecture` to `## Modules`).

## Why a blind AI fails

The onboarding prompt (`spec/01-spec-authoring-guide/04-ai-onboarding-prompt.md`) instructs the AI to **parse the metadata header first** to determine doc Version, freshness, and supersession. With no header, the AI cannot:

- Know which doc is canonical when two concepts collide.
- Detect stale specs.
- Build the spec-graph the linter expects.

## Fix outline (do NOT execute yet)

A future task per file:

1. Insert the canonical 4-line header right after the H1.
2. Set `Version: 0.1.0` for first-write files, `1.0.0` for the engine canonicals.
3. Use `Updated: 2026-06-02` (Asia/Kuala_Lumpur date).
4. Preserve any existing `Status:` / `Source:` lines as optional metadata fields per § "Optional Metadata Fields".

## Atomic sub-tasks (estimated)

~10 batches of ~10 files each → tasks 11–20 in the plan.
