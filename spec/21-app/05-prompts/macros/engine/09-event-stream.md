# Event Stream

## Union
```ts
type MacroEvent =
  | RunStarted
  | StepStarted
  | StepCompleted
  | ScoreParsed
  | LoopEntered
  | RunPaused
  | RunResumed
  | RunFinished
  | RunFailed;
```

All events share a common header:
```ts
interface MacroEventHeader {
  RunId: string;
  EventSeq: number;       // monotonically increasing per RunId, starts at 0
  TimestampKL: string;    // Asia/Kuala_Lumpur ISO8601
  MacroSlug: string;
}
```

## Event payloads

| Event | Adds |
|-------|------|
| `RunStarted` | `{ Type: 'RunStarted'; Variables: ResolvedVariable[] }` (Sensitive masked) |
| `StepStarted` | `{ Type: 'StepStarted'; StepIndex; StepKindId; ResolvedBodyChecksum }` |
| `StepCompleted` | `{ Type: 'StepCompleted'; StepIndex; DurationMs; OutputChecksum; OutputBytes }` |
| `ScoreParsed` | `{ Type: 'ScoreParsed'; StepIndex; Score: number; RawLine: string }` |
| `LoopEntered` | `{ Type: 'LoopEntered'; LoopIteration; LoopsRemaining; LoopAnchor }` |
| `RunPaused` | `{ Type: 'RunPaused'; AtStepIndex }` |
| `RunResumed` | `{ Type: 'RunResumed'; AtStepIndex }` |
| `RunFinished` | `{ Type: 'RunFinished'; FinalScore?; LoopsConsumed; DurationMs }` |
| `RunFailed` | `{ Type: 'RunFailed'; Failure: FailureLog }` (full mandatory shape) |

## Guarantees
- Events are persisted to `spec/audit/<RunId>/_log.jsonl` **before** broadcast.
- `EventSeq` is gap-free; consumers detect missed events by sequence skip and resync via `SubscribeEvents { FromEventSeq }`.
- Terminal events (`RunFinished`, `RunFailed`) close the per-RunId port after broadcast.

## Subscription
- Panel calls `engine.subscribe(runId, listener)` → returns `Unsubscribe`.
- Late subscribers receive replay of all events with `EventSeq >= FromEventSeq` from `_log.jsonl`, then live tail.

## Non-events
Heartbeats, internal timer ticks, and watchdog re-arms are **not** events. They're internal to the runner and excluded from `_log.jsonl` to keep the audit human-readable.

## Failure log (within `RunFailed`)
The embedded `Failure` field carries the full mandatory shape — `Reason`, `ReasonDetail`, `StepIndex`, `MacroSlug`, `RunId`, `VariableContext[]`, `SelectorAttempts[]`.
