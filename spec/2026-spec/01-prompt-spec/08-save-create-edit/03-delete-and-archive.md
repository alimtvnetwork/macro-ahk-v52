# 03 — Delete & Archive

**Date:** 2026-06-02
**Task:** T58

## Soft delete (archive)

Default action is **archive**, not hard delete:

- Sets `archivedAt: <ISO timestamp>` on the prompt record.
- Archived prompts are hidden from the dropdown but remain queryable via `PromptStore.listArchived()`.
- Queue items already referencing the prompt continue to resolve (loader treats archived prompts as still loadable for in-flight jobs).

## Hard delete

Available only from the **Manage Prompts** settings panel, behind an explicit confirm:

> "Permanently delete `<title>`? This cannot be undone. Queue items referencing this prompt will fail with `PromptMissing`."

Hard delete is forbidden for default prompts; user can only **reset** a default override (see edit doc).

## Cascade

- Pending queue items referencing the deleted slug are marked `Failed { reason: "PromptMissing" }` lazily at execution time (no eager rewrite).
- History entries are preserved verbatim (already snapshot the rendered body).

## Events

- `{ kind: "archived", slug }` and `{ kind: "deleted", slug }`.
- Cache invalidation as usual.
