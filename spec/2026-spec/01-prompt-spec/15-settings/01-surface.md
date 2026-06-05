# 01 — Settings Surface

**Date:** 2026-06-02
**Task:** T91

## Sections

A single Settings page with collapsible sections, ordered:

1. **Prompts** — manage list, import/export.
2. **Next mode** — default delay, jitter, skip-first, idle timeout.
3. **Plan mode** — default slug, step count, delay, idle timeout, autoOpenResult.
4. **Editor & Injection** — adapter priority overrides, paste-verification toggle.
5. **Debugging** — verbose logging toggle (mirrors Core memory's per-project gate).
6. **Reset** — restore defaults (per section, with confirm).

## Persistence keys

| Section | Key |
|---------|-----|
| Next mode | `prompts.delaySettings` |
| Plan mode | `prompts.planSettings` |
| Editor | `prompts.editorSettings` |
| Debugging | `prompts.debugSettings` |

All values JSON-validated on read; invalid blobs fall back to defaults with one warn log.

## Live application

Settings changes apply on save without reload. The queue engine reads settings lazily per tick, so an in-flight task uses the values it captured at enqueue; the **next** task picks up new values.

## Acceptance

- [ ] The implementation satisfies the `01 — Settings Surface` contract in this file and the folder-level acceptance target: settings schema, defaults, reset, host overrides, and UX surface validate consistently.
- [ ] Verification passes when `UT-settings-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
