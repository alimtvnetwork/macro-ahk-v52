# T46 · Target resolution

**Created:** 2026-06-02

How the injector finds the ChatBox at runtime. The selector itself is
**host-supplied** (`Q1` in `00-overview.md`); this file defines how the
selector is consumed.

## Configured selector shape

The integrator stores a `ChatBoxLocator` in settings (T91):

```ts
export interface ChatBoxLocator {
  kind:      "xpath" | "css" | "id";
  expression: string;          // ??? supplied by integrator
  rootHint?:  "document" | "iframe" | "shadow"; // default: "document"
  iframeSelector?: string;     // required when rootHint === "iframe"
  shadowHost?:     string;     // CSS for the shadow-host element
}
```

Example placeholder shipped with the spec:

```json
{
  "kind": "xpath",
  "expression": "???",   /* HOST: chat-box editable element */
  "rootHint": "document"
}
```

## Resolution algorithm

1. **Select root** based on `rootHint`:
   - `document` → `document`.
   - `iframe` → `document.querySelector(iframeSelector).contentDocument`. Failure → `SelectorMissed` with `reason: "iframe-not-ready"`.
   - `shadow` → `document.querySelector(shadowHost).shadowRoot`. Failure → `SelectorMissed` with `reason: "shadow-host-missing"`.
2. **Run the selector** within that root:
   - `xpath`: `document.evaluate(expr, root, …, FIRST_ORDERED_NODE_SNAPSHOT_TYPE, null)`.
   - `css`: `root.querySelector(expr)`.
   - `id`: `root.getElementById(expr)` (or `root.querySelector('#' + CSS.escape(expr))`).
3. **Validate the match**:
   - Must be a single `Element` (not text node).
   - Must be either a `<textarea>`, `<input type="text">`, or an
     element with `isContentEditable === true`, OR carry a known
     editor marker (ProseMirror/Lexical/Monaco — handled by T51–T55
     adapters).
   - Must be visible (`getClientRects().length > 0`).

## Failure logging

On any miss, emit a `SelectorAttempt` entry per the project failure-log
contract:

```ts
{
  id:           "chatbox",
  strategy:     locator.kind,
  expression:   locator.expression,
  matched:      false,
  matchCount:   0,
  reason:       "no-match" | "iframe-not-ready" | "shadow-host-missing"
              | "not-editable" | "not-visible"
}
```

A single retry-after-readiness probe (`MutationObserver` until first
hit, capped at **2 s**) is allowed; no exponential backoff
(`mem://constraints/no-retry-policy`).

## Multi-instance HostApps

If multiple ChatBoxes can coexist (e.g. tabbed conversations), the
locator MAY return more than one match; the integrator passes an
optional `anchorRect` to disambiguate (closest match wins). The
ambiguity itself is **not** an error.

## Acceptance

- [ ] The implementation satisfies the `T46 · Target resolution` contract in this file and the folder-level acceptance target: all supported paste strategies inject and verify prompt text without corrupting selection state.
- [ ] Verification passes when `UT-inject-001..008 and E2E-inject-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** resolve the target editor by walking `document.activeElement` → contenteditable ancestor → adapter from `07-editor-adapters/`; reject if none match within `TARGET_RESOLVE_TIMEOUT_MS` (250).
- **MUST** use the paste strategy returned by the adapter (`execCommand`, `InputEvent`, or `clipboardData`) — never branch on `userAgent`.
- **MUST** verify the paste landed by re-reading the editor content within `PASTE_VERIFY_TIMEOUT_MS` (150); mismatch throws `Reason="PasteMismatch"` with the full diff.
- **MUST** show the paste toast (`05-paste-toast.md`) for both success and failure; no silent paste.

## Pitfalls / Counter-examples

- ❌ Calling `execCommand("insertText")` in a host that strips it. ✅ Adapter probes capability once on mount; result cached per editor instance.
- ❌ Moving the caret to end-of-document after paste. ✅ Restore caret to the original selection range + insertion length.
- ❌ Treating an empty editor as "paste succeeded". ✅ Verify by reading text length pre/post.
- ❌ Swallowing `Reason="PasteMismatch"` to keep the UI quiet. ✅ Surface via toast + Logger.error.
- ❌ Retrying paste with a different strategy on failure. ✅ Fail fast; ask user to retry manually (no-retry policy).

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

