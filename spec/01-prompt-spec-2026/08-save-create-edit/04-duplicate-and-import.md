# 04 — Duplicate, Import, Export

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T59

## Duplicate

`PromptStore.duplicate(slug)`:

1. Load source prompt (default or user).
2. Generate new slug: `${slug}-copy`, then `-copy-2`, `-copy-3` on collision.
3. Title becomes `"<original title> (copy)"`.
4. `archivedAt` cleared, `version` reset to 1.
5. Always created in the **user namespace** even if source was a default.

## Import (single prompt)

Accepts a `prompt.md` + `info.json` pair, or a `.json` blob matching the prompt schema.

Pipeline:

1. Schema validate.
2. Slug collision → user is asked: **Skip / Overwrite / Rename**.
3. Persist; emit `{ kind: "imported", slug }`.

## Import (bundle .zip)

Per `30-prompt-source-format/05-import-export-zip.md`:

- Read manifest, iterate entries.
- Apply collision policy chosen once for the whole bundle (default: **Rename**).
- Atomic: all-or-nothing; on any schema failure the whole import aborts before any write.

## Export

- **Single:** download `{slug}.json` (info + body inline).
- **Selection or all:** download `prompts-<YYYYMMDD-HHmm>.zip` matching the bundle format.
- Exports never include `archivedAt`-set prompts unless the user explicitly opts in.
