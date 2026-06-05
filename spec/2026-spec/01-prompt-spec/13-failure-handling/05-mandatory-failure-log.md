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

## Pitfalls

- **Silent-failure counter-example:** do not write `catch { return; }` or `catch { status = failed; }`; every catch MUST log through the namespace logger and surface the failure record to the queue UI.
- **Code Red log-shape counter-example:** do not use empty arrays for missing diagnostics; use one synthetic entry with `reason` explaining why selector or variable context is unavailable.

## Acceptance

- [ ] The implementation satisfies the `05 — Mandatory Failure Log` contract in this file and the folder-level acceptance target: every failure path emits the mandatory failure-log shape and user-visible feedback.
- [ ] Verification passes when `UT-fail-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** assign every failure a stable `Reason` code from `reference/02-failure-reason-codes.md` plus a `ReasonDetail` string; missing codes are rejected by `check-must-constants.mjs`.
- **MUST** log via `Logger.error(scope, reason, caughtError)` — never bare `console.error`, never empty `catch {}`.
- **MUST** populate `SelectorAttempts[]` (id/strategy/expression/matched/matchCount/reason) on every selector miss; unknown fields written as `null` with a reason.
- **MUST** populate `VariableContext[]` (name/source/row/column/resolvedValue/type/reason) on every variable/data failure.

## Pitfalls / Counter-examples

- ❌ `catch (e) { /* TODO */ }`. ✅ Rejected by `public/error-swallow-audit.json`.
- ❌ Logging only the message string. ✅ Pass the `caught` object so stack + cause survive.
- ❌ Omitting `SelectorAttempts` because "only one selector was tried". ✅ Still log the single attempt with `matchCount=0`.
- ❌ Masking the user value in `VariableContext` by default. ✅ Always log the field name + type; mask the value only when verbose-logging is OFF.
- ❌ Retrying after `Reason="HostBlocked"`. ✅ Surface to user; require manual unblock.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../README.md) for sibling specs and cross-references.

## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
