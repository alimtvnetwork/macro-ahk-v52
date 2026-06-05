# Variable-Input Dialog — Inline Form Spec

**Created:** 2026-06-02 ()

When a macro step is about to execute and at least one of its declared
variables is **required** and **unresolved** through tiers 1–4 of the
waterfall (`03-resolution-order.md`), the engine pauses the run and surfaces
a modal **Variable-Input Dialog** in the Prompts panel. The user fills the
form; the engine resumes from the same step.

## When the dialog opens

Trigger conditions (all must hold):

1. Step `Kind` is `prompt`, `audit`, `fix-from-audit`, or `final-audit`.
2. The resolved prompt declares ≥1 variable with `Required: true`.
3. At least one such variable has no value from tiers 1 → 4.

Conditions when the dialog **does NOT** open:

- All required variables resolved (run proceeds silently).
- Step is `next-loop`, `loop-if`, `set-var`, or `notify` (these have no
  prompt body).
- Macro is being **resumed** after an SW restart and the dialog had already
  been submitted before the restart (values persisted in
  `MacroRunState.<RunId>.Variables`).

## Layout

ASCII wireframe (dark-only theme, HSL tokens — `mem://preferences/dark-only-theme`):

```
┌─ Macro: Spec Tighten Cycle ─────────────────── ⏸ ⏹ ─┐
│ Step 3 / 8 · audit · prompt: audit-spec             │
│ Fill the required variables to continue.            │
│                                                     │
│ TargetFolder *      [ spec/21-app__________ ]       │
│   path · default spec/                              │
│                                                     │
│ Depth *             [ 4 ▼ ]   (1–8)                 │
│   integer · default 3                               │
│                                                     │
│ Mode *              ( ) fast   (•) deep             │
│                                                     │
│ ApiKey *            [ •••••••••••••• ]              │
│   string · sensitive                                │
│                                                     │
│              [ Cancel ]   [ Continue ▶ ]            │
└─────────────────────────────────────────────────────┘
```

## Per-`Type` widget

| Type      | Widget                                                  |
|-----------|---------------------------------------------------------|
| `string`  | `<input type="text">` with `Pattern` as `pattern` attr  |
| `integer` | `<input type="number" step="1">` with `Min`/`Max`       |
| `number`  | `<input type="number" step="any">` with `Min`/`Max`     |
| `boolean` | toggle switch (label: `true` / `false`)                 |
| `enum`    | radio group when ≤4 values; `<select>` when ≥5          |
| `path`    | `<input type="text">` with a "Browse" hint (no picker)  |
| any + `Sensitive` | `<input type="password">` (overrides above)     |

Pre-fill order:
1. Tier 1 step value (if literal, not unresolved placeholder).
2. Tier 2 macro value (same).
3. Tier 4 prompt `Default`.
4. Empty.

## Validation

- Submit is **disabled** until every required field passes its declared
  constraints (`Type`, `Min`/`Max`, `Pattern`, `EnumValues`, path sandbox).
- Inline error messages appear under each field; copy mirrors the
  `VariableTypeMismatch` reason codes from `06-validation.md`.
- On submit, the engine performs the **full** run-time check sequence
  (steps 1–6 of `06-validation.md`) again, treating dialog values as
  step-level (tier 1) inputs. Any failure re-opens the dialog with the
  offending field highlighted.

## Cancel / Stop semantics

| Action               | Effect                                                  |
|----------------------|---------------------------------------------------------|
| `Cancel`             | Transition run to `Stopped` with `Reason="RunAborted"`. |
| `ESC` key            | Same as `Cancel` (no "X" close-icon, single exit path). |
| `Continue ▶`         | Persist values to `MacroRunState.<RunId>.Variables`, resume the step. |
| Browser tab closed   | Run transitions to `Paused`; dialog re-opens on next user visit to the tab. |

Sensitive fields are written to `MacroRunState` already masked
(`07-sensitive-masking.md`) — the cleartext is held in memory only until the
rendered prompt is injected, then cleared.

## Keyboard

| Key            | Action                                          |
|----------------|-------------------------------------------------|
| `Tab`          | Move to next field                              |
| `Shift+Tab`    | Move to previous field                          |
| `Enter`        | Submit (if all valid)                           |
| `ESC`          | Cancel run                                      |

No conflict with recorder shortcuts (`mem://features/recorder-keyboard-shortcuts`)
because the dialog steals focus only while open.

## Accessibility

- Modal uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby` →
  macro/step heading.
- Each field has an associated `<label for>` and `aria-describedby` →
  the type/default helper text.
- Required fields get `aria-required="true"` and a visible `*` marker.
- Error messages use `aria-live="polite"`.

## Test surface

- Component test: render dialog for a step with all six `Type` widgets;
  assert correct widget per type, validation gating, sensitive masking.
- E2E test: macro pauses at first unfilled-required step, dialog opens,
  user fills, run resumes, values persist across SW restart.

Both tests are mandatory under `mem://preferences/test-with-features`
(component + E2E bans lifted 2026-05-25).
