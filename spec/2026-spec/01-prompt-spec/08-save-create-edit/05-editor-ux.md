# 05 — Editor UX Contract

**Date:** 2026-06-02
**Task:** T60

## Surface

A **modal or side-panel** (host decides) with:

- Title input (required, char counter `n/120`).
- Category dropdown (with "+ New category" inline).
- Tags chip input (Enter / comma to commit).
- Body editor: plain monospace textarea with markdown-aware shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+K` for link). No WYSIWYG.
- Live preview panel toggle (markdown rendered with the same sanitizer used at inject time).
- Variable hints: typing `{{` shows a popover of available variables from `PromptContext`.

## Buttons

| Button | Shortcut | Behavior |
|--------|----------|----------|
| Save | `Ctrl+S` | Validate → persist → close. |
| Save & New | `Ctrl+Shift+S` | Save then reset to blank draft. |
| Cancel | `Esc` | If dirty, confirm discard. |
| Delete | — | Archive (see `03-delete-and-archive.md`). |

## Dirty tracking

Compares current draft to the loaded baseline (deep equal on `{title, category, body, tags}`). The Save button is disabled when not dirty AND not a new prompt.

## Validation feedback

- Inline error under each field on blur.
- Save button stays enabled while errors exist; clicking it surfaces a toast summarising all blocking errors (one toast, multiple bullets) — avoids hidden-error confusion.

## Autosave

Out of scope for v1 (explicit decision; manual save matches user mental model and avoids partial-write churn in the loader cache).

## Accessibility

- All inputs labelled.
- Focus trap inside modal; `Esc` closes; initial focus on Title for new, on Body for edit.
- Live region announces save success / failure.

## Acceptance

- [ ] The implementation satisfies the `05 — Editor UX Contract` contract in this file and the folder-level acceptance target: prompt create, edit, delete, duplicate, import, and archive flows are reversible and observable.
- [ ] Verification passes when `UT-crud-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
