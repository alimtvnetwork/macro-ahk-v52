# T42 · Dropdown shape

**Created:** 2026-06-02

Required regions of the open dropdown, top to bottom.

## Layout

```
┌──────────────────────────────────────┐
│ ⏭ Task Next            ▸             │  ← row 1: NextLoop entry (always first)
├──────────────────────────────────────┤
│ 🗓 Plan Mode           ▸             │  ← row 2: PlanLoop entry (always second)
├──────────────────────────────────────┤
│ ➕ New prompt   ⤓ Import   ⤒ Export │  ← row 3: footer actions, pinned top
├──────────────────────────────────────┤
│ [All] [automation] [versioning] …    │  ← row 4: category chips (T43 filter)
├──────────────────────────────────────┤
│ 🔍  search prompts…                  │  ← row 5: search box (autofocus)
├──────────────────────────────────────┤
│ • Next Tasks            v1.0.0       │  ← row 6+: prompt list (scrollable)
│ • Audit Spec v1         v1.2.0       │
│ • Read Memory           v3.0         │
│   …                                   │
├──────────────────────────────────────┤
│ ⚙ Settings        ↻ Reload prompts  │  ← row last: pinned footer
└──────────────────────────────────────┘
```

## Required regions (in this order)

1. **NextLoop entry** — `⏭ Task Next`, with sub-menu (`1 / 2 / 3 / 5 / 10 / 20 / 30 / 40 / custom`). MUST be the **first** row of the dropdown.
2. **PlanLoop entry** — same sub-menu shape, separate count. Second row.
3. **Action row** — `New prompt`, `Import`, `Export (selected | all)`.
4. **Category chip row** — chips driven by `PromptCategory` + free-tag fallback; first chip is `[All]`, selected by default.
5. **Search box** — autofocused on open. Behaviour per T43.
6. **Prompt list** — virtualised when > 50 entries; each row shows title + version + (on hover) category chips and a small `⋯` menu (`Edit / Delete / Copy text / Pin`).
7. **Footer** — `Settings`, `Reload prompts` (calls `loader.invalidate()` then `loadAll()`).

## Selection model

- Single selection. Clicking a prompt row triggers **inject + close**.
- `Shift+Click` on a row injects without closing (power-user batch).
- `Enter` while a row is focused = same as click.

## Empty / loading / error states

| State | Visual |
|---|---|
| Loading first list | Skeleton rows (3) + disabled search. |
| Empty (no prompts) | "No prompts yet — click **New prompt** to add one." |
| Error from loader | One-line banner with `Reason` + `Retry` button calling `loader.invalidate()`. |

## Out of scope here

- Visual theming (host chooses light/dark; this feature has no opinion).
- Drag-and-drop reorder (future spec).

## Acceptance

- [ ] The implementation satisfies the `T42 · Dropdown shape` contract in this file and the folder-level acceptance target: trigger, dropdown, keyboard, search, and accessibility behavior remains user-verifiable.
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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

