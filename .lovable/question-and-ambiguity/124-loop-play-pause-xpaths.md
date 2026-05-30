# Ambiguity 124 — Loop Play/Pause + Locked-Banner XPaths

**Spec:** `spec/22-app-issues/124-loop-play-pause-gate-and-project-locked-handling.md`
**Raised:** turn after user requested play-gate + locked-error handling
**Blocking?** Yes for Tasks 2 + 4 (selector constants). Task 1 (spec) and Task 3 (project-lock detector via API) are unblocked.

## What's missing

The user explicitly said: *"I will give you the play button XPath as well, pause button XPath as well."* No XPaths supplied yet. Spec also references an optional **locked-banner** XPath.

## Required inputs

1. **`PLAY_BUTTON_XPATH`** — exact XPath of the ▶ Play button shown when a run is idle or paused.
2. **`PAUSE_BUTTON_XPATH`** — exact XPath of the ⏸ Pause button shown while a run is streaming.
3. **`LOCKED_BANNER_XPATH`** *(optional)* — DOM banner that appears when "project is locked" surfaces in the UI. Skippable if the API body / HTTP 423 check is sufficient.

## Options for proceeding now

### A. Recommended — Wait for selectors, ship spec only this turn ✅
- **Pros:** Zero risk of placeholder XPaths leaking into prod; feature-flagged off until correct; matches the spec's gating contract.
- **Cons:** Tasks 2 + 4 stall until user pastes selectors.

### B. Implement modules with placeholder constants + flag OFF
- **Pros:** Code + tests land now; user only pastes one constant later.
- **Cons:** Risk of forgetting to flip flag; test fixtures use synthetic DOM that may not match real selectors.

### C. Guess selectors from a Lovable page snapshot
- **Pros:** End-to-end demo possible.
- **Cons:** Lovable's button DOM changes frequently; almost certainly wrong; violates "no fragile guesses" pattern from `mem://ui/selector-standards`.

## Recommendation

**Option A.** Spec is written, ambiguity is logged, Task 2 onward stays pending until user pastes the three XPaths. Then I proceed top-down through Tasks 2-5.
