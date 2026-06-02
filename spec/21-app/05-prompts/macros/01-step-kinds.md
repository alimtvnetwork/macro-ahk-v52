# Step Kinds — Full Reference

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)
**Supersedes:** Table in `00-concept.md` §A.1 (this file is normative for fields,
errors, examples).

A macro step is a tagged union discriminated by `Kind`. Unknown `Kind`
fails-fast at validation time (`Reason="UnknownStepKind"`).

---

## 1. `prompt`

Render a prompt template and inject it into the host chatbox.

| Field       | Type       | Required | Notes                                                              |
|-------------|------------|----------|--------------------------------------------------------------------|
| `Slug`      | string     | yes      | Resolved against `macro-prompts/` then `prompts/`.                 |
| `Variables` | object     | no       | Step-level overrides (highest precedence).                         |
| `WaitForAck`| boolean    | no       | Default `true` — block on injector ack before next step.           |

**Output:** `StepStarted` → `PromptInjected` → `StepCompleted` events.
**Errors:** `PromptNotFound`, `DuplicateSlug`, `MissingVariable`, `InjectorTimeout`.

```json
{ "Kind": "prompt", "Slug": "audit-spec", "Variables": { "Depth": 4 } }
```

## 2. `next-loop`

Drive the existing Task Next loop sequentially.

| Field        | Type    | Required | Notes                                                  |
|--------------|---------|----------|--------------------------------------------------------|
| `Count`      | integer | one of   | Max iterations (1 ≤ Count ≤ 100).                      |
| `Condition`  | string  | one of   | Expression evaluated each turn; stop when truthy.      |
| `PerStepTimeoutMs` | integer | no | Default 120000 (2 min). Hard cap 600000.              |

Exactly one of `Count` / `Condition` must be present.
**Errors:** `LoopExhaustedNoProgress`, `PerStepTimeout`, `HostNotReady`.

```json
{ "Kind": "next-loop", "Count": 10 }
```

## 3. `audit`

Inject the audit prompt; capture the response into the audit folder.

| Field      | Type   | Required | Notes                                                 |
|------------|--------|----------|-------------------------------------------------------|
| `Slug`     | string | yes      | Macro-prompt that produces `gap-analysis` + findings. |
| `Variables`| object | no       | Step-level overrides.                                 |
| `WriteTo`  | string | no       | Default `spec/audit/{{ RunId }}/01-gap-analysis.md`.  |

**Side effects:** writes `01-gap-analysis.md` + `02-findings.json`.
**Errors:** `AuditWriteForbidden`, `ScoreParseFailed`, `AuditTimeout`.

## 4. `fix-from-audit`

Instruct the host to act on the most recent audit folder.

| Field      | Type   | Required | Notes                                                       |
|------------|--------|----------|-------------------------------------------------------------|
| `AuditDir` | string | no       | Default `spec/audit/{{ RunId }}/`.                          |
| `Slug`     | string | no       | Override the default `fix-from-audit` macro-prompt.         |

Always followed by an explicit `next-loop` step in the canonical pattern.
**Errors:** `AuditDirMissing`, `MissingVariable`.

## 5. `final-audit`

Re-runs audit + writes the final report; parses score.

| Field      | Type   | Required | Notes                                                  |
|------------|--------|----------|--------------------------------------------------------|
| `Slug`     | string | no       | Default `final-score`.                                 |
| `WriteTo`  | string | no       | Default `spec/audit/{{ RunId }}/99-final-report.md`.   |

**Output:** populates `Run.LastScore` (integer 0–100).
**Errors:** `ScoreParseFailed`, `ReportWriteForbidden`.

## 6. `loop-if`

Conditional jump bounded by `MaxLoops`.

| Field       | Type    | Required | Notes                                                |
|-------------|---------|----------|------------------------------------------------------|
| `Condition` | string  | yes      | E.g. `"LastScore < TargetScore"`. Whitelisted ops.   |
| `GotoStep`  | integer | yes      | 1-based index; must be `< current step index`.       |

Watchdog hard-stops once `LoopCount >= MaxLoops`.
**Errors:** `LoopBudgetExhausted`, `InvalidCondition`, `BackwardJumpRequired`.

## 7. `set-var`

Mutate a macro-scoped variable.

| Field   | Type   | Required | Notes                                              |
|---------|--------|----------|----------------------------------------------------|
| `Name`  | string | yes      | Must match `^[A-Za-z][A-Za-z0-9_]*$`.              |
| `Value` | any    | yes      | Coerced to declared type if `Name` is declared.    |

Reserved names (`RunId`, `Now`, `LoopCount`, `LastScore`) are **read-only** —
mutation fails-fast with `Reason="ReservedVariable"`.

## 8. `notify`

Surface a milestone via toast + log.

| Field      | Type   | Required | Notes                                              |
|------------|--------|----------|----------------------------------------------------|
| `Message`  | string | yes      | Variables interpolated. Max 200 chars.             |
| `Level`    | enum   | no       | `info` (default) / `success` / `warn` / `error`.   |

Never blocks execution; failures here log but do not stop the run.

---

## Validation summary

All step records validated via `schemas/macro.schema.json` (Block 4, Task 34).
Unknown fields are **rejected** (`additionalProperties: false`). Schema
violations produce `Reason="MacroSchemaViolation"` with the full Ajv error
trail in `ReasonDetail`.
