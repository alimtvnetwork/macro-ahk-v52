# Smoke: Plan / Next / Repeat inline strips

Pinned for Plan 09 (v4.6.0). Run on the unpacked extension in real Chrome — the
sandbox can't load MV3 extensions, so this checklist is the contract for the
manual gate. Pair with the jsdom invariants:

- `src/__tests__/inline-strip-decoupled.test.ts` — paste-only Plan/Next + `INLINE_AUTOCHAIN_DISABLED`
- `src/__tests__/inline-strip-mount-order.test.ts` — Plan → Next DOM order, idempotent mount
- `src/__tests__/repeat-loop-start-log.test.ts` — `RepeatLoop.start: source=repeat-strip` marker

## Setup

1. `cd standalone-scripts/macro-controller && bun run build`
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select `standalone-scripts/macro-controller/dist`
3. Open a Lovable project tab; open DevTools Console (filter: `Marco`/`RepeatLoop`).

## Strip rendering

- [ ] Three strips visible above the chat box, top→bottom: **📋 Plan**, **▶ Next**, **🔁 Repeat**.
- [ ] No console errors. No duplicate strips after route changes.
- [ ] Chevron collapse persists across reload for Plan and Next strips.

## Plan strip — paste-only

- [ ] Click any Plan preset (e.g. 5). Chat box receives the v6 plan body with `${N}` → `5` substituted.
- [ ] Existing chat text is **appended to**, not replaced.
- [ ] Submit button is **not** auto-clicked. No `RepeatLoop.start` log fires.

## Next strip — paste-only

- [ ] Click any Next preset (1/2/3/4/5/8). Chat box receives the `next-${N}-steps` body (or legacy fallback).
- [ ] Existing chat text is appended to.
- [ ] Submit button is **not** auto-clicked. Toast shows `staged`. No `RepeatLoop.start` log.

## Repeat strip — the only auto-submitter

- [ ] Type any text in the chat box, click `🔁 Repeat` with count = 2.
- [ ] Console shows exactly one line: `RepeatLoop.start: source=repeat-strip N=2 chars=<n>`.
- [ ] Submit fires twice with the inter-iteration wait (submit-ready or fixed-delay).
- [ ] Stop button cancels mid-loop and logs `Repeat: stop requested`.
- [ ] Starting while already running logs `Repeat: already running` and does NOT submit again.
- [ ] Repeat with empty chat shows the empty-chat toast and does NOT log `RepeatLoop.start`.

## Sign-off

- Tester: ______________
- Date (local TZ): ______________
- Extension version: v4.6.0
- Result: PASS / FAIL — notes:
