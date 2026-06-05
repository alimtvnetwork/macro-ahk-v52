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