# T36 · Loader interface

**Created:** 2026-06-02

`PromptLoader` is the read-through layer between the UI and the
`PromptStore`. It owns caching, variable resolution, and error
classification — never persistence.

## TypeScript signature (reference)

```ts
export interface PromptLoader {
  /**
   * Return all prompts ready for display, with defaults+user merged
   * per `03-prompt-source-format/04-default-vs-user-prompts.md`.
   * Cached; see T37 for invalidation rules.
   */
  loadAll(): Promise<Prompt[]>;

  /** Convenience: single prompt by slug. */
  getBySlug(slug: string): Promise<Prompt | null>;

  /**
   * Return the prompt's `body` with all `{{var}}` placeholders
   * resolved using the supplied context. See T38 for resolution order.
   */
  render(slug: string, ctx: PromptContext): Promise<string>;

  /** Drop the cache; next `loadAll` re-reads from the store. */
  invalidate(): void;

  /**
   * Subscribe to loader-level events (cache invalidated, load failed,
   * variable unresolved, etc.). See `130-observability/`.
   */
  on(event: LoaderEvent, listener: (payload: LoaderEventPayload) => void): Unsubscribe;
}

export interface PromptContext {
  /** Free-form variables supplied by the caller (highest precedence). */
  vars: Record<string, string>;
  /** Optional override of built-in `{{date}}` / `{{time}}` clocks. */
  now?: Date;
  /** Optional ChatBox text snapshot for `{{selection}}` / `{{cursor}}`. */
  editor?: { selection: string; before: string; after: string };
}
```

## Behaviour contract

1. **No write side-effects** — the loader never mutates the store.
2. **Single in-flight `loadAll`** — concurrent callers share the same
   pending promise; no thundering-herd reads.
3. **Returns a fresh array** on every call (callers may sort/filter
   in place safely).
4. **`render` is pure** for a given `(prompt, ctx)` pair; same inputs
   → identical output.
5. Errors are typed (T39). Never throw plain `Error` from the public surface.

## Acceptance

- [ ] The implementation satisfies the `T36 · Loader interface` contract in this file and the folder-level acceptance target: loader calls return typed successes, typed errors, and bounded cache behavior.
- [ ] Verification passes when `UT-loader-001..012` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Dynamic script loading](mem://architecture/dynamic-script-loading) for the authoritative rule backing the MUST/SHALL statements in this file.
