# Ambiguity: "Fix broken UI issues" — scope from screenshot only

**Source:** User message + uploaded screenshot (chatbox prompts dropdown + floating Task Next submenu overlapping editor file tree).

## Observed visual issues in screenshot
1. **Header wraps** — `Click to paste into editor` + `✏️ Edit` button is too wide for the 180px dropdown, wraps to `Click to paste · icon copy` (the word "Edit" gets clipped/wrapped).
2. **Floating Task Next submenu overflow** — `position:fixed` flyout has 13 items (~290px tall) and can overflow viewport vertically; only right-edge clamp is implemented.
3. **Visual overlap with editor panes** — floating menu paints over Lovable's right-side file tree (it lives in `document.body` with `z-index:100010`, but cannot be helped without moving inside the panel container).

## Options
- **A. Tight hardening (chosen)** — Shorten header text, add `flex-shrink:0` to Edit button, add `white-space:nowrap`, clamp floating submenu vertically with `max-height` + scroll. Low-risk, no behavior change.
- B. Move floating submenu inline (like `prompt-dropdown.ts`'s `position:static` variant). Bigger refactor, risk of breaking layout in `save-prompt-dropdown` consumers.
- C. Ask user. Blocked by No-Questions Mode.

## Recommendation
Took **A**. If the user actually meant something else (e.g. the duplicate "Task Next" labelling, the chips overflow, or the bottom action bar `Add guideline vali…` truncation), they will say so and we iterate.
