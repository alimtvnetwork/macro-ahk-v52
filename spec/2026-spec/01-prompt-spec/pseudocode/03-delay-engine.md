# Pseudocode — Delay Engine

```ts
function computeDelay(taskIndex: number, settings: Settings): number {
  if (taskIndex === 0 && settings.skipFirstDelay) return 0;
  const jitter = Math.floor(Math.random() * settings.jitterMs);
  return Math.max(0, settings.delayMs + jitter);
}

async function waitWithPauseSupport(ms: number, signal: AbortSignal) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (signal.aborted) throw new AbortError("delay.cancelled");
    if (state.paused) { await waitForResume(signal); continue; }
    await sleep(50); // tick granularity
  }
}
```

Defaults live in `reference/05-runtime-defaults.md`.

## Acceptance

- [ ] The implementation satisfies the `Pseudocode — Delay Engine` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
