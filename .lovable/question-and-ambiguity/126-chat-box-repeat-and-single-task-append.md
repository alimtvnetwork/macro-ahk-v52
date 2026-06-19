# 126 — Chat-box Repeat selector + Next/Plan single-task append

**Date:** 2026-06-19
**Source message:** user verbatim — "the next prompts will be added
as, like, as a single task. It would not be repeating automatically
… Same would go for the plan … in the chat box, there should be a
section called repeat … the prompts that we have picked, this would
be appended rather than replacing."
**Status:** open — implementation deferred until interpretation is
confirmed (or No-Questions Mode window closes).

---

## User request (summary)

1. **Stop auto-repeating** when the user picks a "Next ${N}" or
   "Plan ${N}" prompt. The pick should produce **one** appended paste
   into the chat box, with `${N}` substituted into the prompt body
   text. The user submits manually.
2. **Replace the auto-loop with a new "Repeat" selector** rendered
   near the chat box. The user picks how many times to repeat (1, 2,
   …, 50). Repeat acts on the prompt(s) the user has already picked.
3. **Append, not replace.** Every paste — single or repeated — must
   append to the chat box's existing content, never overwrite it.

## Current behaviour (verified in code)

- `standalone-scripts/macro-controller/src/ui/prompt-utils.ts`
  `pasteIntoEditor(...)` already **appends** with a `\n` prefix
  (lines 197–251). So clicking a prompt in the dropdown — including
  dynamic "Next 5 steps" / "Plan 10" — already pastes once and
  appends. Requirement 3 is already satisfied for the dropdown path.
- `standalone-scripts/macro-controller/src/ui/task-next-ui.ts`
  `runTaskNextLoop(deps, count)` is the auto-repeat loop. It pastes
  the SAME "Next Tasks" prompt body N times and clicks the submit
  button N times. It is triggered from:
    - `ui/keyboard-handlers.ts` (Ctrl+Alt+P / `;` / `.` presets +
      generic Alt+N preset), and
    - a "Task Next" button in `ui/panel-sections.ts`.
- There is no dropdown wiring that calls `runTaskNextLoop` when a
  user picks "Next ${N}" — that pick path uses `pasteIntoEditor`
  only.

So the gap is:

- (A) The auto-repeat happens via keyboard shortcuts and the
  panel-section button, not via the dropdown.
- (B) There is no "Repeat" UI selector near the chat box; the
  shortcut/button uses fixed presets baked into `taskNextState`.

## Ambiguities

### Q1. What does "Repeat" actually do?

Three plausible semantics:

- **(a) Concatenate-only.** Repeat N pastes the SAME picked prompt
  body N times into the chat box (each separated by `\n\n`) without
  clicking submit. User submits once manually. — Cheapest, no DOM
  clicks, fully manual.
- **(b) Paste-then-submit cycle.** For each of N cycles: paste the
  picked prompt, click submit, wait, repeat. This is what
  `runTaskNextLoop` already does — just driven by a UI selector
  instead of fixed keyboard presets. — Behaviour-preserving rename
  of existing feature.
- **(c) Paste once, submit N times.** Paste once, then click submit
  N times (no re-paste between clicks). Useful if the prompt asks
  the AI to "continue" each press.

**Recommendation:** **(b) Paste-then-submit cycle.** Reasons:

- Matches the existing `runTaskNextLoop` flow the user has been
  using for months — minimal regression risk.
- Matches the user's phrase "we can repeat as many times as we
  want" combined with the existing Task Next button behaviour.
- The "append, not replace" requirement is naturally satisfied
  because each cycle starts with an empty editor (post-submit) and
  appends one paste before clicking.

**Pros:** Preserves current automation, only the trigger surface
changes. **Cons:** Still risks runaway loops if the user sets 50 and
walks away; mitigate with the existing Escape-to-cancel handler and
a visible cycle counter toast.

**Alternatives considered:**

