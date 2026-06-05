# T50 · Paste toast

**Created:** 2026-06-02

A small, transient piece of UI feedback shown immediately after a
paste attempt. Required for accessibility (announced via `aria-live`,
T45) and useful for debugging selector drift.

## Shape

```ts
export interface PasteToast {
  kind:        "success" | "warning" | "error";
  title:       string;     // <= 40 chars
  detail?:     string;     // <= 120 chars
  durationMs:  number;     // default 2500 for success, 5000 for warning/error
}
```

## Mapping from outcomes

| Outcome (from T47–T49) | kind | title | detail |
|---|---|---|---|
| Paste + verification OK | `success` | `"Prompt inserted"` | omitted |
| Verification ok but adapter retried once | `success` | `"Prompt inserted"` | `"(retry succeeded)"` |
| `paste-rejected` (verification failed twice) | `error` | `"Paste failed"` | `<PromptError.reasonDetail>` |
| `SelectorMissed` from T46 | `error` | `"ChatBox not found"` | `"selector: <expression>"` (truncated) |
| `Logged-out` detected during paste (T81) | `warning` | `"Session expired"` | `"Sign in to continue"` |
| Queue mode, paste OK | `success` | `"<i> of <n> sent"` | omitted; one toast per task |

## Placement

- Anchored near the ChatBox, host-defined. Default suggestion:
  bottom-right of the viewport, 16 px from the edges.
- Stacks vertically when multiple toasts overlap (max 3 visible;
  oldest evicted).

## Behaviour

- Dismissed on click anywhere on the toast.
- Auto-dismissed after `durationMs`.
- `prefers-reduced-motion: reduce` ⇒ no slide animation, fade only.

## Suppression

Callers MAY pass `{ suppressToast: true }` to the injector. The Queue
engine sets this for all but the **first** and **last** tasks of a
NextLoop / PlanLoop run, to avoid spamming N toasts; intermediate
progress is conveyed by the dropdown's status badge instead.

## Logging cross-ref

The toast is **not** the failure log. The failure log (T49 §"Failure
logging") is still emitted on every `warning` / `error` toast, with
full `SelectorAttempts[]` / `VariableContext[]` per the project
contract. The toast is the user-facing surface; the log is the
operator-facing surface.

## Acceptance

- [ ] The implementation satisfies the `T50 · Paste toast` contract in this file and the folder-level acceptance target: all supported paste strategies inject and verify prompt text without corrupting selection state.
- [ ] Verification passes when `UT-inject-001..008 and E2E-inject-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.