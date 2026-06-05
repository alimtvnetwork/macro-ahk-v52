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

## Acceptance

- [ ] The implementation satisfies the `03 — Delete & Archive` contract in this file and the folder-level acceptance target: prompt create, edit, delete, duplicate, import, and archive flows are reversible and observable.
- [ ] Verification passes when `UT-crud-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

