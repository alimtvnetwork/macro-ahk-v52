# T28 · `PromptStore` interface

**Created:** 2026-06-02

The single seam between the Prompts feature and any persistence
backend. Integrators implement this; the rest of the spec only ever
calls these methods.

## TypeScript signature (reference)

```ts
export interface PromptStore {
  /** Return all prompts. Order is not guaranteed; callers sort by category + order. */
  list(): Promise<Prompt[]>;

  /** Return a single prompt by id, or null if absent. */
  get(id: string): Promise<Prompt | null>;

  /** Return a single prompt by slug (case-insensitive), or null. */
  getBySlug(slug: string): Promise<Prompt | null>;

  /** Insert if `id` is absent; replace if present. Returns the persisted record. */
  save(prompt: Prompt): Promise<Prompt>;

  /** Hard-delete. Refuses when prompt.isDefault === true (caller must hide instead). */
  delete(id: string): Promise<void>;

  /** Bulk import; conflicts resolved by `mode`. */
  importMany(prompts: Prompt[], mode: "skip" | "replace" | "rename"): Promise<ImportReport>;

  /** Export everything, or just a subset by id. */
  exportMany(ids?: string[]): Promise<Prompt[]>;

  /** Fired after any write so the loader can invalidate its cache. */
  onChange(listener: (change: StoreChange) => void): Unsubscribe;
}

export type StoreChange =
  | { kind: "saved"; prompt: Prompt }
  | { kind: "deleted"; id: string }
  | { kind: "imported"; count: number };

export interface ImportReport {
  imported: number;
  skipped: number;
  renamed: { from: string; to: string }[];
}

export type Unsubscribe = () => void;
```

## Behaviour contract

1. **Atomicity**: `save` and `delete` are atomic per-record; partial writes are not allowed to surface via `list`.
2. **No silent loss**: a failed write MUST reject the returned promise with a typed error (see `04-loader-contract/04-error-modes.md`).
3. **Defaults are read-only**: any `save` call that mutates a record with `isDefault === true` must succeed only when `Prompt.slug` is preserved; any `delete` on a default record MUST reject with `DefaultPromptImmutable`.
4. **Slug uniqueness**: implementations MUST reject a `save` whose slug collides with an existing record of a different `id`, with `SlugCollision`.
5. **Change events**: emitted **after** the write is durable, never before.

## Allowed implementations (non-exhaustive)

- In-memory `Map` (tests, ephemeral mode).
- Browser `localStorage` (single JSON blob keyed `prompts.v1`).
- Browser `IndexedDB` (one object store keyed by `id`).
- File system (`prompts/<NN>-<slug>/{info.json,prompt.md}` per `03-prompt-source-format/`).
- Remote HTTP (`GET /prompts`, `PUT /prompts/{id}`, …).

The Prompts feature MUST NOT know which one is in use.

## Acceptance

- [ ] The implementation satisfies the `T28 · PromptStore interface` contract in this file and the folder-level acceptance target: Prompt, PromptCategory, and PromptStore contracts hold across storage implementations.
- [ ] Verification passes when `UT-data-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
