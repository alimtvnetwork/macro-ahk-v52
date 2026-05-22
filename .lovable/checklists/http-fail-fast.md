# HTTP Fail-Fast (HEFF) — Agent Checklist

Use this checklist EVERY time you write, review, or refactor code that
calls `fetch()`, `XMLHttpRequest`, or any HTTP-bearing SDK in this repo.

Source of truth:
- Spec: `spec/03-error-manage/01-error-resolution/05-http-error-fail-fast.md`
- Memory: `mem://constraints/http-error-fail-fast`
- Helper: `src/shared/http-fail-fast.ts`
- Plan: `.lovable/plans/http-fail-fast-10-step.md`
- Lint guard: `scripts/lint/no-bare-fetch.mjs` (wired into prebuild)
- UI banner: `src/components/HttpFailFastBanner.tsx`
- Verifier: `scripts/verify-http-fail-fast.mjs`

---

## Hard rules (non-negotiable)

1. **No bare `fetch()`**. Every `fetch()` MUST either:
   - be wrapped by `httpFetchOrThrow(url, init)`, OR
   - be immediately followed by `await httpFailFast(res, { method, url })`, OR
   - check `res.ok` and `throw` on the same logical branch.
2. **No retry on HTTP failure**. No `for`, `while`, `setTimeout`, recursion,
   exponential backoff, or method-swap on 4xx/5xx. One attempt, then throw.
   See `mem://constraints/no-retry-policy`.
3. **No fan-out follow-ups**. After a non-2xx response, do NOT call
   `Promise.all` / `Promise.allSettled` siblings. Halt the loop.
4. **HEFF report shape (mandatory)**: every surfaced failure string MUST be:
   ```
   HTTP <status> on <METHOD> <url>
   Body: <snippet|null>
   Reason: <human reason>
   Loop halted. Awaiting user instruction.
   ```
   Use `HttpFailFastError.toReportString()` — do NOT hand-format.
5. **UI surfacing is automatic**. Throwing `HttpFailFastError` in a UI
   context dispatches `marco:http-fail-fast`; the banner picks it up.
   Do NOT add ad-hoc toasts for HTTP failures.

---

## Pre-write checklist

Before adding ANY new HTTP call:

- [ ] Is this caller agent-driven? (If yes, HEFF applies. Background SW,
      content scripts, options/popup all qualify.)
- [ ] Will I need the response body? Choose:
      - `httpFetchOrThrow(url, init)` → returns checked Response
      - `fetch(url, init)` + `await httpFailFast(res, { method, url })`
- [ ] Am I inside a loop, `Promise.all`, or fanout? If yes, ensure the
      first throw HALTS remaining iterations (`break` / sequential
      `for...of` / re-throw, never `.catch(() => continue)`).
- [ ] Did I add a no-retry comment if the call lives next to a timer or
      polling interval, to prevent regressions?

## Post-write checklist

- [ ] `bunx tsc --noEmit` clean.
- [ ] `node scripts/lint/no-bare-fetch.mjs` clean (also runs in prebuild).
- [ ] `node scripts/verify-http-fail-fast.mjs` clean for the touched
      modules.
- [ ] Searched the file for `.catch(` swallowing `HttpFailFastError` —
      none allowed unless paired with `Logger.error()` AND re-throw.
- [ ] No new `setTimeout(..., backoffMs)` near the call site.

## Review checklist (when reading PRs / generated diffs)

- [ ] Every new `fetch(` in the diff has a sibling `httpFailFast` /
      `httpFetchOrThrow` / `res.ok` check.
- [ ] Failure path uses `Logger.error(scope, message, caught)` with the
      HEFF report string as `message` — never bare `console.log`.
- [ ] No silent `.catch(() => null)` over an HTTP call.
- [ ] No `MAX_RETRIES`, no `attempt < N`, no `await sleep(... * 2 ** i)`
      patterns introduced.
- [ ] UI-side callers do NOT add custom toasts — the global
      `HttpFailFastBanner` already surfaces failures.

---

## Quick reference

```ts
import { httpFetchOrThrow, httpFailFast, HttpFailFastError } from "@/shared/http-fail-fast";

// Option A — preferred for the common case
const res = await httpFetchOrThrow(url);
const body = await res.json();

// Option B — when you need init or to inspect Response before check
const raw = await fetch(url, { method: "POST", body });
await httpFailFast(raw, { method: "POST", url });
const body = await raw.json();

// Catching at a boundary (logging + re-throw, NEVER swallow)
try {
  await doHttpWork();
} catch (caught) {
  if (caught instanceof HttpFailFastError) {
    RiseupAsiaMacroExt.Logger.error("scope.doHttpWork", caught.toReportString(), caught);
  }
  throw caught;
}
```

---

## Anti-patterns (auto-reject)

```ts
// ❌ bare fetch, no check
const res = await fetch(url);
return res.json();

// ❌ retry loop on HTTP failure
for (let i = 0; i < 3; i++) {
  const r = await fetch(url);
  if (r.ok) return r.json();
  await sleep(1000 * 2 ** i);
}

// ❌ method-swap fallback
let r = await fetch(url, { method: "HEAD" });
if (!r.ok) r = await fetch(url, { method: "GET" });

// ❌ fanout that continues after first failure
const results = await Promise.allSettled(urls.map(u => fetch(u)));

// ❌ silent swallow
fetch(url).catch(() => null);
```
