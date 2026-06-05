# 05 — Next-loop orchestrator reference

**Date:** 2026-06-02
**Task:** T115

```ts
import type { Prompt } from "../02-data-model";
import type { EditorAdapter } from "../07-editor-adapters";
import type { QueuedTask } from "../10-queue-model";
import { createQueueEngine } from "./02-queue-engine";

export interface NextLoopHost {
  resolveChatBox: () => HTMLElement | null;        // Q1
  resolveSubmitButton: () => HTMLButtonElement | null; // Q2
  detectInterruption: () => Promise<void>;         // Q3
  isAuthenticated: () => Promise<boolean>;         // Q5
  adapters: EditorAdapter[];
}

export function createNextLoop(host: NextLoopHost, store: any /* QueueStore */) {
  const engine = createQueueEngine({
    store,
    isAuthenticated: host.isAuthenticated,
    watchInterruption: host.detectInterruption,
    delayMs: () => 5000 + Math.floor(Math.random() * 5000), // Q6 5–10 s
    skipFirstDelay: true,
    runTask: async (t: QueuedTask) => {
      const box = host.resolveChatBox();
      if (!box) throw new Error("ChatBoxMissing");
      const adapter = host.adapters.find((a) => a.match(box));
      if (!adapter) throw new Error("NoAdapter");
      const ok = await adapter.paste(box, t.body, "replace");
      if (!ok) throw new Error("PasteRejected");

      const btn = host.resolveSubmitButton();
      if (!btn || btn.disabled) throw new Error("SubmitMissing");
      btn.click();
    },
  });

  return {
    enqueueRepeat: (prompt: Prompt, count: number) =>
      engine.enqueueBulk(
        Array.from({ length: Math.min(count, 999) }, (_, i) => ({
          id: `${prompt.id}-${Date.now()}-${i}`,
          kind: "next",
          body: prompt.body,
          status: "pending",
          retryCount: 0,
          createdAt: new Date().toISOString(),
        })),
      ),
    start:  engine.start,
    pause:  engine.pause,
    resume: engine.resume,
    cancel: engine.cancel,
  };
}
```

**Notes**
- Orchestrator stays small; all decisions delegated to the host hooks and adapters.
- Errors are strings → engine maps to `Reason` codes in the failure log.
- 999 cap matches Q7.

## Acceptance

- [ ] The implementation satisfies the `05 — Next-loop orchestrator reference` contract in this file and the folder-level acceptance target: reference snippets remain copyable and typecheck without hidden imports.
- [ ] Verification passes when `typecheck-spec-snippets.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

