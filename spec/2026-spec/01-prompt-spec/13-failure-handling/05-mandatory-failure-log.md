# 05 — Mandatory Failure Log

**Date:** 2026-06-02
**Task:** T85

## Schema (project-wide rule)

Every `failed` task MUST carry a fully-populated `FailureRecord`:

```ts
interface FailureRecord {
  reason: FailureReason;        // short code (see 01-categories.md)
  reasonDetail: string;         // human-readable specifics
  occurredAt: string;           // ISO timestamp
  selectorAttempts: SelectorAttempt[]; // never omit; [] is invalid — use null reason
  variableContext: VariableContext[];  // never omit; [] is invalid — use null reason
  stack?: string;               // filtered per stack-trace-filtering memory
}

interface SelectorAttempt {
  id: string;                   // e.g. "ChatBoxResolver#primary"
  strategy: "css" | "xpath" | "data-attr" | "structural";
  expression: string;
  matched: boolean;
  matchCount: number;
  reason: string | null;        // "not found", "disabled", "detached", or null when matched
}

interface VariableContext {
  name: string;                 // e.g. "task.promptSlug"
  source: "context" | "settings" | "host" | "store";
  row: number | null;
  column: number | null;
  resolvedValue: JsonValue | null;
  type: string;                 // typeof or schema name
  reason: string | null;        // "missing", "empty", "wrong type", or null when ok
}
```

## Never-omit rule

If a category truly has nothing to report, the field MUST still appear with an explicit `null` reason inside one synthetic entry. Empty arrays are forbidden — they make the log indistinguishable from "we forgot to populate it".

## Logging path

Written via the host-supplied namespace logger (e.g. `host.logger.error(record)`). Never bare `console.error`.

## Verbose gate

The `reasonDetail` and any captured HTML / Text snippets respect the per-project `VerboseLogging` toggle: 120/240-char truncation when OFF, full content when ON. The structural fields (`selectorAttempts`, `variableContext`) are **not** gated — they are always full.

## Acceptance

- [ ] The implementation satisfies the `05 — Mandatory Failure Log` contract in this file and the folder-level acceptance target: every failure path emits the mandatory failure-log shape and user-visible feedback.
- [ ] Verification passes when `UT-fail-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