- (a) is closer to "one task appended" but loses the automation the
  user explicitly mentions ("we can repeat as many times as we
  want"). Rejected.
- (c) requires the AI not to clear the editor after submit, which
  is not how lovable.dev's chat box behaves. Rejected as fragile.

### Q2. Which prompt does Repeat use?

Two plausible interpretations:

- **(a) The last prompt the user picked from the dropdown.** Store
  it in `taskNextState.lastPickedPromptSlug` on dropdown click;
  Repeat replays that prompt N times.
- **(b) A new "active prompt" the user explicitly pins.** Add a
  "📌 Pin" action on each prompt row; Repeat replays the pinned
  prompt.

**Recommendation:** **(a) Last-picked.** Reasons:

- Zero extra UI; matches how Task Next currently resolves its prompt
  via `taskNextState.settings.promptSlug`.
- Mirrors the user's mental model: "the prompts that we have
  picked … would be appended".

**Pros:** No new pinning UX, just remember the last click. **Cons:**
Risk of repeating the wrong prompt if the user clicks a different
prompt by accident between picks; mitigate by showing the resolved
prompt name in the Repeat selector ("Repeat 5× of: Next 8 Steps").

### Q3. Where does the Repeat selector live?

- **(a) Inside the macro-controller floating panel**, next to the
  existing "Task Next" button. Easy to render, already isolated from
  lovable.dev's DOM.
- **(b) Injected directly into the lovable.dev chat-box footer**
  (above/below the Send button). Closer to the user's mental model
  ("in the chat box, there should be a section called repeat") but
  fragile against lovable.dev DOM churn.

**Recommendation:** **(a) Floating panel, labelled "Repeat".**
Reasons:

- Matches existing macro-controller UI conventions (Task Next,
  Settings, Move, etc. all live in the panel).
- Survives lovable.dev DOM rewrites. The user can drag the panel
  next to the chat box for visual proximity.
- Avoids re-injection complexity (the chat box DOM is rebuilt on
  every SPA navigation).

**Pros:** Resilient, consistent with the rest of the panel. **Cons:**
Slightly farther from the user's stated "in the chat box". If the
user pushes back, we'd switch to (b) and accept the DOM-churn cost.

### Q4. Max repeat count and step increments

User mentioned "50" as an example. Recommended bounds:

- Min: **1** (Repeat 1 = same as a single pick + submit)
- Max: **100** (matches Plan-prompt's `100` preset and the user's
  spoken "we can say fifty" upper-bound feel)
- Step: **1**, with quick presets at **1, 5, 10, 25, 50, 100**
  rendered as clickable chips next to the number input.

### Q5. Fate of `runTaskNextLoop` and its keyboard shortcuts

**Recommendation:** Keep `runTaskNextLoop` as the underlying engine;
wire the new Repeat selector to call it with the resolved
last-picked prompt and the user's count. Keep the existing keyboard
shortcuts (Ctrl+Alt+P/;/., Alt+N) intact — they remain useful
power-user shortcuts and the user did not ask to remove them.

### Q6. Prompt-body change for Next/Plan

The pasted Next v7 and Plan v7 bodies already describe single-task
semantics ("give me exactly N next steps", "write exactly N
steps"). No body change is required for the **append-not-replace**
requirement because `pasteIntoEditor` already appends.

A single sentence will be added to both bodies clarifying that
repetition is controlled by the chat-box Repeat selector, not by the
prompt itself (already added in `.lovable/prompts/12-...` and
`.lovable/prompts/13-...`).

## Implementation sketch (when approved)

1. Add `lastPickedPromptSlug: string | null` to `taskNextState`.
2. In `prompt-dropdown.ts` `_bindSinglePromptItem` and
   `_buildPromptRow`, set
   `taskNextState.lastPickedPromptSlug = p.slug ?? null` before
   `pasteIntoEditor(...)`.
3. In `panel-sections.ts`, render a `Repeat` number input (default
   `1`, min `1`, max `100`) plus preset chips `[1, 5, 10, 25, 50,
   100]` and a "▶ Repeat" button.
4. Wire the button: resolve the prompt by `lastPickedPromptSlug`
   (fallback to existing `promptSlug` setting), call
   `runTaskNextLoop(deps, repeatCount)` with that prompt.
5. Update `runTaskNextLoop` to accept an explicit `promptOverride`
   so it does not always re-resolve `Label.NextTasks`.
6. Add a unit test in
   `standalone-scripts/macro-controller/src/__tests__/` covering
   "last-picked prompt drives repeat" and "repeat=1 == single pick
   + submit".

## Files affected (estimated)

- `standalone-scripts/macro-controller/src/ui/task-next-ui.ts`
- `standalone-scripts/macro-controller/src/ui/prompt-dropdown.ts`
- `standalone-scripts/macro-controller/src/ui/panel-sections.ts`
- `standalone-scripts/macro-controller/src/__tests__/repeat-selector.test.ts` (new)
- `.lovable/prompts/12-next-steps-v7.md` (already noted)
- `.lovable/prompts/13-plan-steps-v7.md` (already noted)

## Why this is logged, not asked

`mem://workflow/no-questions-mode` is active until the user says
"ask question if any understanding issues". The user message ended
with "Do you have any confusions?" but the ambiguity-log path takes
precedence over a direct question per the memory rule.

The recommended interpretation above is the one this AI will
implement on the next user turn that says `next`, unless the user
contradicts it explicitly.

---

## RESOLVED 2026-06-19 — User answers

User explicitly opened a one-shot question turn and chose:

- **Q1 Repeat semantics:** Paste → submit → wait → repeat N times.
  Loop drives one "current chat box text" through N submit cycles,
  waiting for Lovable to finish between each.
- **Q2 Which prompt repeats:** Whatever text is currently in the
  chat box at the moment Start is clicked. No pinning, no "last
  picked" tracking.
- **Q3 Where Repeat lives:** BOTH — floating macro panel
  (number input + presets 1/5/10/25/50/100 + Start/Stop) AND an
  inline strip injected directly above Lovable's chat textarea.
  Both controls share the same state.
- **Q4 Stop conditions:** Manual Stop button ONLY. No auto-stop on
  errors, no credit threshold. User wants full manual control.

**Status:** RESOLVED — ready to implement. No further questions.

---

## Follow-up answers (2026-06-19)

- **Wait between iterations:** dropdown — `auto (submit ready)` *(default)* OR `fixed delay`. When fixed: number input (1–3600s) + presets **5/8/12/15/20/30/60s** + free custom value.
- **Empty chat box:** Start **anyway** — guard removed; logs a warning only.
- **Payment-notice scope:** unchanged — payment-failure banners only (credit/upgrade modals stay visible).
- **Persistence:** `chrome.storage.local` (falls back to `localStorage`) under key `marco-repeat-loop-prefs`. Persists `count`, `waitMode`, `delaySec` only. **Never** persists running state — loops never auto-resume after reload.
