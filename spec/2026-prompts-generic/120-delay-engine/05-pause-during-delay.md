# 05 — Pause During Delay

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T80

## Requirement

`pause()` and `cancelAll()` MUST interrupt an in-flight delay timer immediately. A `setTimeout` left to expire would force the user to wait up to 10s before seeing the queue stop.

## Implementation

```ts
class InterruptibleDelay {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private resolve: (() => void) | null = null;

  wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
      this.resolve = resolve;
      this.timer = setTimeout(() => { this.cleanup(); resolve(); }, ms);
      signal.addEventListener("abort", () => {
        this.cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  }

  private cleanup() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.resolve = null;
  }
}
```

The engine owns a single `AbortController` for the active task; `pause()` aborts it, then re-creates one on resume.

## document.hidden handling

When `document.hidden` becomes true mid-delay:
- The timer keeps running (browsers throttle but do not stop `setTimeout`).
- The idle observer's `whenIdle` MUST NOT consume CPU on a hidden tab — adapters typically already pause their MutationObservers per Core memory (Timer & observer teardown).

## Teardown

On engine disposal: abort the active signal, `clearTimeout`, drop the resolver. Mirrors the project-wide timer-and-observer-teardown standard.
