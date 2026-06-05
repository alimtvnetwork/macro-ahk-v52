# T44 · Keyboard contract

**Created:** 2026-06-02

Every interactive dropdown action MUST have a keyboard equivalent.

## Global (while dropdown is open)

| Key | Action |
|---|---|
| `Esc` | Close dropdown; return focus to previous element (typically ChatBox). |
| `Tab` / `Shift+Tab` | Move focus through regions: search → chips → list → footer → back. |
| `Enter` | Activate the currently focused element. |
| `Space` | Activate buttons / toggle chip; **not** Enter on list rows (would inject prematurely). |

## Search box focused

| Key | Action |
|---|---|
| `↓` | Move focus to first list row; query is preserved. |
| `↑` | Move focus to last list row. |
| `Enter` | Inject the **top** matching row (if any) and close. |

## List row focused

| Key | Action |
|---|---|
| `↑` / `↓` | Move within visible (filtered) rows. |
| `Home` / `End` | Jump to first / last visible row. |
| `PageUp` / `PageDown` | Move ~10 rows. |
| `Enter` | Inject + close. |
| `Shift+Enter` | Inject without closing. |
| `E` | Open Edit modal for focused prompt. |
| `Del` | Delete (with confirm) — refused for `isDefault: true` (calls Hide instead). |
| `Ctrl/⌘+C` | Copy resolved `body` to clipboard (uses current `PromptContext`). |

## Category chip row focused

| Key | Action |
|---|---|
| `←` / `→` | Move between chips. |
| `Enter` / `Space` | Select chip. |
| `Esc` | Close dropdown (does not deselect chip). |

## NextLoop / PlanLoop entries

| Key | Action |
|---|---|
| `→` / `Enter` | Open sub-menu (1 / 2 / 3 / 5 / 10 / 20 / 30 / 40 / custom). |
| `←` / `Esc` | Close sub-menu. |
| `1`–`9` | Quick-pick that preset count when sub-menu is open. |

## Accessibility cross-ref

ARIA roles, focus rings, and screen-reader announcements are defined
in T45.

## Acceptance

- [ ] The implementation satisfies the `T44 · Keyboard contract` contract in this file and the folder-level acceptance target: trigger, dropdown, keyboard, search, and accessibility behavior remains user-verifiable.
- [ ] Verification passes when `CT-ui-001..009 and E2E-ui-001..003` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** open the dropdown only on the trigger keystroke / button click defined in `01-trigger.md`; never on focus or hover.
- **MUST** keep the search filter case-insensitive, diacritic-folded, and bounded to `SEARCH_DEBOUNCE_MS` (120) debounce — see [reference/05-runtime-defaults.md](../reference/05-runtime-defaults.md).
- **MUST** expose every dropdown row with `role="option"`, `aria-selected`, and keyboard navigation per `04-keyboard.md`; no mouse-only paths.
- **MUST** announce paste success / failure via the toast contract in `06-injection-contract/05-paste-toast.md` — no silent failures.

## Pitfalls / Counter-examples

- ❌ Re-rendering the entire dropdown on every keystroke. ✅ Virtualize once row count > `DROPDOWN_VIRTUALIZE_THRESHOLD` (50).
- ❌ Trapping focus inside the dropdown. ✅ `Esc` returns focus to the editor caret position.
- ❌ Showing "no results" only when the user pauses typing. ✅ Update synchronously after debounce.
- ❌ Mouse hover auto-selects a row. ✅ Hover highlights only; selection requires click or `Enter`.
- ❌ Tooltip rendered with a hardcoded timezone. ✅ Use `Intl.DateTimeFormat().resolvedOptions().timeZone`.
