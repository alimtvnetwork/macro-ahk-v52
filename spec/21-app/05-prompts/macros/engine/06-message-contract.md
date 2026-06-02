# Message Contract

All messages cross `chrome.runtime` or `chrome.tabs.sendMessage`. Every shape is fully typed (no `unknown` outside `CaughtError`).

## Envelope
```ts
interface MacroMessage<TKind extends string, TPayload> {
  Channel: 'macro';
  Kind: TKind;
  RunId: string;
  TabId: number;
  TimestampKL: string;          // Asia/Kuala_Lumpur ISO8601
  Payload: TPayload;
}
```

## Panel → Background
| Kind | Payload |
|------|---------|
| `StartMacro` | `{ Slug: string; Variables: ResolvedVariable[]; }` |
| `PauseMacro` | `{}` |
| `ResumeMacro` | `{}` |
| `StopMacro` | `{ Reason: string }` |
| `SubscribeEvents` | `{ FromEventSeq?: number }` |

## Background → Panel
| Kind | Payload |
|------|---------|
| `MacroEvent` | `MacroEvent` (see `09-event-stream.md`) |
| `StateSnapshot` | `RunState` |
| `Error` | `FailureLog` (mandatory shape) |

## Background → Injector (MAIN world)
| Kind | Payload |
|------|---------|
| `ExecStep` | `{ StepIndex: number; StepKindId: number; ResolvedBody: string; Selectors?: SelectorSpec[]; Timeout: number }` |
| `AbortStep` | `{ Reason: string }` |

## Injector → Background
| Kind | Payload |
|------|---------|
| `StepResult` | `{ StepIndex: number; Output: string; SelectorAttempts: SelectorAttempt[]; DurationMs: number }` |
| `StepFailed` | `FailureLog` |
| `Heartbeat` | `{ StepIndex: number }` |

## Type registry
- Single source of truth: `src/prompts/engine/message-types.ts`.
- Both ends import the same types — no duplicated shapes.
- Compile-time discriminated unions on `Kind`; runtime `assertMessage()` validates envelope shape and rejects unknown `Kind` (`Reason='UnknownMessageKind'`).

## Routing rules
- Panel ↔ Background: `chrome.runtime` long-lived port keyed by `RunId`.
- Background ↔ Injector: `chrome.tabs.sendMessage(TabId, ...)`; reply via `sendResponse`.
- New-tab guard (`isNewTabOrBlankUrl()`) applies before any `ExecStep` dispatch.

## Failure log
`Reason ∈ { UnknownMessageKind, EnvelopeInvalid, TabClosed, PortDisconnected, ResponseTimeout }` with `ReasonDetail` = Kind + RunId + TabId.
