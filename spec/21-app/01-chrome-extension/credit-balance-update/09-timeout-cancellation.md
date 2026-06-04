# 09 — Timeout & Cancellation

The 3 s (configurable) budget MUST be enforced via `AbortController`.

```ts
async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new TimeoutError(timeoutMs)), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
        clearTimeout(timer);
    }
}
```

## Rules

- Every fetch in this module MUST go through `fetchWithTimeout`.
- On `AbortError`, the controller resolves with
  `CreditFetchOutcome.Timeout` (never throws to UI).
- The cached value (if any, regardless of TTL) is returned alongside the
  Timeout outcome so the UI can show the last-known value with an amber dot.
- Timer is paired with a `clearTimeout` in `finally` (memory
  `mem://standards/timer-and-observer-teardown`).
- `document.hidden` does NOT pause the fetch (one-shot, not a tick loop).
