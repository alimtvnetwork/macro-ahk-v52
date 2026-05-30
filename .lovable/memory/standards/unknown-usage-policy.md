## Policy: No Explicit `unknown` in Code

### Rule 1 — Function Parameters Must Use Designed Types
Every function parameter must use the actual designed type or `Partial<T>` of it. `unknown` in function parameters is prohibited as it signifies an undefined contract for designed shapes (config, theme, API response).

### Rule 2 — CaughtError Type (sole `unknown` entry point)
A single reusable type in `error-utils.ts` handles all caught values:
`export type CaughtError = unknown;`
All `catch` blocks use bare `catch (e)` and delegate to `logError(fn, msg, e)` or `toErrorMessage(e)`.

### Rule 3 — MergeableRecord Type (replaces `Record<string, unknown>`)
For generic object merging/validation, use the `MergeableRecord` type defined in `config-validator.ts` which restricts keys to primitives and non-recursive records.

### Rule 4 — `unknown` Restrictions
`unknown` is only permitted in the `CaughtError` definition, generic constraints (e.g., `A extends unknown[]`), and `() => unknown` return types.

### Rule 5 — Macro Controller Status: Fully Typed
The macro-controller source has **zero** `Record<string, unknown>` usage; all instances are replaced with semantic types in `types/api-data-types.ts`. Only one unavoidable `as unknown as` cast remains for class-to-interface bridging in `core/MacroController.ts`. Window globals must be declared in `globals.d.ts` rather than casted.
