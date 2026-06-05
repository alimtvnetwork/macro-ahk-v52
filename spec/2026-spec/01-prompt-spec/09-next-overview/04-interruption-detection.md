# 04 — Interruption Detection

**Date:** 2026-06-02
**Task:** T64

## Purpose

After clicking submit, the engine must detect **(a)** when the host finishes processing and **(b)** when the host shows an interruption surface (e.g. "Return to chat", quota banner, login wall) that should pause the queue.

## Host contract

```ts
interface BusyIdleObserver {
  /** Resolves when the host is idle and ready for the next prompt. */
  whenIdle(opts: { timeoutMs: number }): Promise<IdleResult>;
}

type IdleResult =
  | { kind: "Idle" }
  | { kind: "Interrupted"; detail: string }
  | { kind: "Timeout" };
```

## Default detection template

```ts
const interruptionBanner = ???; // HOST: interruption / "return to chat" banner
// Example: document.querySelector('[role="alert"][data-kind="resume"]');
```

## Detection signals (combine, first-match wins)

1. **DOM mutation** — submit button re-enables → `Idle`.
2. **Interruption banner present** → `Interrupted`.
3. **Network listener** (optional) — 401/403 → `Interrupted { detail: "Unauthorized" }`.
4. **Timeout** — `timeoutMs` elapsed (default 120000) → `Timeout`.

## Pause semantics

`Interrupted` puts the queue into `hold` status (not `failed`) so the user can resolve and resume manually. `Timeout` and signal failures escalate to `failed` per `100-failure-handling/`.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.
