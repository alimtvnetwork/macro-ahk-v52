# 02 — Host Submit Button

**Date:** 2026-06-02
**Task:** T62

## Contract

The host MUST provide a resolver returning the submit button element:

```ts
interface SubmitButtonResolver {
  /** Returns the live submit button, or null if not present. */
  resolve(): HTMLElement | null;
  /** Optional: returns true when the button is in "enabled & ready" state. */
  isReady?(el: HTMLElement): boolean;
}
```

## Default resolver template

```ts
const target = ???; // HOST: submit / "Add to Tasks" button
// Example: document.querySelector('[data-testid="send-button"]') as HTMLElement | null;
```

## Click strategy

1. Verify `el.isConnected` and not `disabled` / `aria-disabled="true"`.
2. Scroll into view if off-viewport (`el.scrollIntoView({ block: "nearest" })`).
3. Dispatch a real `click()` (not synthetic MouseEvent unless host requires).
4. Record `lastClickAt` timestamp on the queue task for the busy/idle observer.

## Forbidden

- No global key dispatch as a substitute for clicking (Enter shortcuts vary per host).
- No `form.submit()` — bypasses host validators.

## Acceptance

- [ ] The implementation satisfies the `02 — Host Submit Button` contract in this file and the folder-level acceptance target: NextLoop submission, disabled-button handling, interruption, and cancellation behavior is deterministic.
- [ ] Verification passes when `E2E-next-001..005` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
