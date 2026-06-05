# 05 — Pause During Delay

**Date:** 2026-06-02
**Task:** T80

## Requirement

`pause()` and `cancelAll()` MUST interrupt an in-flight delay timer immediately. A `setTimeout` left to expire would force the user to wait up to the active `DELAY_MS` range before seeing the queue stop.

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

## Acceptance

- [ ] The implementation satisfies the `05 — Pause During Delay` contract in this file and the folder-level acceptance target: default delay, settings, jitter, skip-first, and pause semantics use runtime defaults.
- [ ] Verification passes when `UT-delay-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind `DELAY_MS`, `JITTER_MS`, `SKIP_FIRST_DELAY` to `reference/05-runtime-defaults.md`; settings UI MUST clamp to declared min/max.
- **MUST** compute jitter as `DELAY_MS + randInt(-JITTER_MS, +JITTER_MS)` with `Math.random()` seeded by `crypto.getRandomValues` when available.
- **MUST** honour `SKIP_FIRST_DELAY=true` by emitting the first prompt with zero delay; subsequent prompts apply the full delay+jitter.
- **MUST** pause the delay timer when `pauseRequested=true` and resume from the remaining ms — never restart from zero.

## Pitfalls / Counter-examples

- ❌ `setTimeout(fn, DELAY_MS)` with no `clearTimeout` on cancel. ✅ Pair with teardown (see `mem://standards/timer-and-observer-teardown`).
- ❌ Jitter that can produce negative delays. ✅ `Math.max(0, DELAY_MS + jitter)`.
- ❌ Restarting the delay on pause/resume. ✅ Track `remainingMs` at pause; resume schedules `remainingMs`.
- ❌ Hardcoding 1500ms inline. ✅ Import the named constant.
- ❌ Adding exponential backoff on send failure. ✅ Fail fast; surface to user (no-retry policy).

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

