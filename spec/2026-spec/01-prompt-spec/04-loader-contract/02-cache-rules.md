# T37 · Cache rules

**Created:** 2026-06-02

The loader owns exactly one cache: the merged prompt list produced by
`loadAll()`. No partial / per-prompt caching — keeps invalidation trivial.

## Cache key

A single conceptual key: `"prompts:all"`. There is no per-category or
per-slug cache.

## Population

- First `loadAll()` call fetches from the `PromptStore`, applies the
  default/user merge, sorts, and stores the resulting array.
- Subsequent calls within the same process return the cached array
  (a shallow copy) without touching the store.

## Invalidation triggers (loader MUST drop the cache when any fires)

| # | Trigger | Source |
|---|---|---|
| I1 | Explicit `loader.invalidate()` call | UI "Reload prompts" button, tests |
| I2 | `PromptStore.onChange({kind: "saved"\|"deleted"\|"imported"})` | Any successful write |
| I3 | The on-disk reference corpus's mtime advanced (file-backed stores only) | Optional polling / fs.watch |
| I4 | HostApp signals it has reloaded the defaults bundle | Integrator hook (e.g. after extension update) |

No timer-based / TTL invalidation. The cache is valid until something
real changes.

## Concurrency

- A pending `loadAll()` in flight when `invalidate()` is called:
  the in-flight promise is **discarded** (its result MUST NOT be cached),
  and the next caller triggers a fresh fetch.
- Two concurrent first-time callers share one fetch (single in-flight
  guarantee, T36).

## Manual reload UX

The UI SHOULD expose a "Reload prompts" affordance that calls
`invalidate()` followed by `loadAll()`. Helpful when the integrator
edits prompt files outside the app.

## Memory footprint

The cache holds at most one `Prompt[]` (typically < 100 records,
each < 64 KiB body — see T33). Total cap ~6 MiB worst case; no
eviction policy needed.

## Acceptance

- [ ] The implementation satisfies the `T37 · Cache rules` contract in this file and the folder-level acceptance target: loader calls return typed successes, typed errors, and bounded cache behavior.
- [ ] Verification passes when `UT-loader-001..012` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** expose the loader as `loadPrompts(): Promise<LoaderResult>` returning `{ prompts, categories, errors }` — never throw; surface errors in the result object.
- **MUST** populate `JsonCopy` + `HtmlCopy` IndexedDB caches in the same transaction; partial writes are rejected with `Reason="LoaderCacheSplit"`.
- **MUST** resolve every `{{var}}` placeholder via the variable resolver from `04-loader-contract/03-variable-resolution.md`; unresolved variables throw `Reason="VariableUnresolved"` with the full `VariableContext[]`.
- **MUST** invalidate caches by **manifest hash**, never by wall-clock; auto-load only on hash change.

## Pitfalls / Counter-examples

- ❌ `loadPrompts()` throws and the UI shows a blank dropdown. ✅ Return `LoaderResult.errors` and render an empty-state with the reason chip.
- ❌ Writing `JsonCopy` then awaiting before writing `HtmlCopy`. ✅ Single IndexedDB transaction; both succeed or both rollback.
- ❌ Silent `?? ""` for missing variables. ✅ Throw with full `VariableContext` (name/source/row/column/resolvedValue/type/reason).
- ❌ Polling the manifest every N seconds. ✅ Manual-load + hash-diff (see `mem://features/prompt-management`).
- ❌ Retrying a failed load with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

