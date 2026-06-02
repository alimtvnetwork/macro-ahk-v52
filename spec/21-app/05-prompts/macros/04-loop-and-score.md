# Loop & Score — Gating Rules

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Governs the `audit` → `next-loop` → `final-audit` → `loop-if` cycle.

## Score parsing

Canonical regex (single source of truth — referenced by
`engine/03-score-extraction.md`):

```
/^\s*Score\s*:\s*(\d{1,3})\s*\/\s*100\s*$/im
```

- Operates on the **last assistant turn** captured by the audit step.
- Multiple matches → use the **last** one (final summary wins).
- No match → fail-fast `Reason="ScoreParseFailed"` with the captured turn
  (truncated to 240 chars unless verbose logging ON) in `ReasonDetail`.
- Out of range (>100 or <0) → `Reason="ScoreOutOfRange"`.

## `TargetScore` gating

- Macro declares `TargetScore` (integer 1–100, default 100).
- `loop-if` re-enters the audit cycle while `LastScore < TargetScore`.
- On `LastScore >= TargetScore` the macro transitions to `Done`.

## `MaxLoops` safety

- Macro declares `MaxLoops` (integer 1–10, default 3).
- The engine increments `LoopCount` **before** evaluating `loop-if`.
- Once `LoopCount >= MaxLoops`, `loop-if` becomes a no-op and the macro
  transitions to `Done` with `Status="MaxLoopsReached"` (still terminal-success
  if score is acceptable, terminal-warn otherwise).
- Hard cap `MaxLoops <= 10` enforced by schema; values above fail at
  validation with `Reason="MacroSchemaViolation"`.

## Infinite-loop guard (watchdog)

Three independent watchdogs run concurrently:

| Watchdog            | Default      | Trigger action                             |
|---------------------|--------------|--------------------------------------------|
| Per-step timeout    | 120 s        | Fail step → `Reason="PerStepTimeout"`      |
| Total-run timeout   | 3600 s (1 h) | Fail run  → `Reason="TotalRunTimeout"`     |
| No-progress guard   | 3 consecutive loops with **same** `LastScore` | Fail run → `Reason="NoProgressLoop"` |

All thresholds configurable per-macro (`TimeoutsMs` block) but never above
the hard caps in `engine/08-watchdog.md` (Task 69).

## `Condition` expression grammar

Used by `loop-if` and `next-loop` (Condition variant). Whitelist-only:

```
expr     := <var> <op> <literal>
op       := "<" | "<=" | "==" | "!=" | ">=" | ">"
var      := "LastScore" | "LoopCount" | "TargetScore" | "<UserVar>"
literal  := integer | quoted-string | "true" | "false"
```

No parentheses, no boolean composition, no function calls. Anything else →
`Reason="InvalidCondition"`. Authors compose multi-clause logic by chaining
multiple `loop-if` steps.

## Worked example

```
TargetScore = 100, MaxLoops = 3
Loop 1: LastScore = 87  → loop-if matches → GotoStep 3
Loop 2: LastScore = 96  → loop-if matches → GotoStep 3
Loop 3: LastScore = 96  → no-progress guard trips → Failed("NoProgressLoop")
```
