# Command — Three-Strip Decoupled Flow (Plan / Next / Repeat)

**Captured:** 2026-06-25
**Scope:** macro-controller inline strip UI (above Lovable chat composer)

## Verbatim

> First it will be Next, then Plan, then the Repeat button, instead of calling it Start. The button should be Repeat. Now the order will be first **Plan**, then **Next**, then **Repeat**.
>
> **Plan** (manual): click a plan number (5, 10, …) → append the corresponding plan prompt to whatever is already in the Lovable chat box. No auto-submit. User edits if needed and presses Enter themselves.
>
> **Next** (manual): click a Next count (e.g. "Next 2") → paste/stage the Next prompt into the chat box. No auto-submit, no looping. Stays there for user to review/edit.
>
> **Repeat** (renamed from "Start", the only executor): when pressed with count N, submit and repeat the current chat content N times, waiting for Lovable idle between cycles.
>
> The three are decoupled — no auto-chaining between them.

## Rules

1. Strip order top→bottom: **Plan → Next → Repeat**.
2. Plan and Next are **paste-only stagers** — never auto-submit, never loop.
3. Repeat is the **only submitter**. Rename every "Start" label/aria/tooltip to "Repeat".
4. No strip triggers another. Clicking Plan must not arm Next; clicking Next must not arm Repeat.
