# T43 · Search and filter

**Created:** 2026-06-02

Two orthogonal filters narrow the visible prompt list:

1. **Category chip** (single-select; default `[All]`).
2. **Search query** (free text from the search box).

The visible set is the **intersection** of both.

## Category filter

- `[All]` ⇒ no category constraint.
- Any other chip ⇒ keep prompts whose `categories[]` contains the
  chip's slug.
- Free-tag fallback chips (T27 §"Free-tag fallback") behave identically.
- Switching chips preserves the search query.

## Search match algorithm

For each prompt, compute a `score`:

| Field | Weight | Match type |
|---|---|---|
| `title` | 5 | case-insensitive substring; +5 bonus on prefix match |
| `slug` | 3 | case-insensitive substring |
| `categories[]` (joined) | 2 | case-insensitive substring |
| `body` | 1 | case-insensitive substring; capped contribution of 1 regardless of hit count |

- A prompt is **kept** iff `score > 0`.
- Results sorted by `score DESC`, then by `(category, order, title)`
  (same tie-break as the unfiltered list).
- Whitespace-only query ⇒ no search constraint (chip still applies).

## Multi-word queries

The query is split on whitespace. **All** tokens must match
(AND-semantics) somewhere in the searchable fields. Token scores are
summed.

## Performance budget

- Catalogue size ≤ `SEARCH_CATALOGUE_LARGE_ITEMS` prompts: synchronous filter on every keystroke.
- Catalogue size > `SEARCH_CATALOGUE_LARGE_ITEMS`: debounce keystrokes by `SEARCH_DEBOUNCE_MS`; never block
  longer than `FRAME_BUDGET_MS` per frame.

## Body-search and verbose mode

`body` is **always** searched (cheap substring). The 64 KiB body cap
(T33) keeps the per-prompt cost bounded. Verbose-mode logging
(`Project.VerboseLogging`) does not change matching — it only affects
what gets persisted in logs.

## Acceptance

- [ ] The implementation satisfies the `T43 · Search and filter` contract in this file and the folder-level acceptance target: trigger, dropdown, keyboard, search, and accessibility behavior remains user-verifiable.
- [ ] Verification passes when `CT-ui-001..009 and E2E-ui-001..003` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** open the dropdown only on the trigger keystroke / button click defined in `01-trigger.md`; never on focus or hover.
- **MUST** keep the search filter case-insensitive, diacritic-folded, and bounded to `SEARCH_DEBOUNCE_MS` (120) debounce.
- **MUST** expose every dropdown row with `role="option"`, `aria-selected`, and keyboard navigation per `04-keyboard.md`; no mouse-only paths.
- **MUST** announce paste success / failure via the toast contract in `06-injection-contract/05-paste-toast.md` — no silent failures.

## Pitfalls / Counter-examples

- ❌ Re-rendering the entire dropdown on every keystroke. ✅ Virtualize once row count > `DROPDOWN_VIRTUALIZE_THRESHOLD` (50).
- ❌ Trapping focus inside the dropdown. ✅ `Esc` returns focus to the editor caret position.
- ❌ Showing "no results" only when the user pauses typing. ✅ Update synchronously after debounce.
- ❌ Mouse hover auto-selects a row. ✅ Hover highlights only; selection requires click or `Enter`.
- ❌ Tooltip rendered with a hardcoded timezone. ✅ Use `Intl.DateTimeFormat().resolvedOptions().timeZone`.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
