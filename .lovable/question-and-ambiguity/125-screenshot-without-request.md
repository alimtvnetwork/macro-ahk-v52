# 125 — Screenshot supplied without a requested change

## Ambiguity

The user supplied a Macro Controller screenshot showing the dark workspace panel, credit badges, task queue footer, and scrollbars, but did not include text explaining what should be fixed or changed.

## Options

### Option A — Treat the image as reference only and wait for an explicit task
- **Pros:** Safest; avoids changing behavior or layout based on a guess.
- **Cons:** No immediate product change.

### Option B — Infer a UI polish task from visible details
- **Pros:** Could improve obvious visual friction such as dense spacing or scrollbars.
- **Cons:** High risk of scope creep and unwanted changes because the target issue is not stated.

### Option C — Run broad screenshot-driven investigation
- **Pros:** Might uncover hidden layout regressions.
- **Cons:** Expensive and likely unfocused without a failure signal.

## Recommendation

Choose **Option A**. In No-Questions Mode, do not ask a clarifying question; log the ambiguity and avoid code changes until the user names the exact issue.