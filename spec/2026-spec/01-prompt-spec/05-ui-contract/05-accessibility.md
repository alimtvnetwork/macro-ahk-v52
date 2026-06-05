# T45 · Accessibility

**Created:** 2026-06-02

WCAG 2.2 AA is the baseline. This file pins the choices the Prompts
feature MUST make so behaviour is uniform across hosts.

## ARIA roles

| Region | Role | Notes |
|---|---|---|
| Dropdown root | `dialog` with `aria-modal="false"` | Non-modal: page underneath remains interactive (e.g. closing by clicking ChatBox). |
| Search box | `searchbox` | `aria-label="Search prompts"`. |
| Category chip row | `tablist` | Each chip is a `tab` with `aria-selected`. |
| Prompt list | `listbox` | Each row is an `option` with `aria-selected` and `aria-label="<title>, version <version>"`. |
| NextLoop / PlanLoop sub-menus | `menu` → `menuitem` | Standard submenu semantics. |
| Toasts (paste feedback) | `status` (`aria-live="polite"`) | Errors use `alert` (`aria-live="assertive"`). |

## Focus management

- On open: focus the search box.
- On close: restore focus to the element that was focused before
  open. If that element is gone, focus the trigger.
- Focus must always be visible (`:focus-visible` outline ≥ 2 px,
  contrast ratio ≥ 3:1 against the surface).
- Focus MUST NOT be trapped — `Esc` always escapes the dropdown.

## Colour and contrast

- Text vs background: ≥ 4.5:1 (normal), ≥ 3:1 (large / bold ≥ 18 px).
- Icon-only controls carry `aria-label`.
- Selection / hover states distinguished by **more than colour**
  (also border or icon).

## Reduced motion

When `prefers-reduced-motion: reduce` is set, the dropdown MUST:

- Skip open/close transitions (instant show/hide).
- Skip toast slide animations (instant fade only).
- Keep search-result re-ordering instantaneous.

## Live announcements

| Event | Announce |
|---|---|
| Prompt injected | `polite`: "Prompt <title> inserted". |
| Paste verification failed (T49) | `assertive`: "Paste failed: <reasonDetail>". |
| Queue advance (Next/Plan) | `polite`: "<n> of <total> sent". |
| Queue paused due to interruption banner | `assertive`: "Queue paused — host requires attention". |

## Internationalisation note

The dropdown chrome is English baseline (per non-goal NG8). Prompt
titles and bodies render in whatever language they were authored;
adapters MUST NOT alter direction (`dir` attribute is inherited from
the host).

## Acceptance

- [ ] The implementation satisfies the `T45 · Accessibility` contract in this file and the folder-level acceptance target: trigger, dropdown, keyboard, search, and accessibility behavior remains user-verifiable.
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
