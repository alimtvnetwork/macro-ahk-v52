# Failure Modes — Every Error Path

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Every failure path in the macro engine **must** emit a log entry matching
the mandatory failure-log shape from
`mem://standards/verbose-logging-and-failure-diagnostics`.

## Mandatory shape

```ts
type MacroFailureLog = {
  RunId: string;
  Step: number;                  // 1-based step index
  Kind: string;                  // step Kind
  Reason: string;                // short code, from table below
  ReasonDetail: string;          // human-readable; truncated unless verbose ON
  SelectorAttempts: SelectorAttempt[] | null;   // null + reason when N/A
  VariableContext: VariableContext[] | null;    // null + reason when N/A
  At: string;                    // ISO 8601 Asia/Kuala_Lumpur
};
```

- `SelectorAttempts` carries `{ id, strategy, expression, matched, matchCount, reason }`.
- `VariableContext` carries `{ name, source, row?, column?, resolvedValue?, type, reason }`.
- `null` is only valid when paired with `{ Reason: "NotApplicable", … }` in the array slot — the field itself must always exist.
- Sensitive variables masked per `variables/07-sensitive-masking.md`.

## Reason codes

### Schema / Definition

| Reason                  | When                                                                |
|-------------------------|---------------------------------------------------------------------|
| `MacroSchemaViolation`  | `.macro.json` fails Ajv validation                                  |
| `UnknownStepKind`       | `Kind` not in the 8 documented kinds                                |
| `DuplicateSlug`         | Same prompt slug in `prompts/` and `macro-prompts/`                 |
| `PromptNotFound`        | `Slug` doesn't resolve in either folder                             |
| `ReservedVariable`      | `set-var` targets `RunId` / `Now` / `LoopCount` / `LastScore`       |
| `InvalidCondition`      | Condition expression outside whitelist grammar                      |
| `BackwardJumpRequired`  | `loop-if.GotoStep >= currentStep`                                   |

### Variables / Templating

| Reason             | When                                                              |
|--------------------|-------------------------------------------------------------------|
| `MissingVariable`  | Required variable unresolved through all 5 tiers                  |
| `VariableTypeMismatch` | Resolved value can't coerce to declared `Type`                |
| `VariableInjection`| Value contains forbidden `{{` after first-pass interpolation      |

### Injection / Host

| Reason                | When                                                          |
|-----------------------|---------------------------------------------------------------|
| `HostNotReady`        | Chatbox selector not found within readiness budget            |
| `InjectorTimeout`     | Injector ack not received within `PerStepTimeoutMs`           |
| `ChatboxBlocked`      | Host returned a "send disabled" sentinel                      |
| `TabClosedDuringRun`  | `chrome.tabs.onRemoved` fired for `Run.TabId`                 |

### Loop / Score

| Reason                | When                                                          |
|-----------------------|---------------------------------------------------------------|
| `ScoreParseFailed`    | Score regex didn't match audit response                       |
| `ScoreOutOfRange`     | Parsed score outside `0..100`                                 |
| `PerStepTimeout`      | Step exceeded its budget                                      |
| `TotalRunTimeout`     | Run exceeded total budget (default 1 h)                       |
| `NoProgressLoop`      | 3 consecutive loops with identical `LastScore`                |
| `LoopBudgetExhausted` | `LoopCount >= MaxLoops` with score still below target         |

### Storage / Artifacts

| Reason                    | When                                                      |
|---------------------------|-----------------------------------------------------------|
| `AuditWriteForbidden`     | Resolved path outside `spec/audit/<RunId>/` or in forbidden folder |
| `AuditArtifactCollision`  | Writer would overwrite an existing file in the same run   |
| `ReportWriteForbidden`    | `final-audit.WriteTo` violates allowed-paths rule         |
| `StorageQuotaExceeded`    | `chrome.storage.local` quota reached during state persist |
| `StateRehydrationFailed`  | Persisted `MacroRunState` failed shape validation on boot |

### Lifecycle

| Reason            | When                                                              |
|-------------------|-------------------------------------------------------------------|
| `RunAborted`      | User clicked ⏹ Stop                                                |
| `RunPaused`       | User clicked ⏸ Pause (informational, not a failure)               |
| `ConcurrencyDenied` | A run is already active for this tab and `08-watchdog` rule fired |

## No retry / no backoff

Per `mem://constraints/no-retry-policy`: failures are **terminal for the step**
and **terminal for the run** unless the failure is `PerStepTimeout` on a
`next-loop` iteration, in which case the loop's per-iteration budget is the
only recovery vector (next iteration starts fresh). Engine code MUST NOT
introduce recursive/back-off retry.

## Worked failure-log example

```json
{
  "RunId": "spec-tighten-cycle-20260602-094312",
  "Step": 3,
  "Kind": "audit",
  "Reason": "ScoreParseFailed",
  "ReasonDetail": "Last assistant turn (truncated 240): 'Audit complete. See findings.json for details…'",
  "SelectorAttempts": null,
  "VariableContext": [
    { "name": "TargetFolder", "source": "macro", "resolvedValue": "spec/", "type": "string", "reason": "ok" },
    { "name": "Depth",        "source": "default", "resolvedValue": 3,    "type": "integer", "reason": "ok" }
  ],
  "At": "2026-06-02T09:45:01+08:00"
}
```
