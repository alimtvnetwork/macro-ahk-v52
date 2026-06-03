# T36 · Loader interface

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

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
