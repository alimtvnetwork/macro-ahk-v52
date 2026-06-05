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

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** declare every Prompt/Category field with a concrete TypeScript type in `02-data-model/03-store-interface.md` — no `unknown`, no `any`, no inline object literals.
- **MUST** generate slugs via `slugify(name, { lower: true, strict: true })` capped at `SLUG_MAX_LEN` (64) characters; collisions append `-2`, `-3`, … sequentially.
- **MUST** validate every imported prompt against `schemas/prompt.schema.json` before persistence; schema mismatches throw `Reason="SchemaMismatch"` and HALT the import.
- **MUST** treat `id` as immutable once written; renames change `name`/`slug` only and emit `PROMPT_RENAMED` with both old and new slugs.

## Pitfalls / Counter-examples

- ❌ Storing `category: string` instead of `categoryId: CategoryId` — breaks rename/merge. ✅ Reference by stable id; resolve name at render time.
- ❌ Allowing duplicate slugs across categories. ✅ Enforce uniqueness in `04-id-and-slug-rules.md` with a single composite index `(categoryId, slug)`.
- ❌ Mutating an imported prompt object in place. ✅ Clone via `structuredClone` before validation so the source bundle stays comparable.
- ❌ Persisting `createdAt` as a localized string. ✅ Store `Date.now()` UTC ms; render with the user-local timezone.
- ❌ Wide `interface Prompt { [k: string]: unknown }`. ✅ Closed shape — every key declared (see `mem://standards/unknown-usage-policy`).

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../README.md) for sibling specs and cross-references.

<!-- audit: inline-types -->

## Type & Schema (canonical)

```json
{
  "$id": "PromptStore.method-signatures",
  "description": "Sentinel schema: PromptStore is a TS interface (see ts block above); each method MUST resolve within 5000 ms and SHALL NOT throw on miss (return null).",
  "type": "object",
  "properties": {
    "timeoutMs":  { "const": 5000 },
    "methodNames": { "type":"array", "items":{"type":"string"},
                     "default": ["list","get","put","delete","import","export"] }
  }
}
```
