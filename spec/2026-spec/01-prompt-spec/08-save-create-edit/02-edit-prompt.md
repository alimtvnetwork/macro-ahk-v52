# 02 — Edit Prompt

**Date:** 2026-06-02
**Task:** T57

## Editable fields

`title`, `category`, `body`, `tags`. **Slug is immutable** after creation — renaming would break references in queues, history, and shared imports.

To "rename" a prompt, the user must duplicate then delete the old one (explicit, audited).

## Default-prompt overrides

Defaults shipped with the host are read-only. Editing a default produces a **user override**:

1. Clone the default into the user namespace under the same slug.
2. Stamp `overrides: <defaultVersion>` into `info.json`.
3. Future loads merge: user override wins, default kept for reset.

A **Reset to default** action removes the override and restores the original.

## Concurrency

The store is single-writer per browser session. If two tabs edit the same slug:

- Each save carries `ifMatchVersion` (monotonic integer per slug).
- Mismatch → `PromptError { reason: "VersionConflict", currentVersion }`.
- Caller decides: show diff, force-overwrite, or discard.

No automatic retry, no exponential backoff (Core memory: No-Retry Policy).

## Events

`PromptStoreEvent { kind: "updated", slug, fields: string[] }` after a successful save.

## Acceptance

- [ ] The implementation satisfies the `02 — Edit Prompt` contract in this file and the folder-level acceptance target: prompt create, edit, delete, duplicate, import, and archive flows are reversible and observable.
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

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Data storage layers](mem://architecture/data-storage-layers) for the authoritative rule backing the MUST/SHALL statements in this file.
