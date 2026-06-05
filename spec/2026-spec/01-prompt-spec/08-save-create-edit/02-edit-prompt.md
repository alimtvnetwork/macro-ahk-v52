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
