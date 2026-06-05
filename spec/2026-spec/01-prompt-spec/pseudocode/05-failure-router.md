# Pseudocode — Failure Router

```ts
function routeFailure(err: unknown, ctx: TaskContext): FailureReport {
  const code = classify(err); // one of reference/02-failure-reason-codes.md
  return {
    Reason: code,
    ReasonDetail: stringifySafe(err),
    SourceFile: ctx.sourceFile,
    Phase: ctx.phase,
    Error: serializeError(err),
    SelectorAttempts: ctx.selectorAttempts ?? [],
    VariableContext:  ctx.variableContext  ?? [],
    Timestamp: nowIso()
  };
}
```

Every `catch` path MUST call `logFailure(routeFailure(err, ctx))`; never swallow.

## Acceptance

- [ ] The implementation satisfies the `Pseudocode — Failure Router` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
