# Variable Types — Supported `Type` Values & Coercion

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Six `Type` values are supported. Anything else fails schema validation with
`Reason="MacroSchemaViolation"`.

## Type table

| Type      | JS shape                   | Coercion rules                                                          | Render form              |
|-----------|----------------------------|-------------------------------------------------------------------------|--------------------------|
| `string`  | `string`                   | Numbers / booleans → `String(x)`. `null`/`undefined` → fail-fast.       | verbatim                 |
| `integer` | `number` (no fractional)   | `"42"` → `42`. `42.0` → `42`. `42.5` / `"abc"` → fail.                  | `String(value)`          |
| `number`  | `number` (finite)          | `"3.14"` → `3.14`. `NaN` / `Infinity` → fail.                           | `String(value)`          |
| `boolean` | `boolean`                  | `"true"` / `"1"` / `1` → `true`. `"false"` / `"0"` / `0` → `false`.     | `"true"` or `"false"`    |
| `enum`    | `string` in `EnumValues`   | No coercion — must already be a string and member of `EnumValues`.      | verbatim                 |
| `path`    | `string` (repo-relative)   | Trims trailing `/`. Rejects `..`, absolute paths, forbidden folders.    | verbatim                 |

## Coercion is one-way

Coercion happens **at resolution time**, not at storage. A value supplied as
the string `"42"` for an `integer` variable is normalised to the number `42`
before substitution and before any `Min` / `Max` check.

If coercion fails, the engine logs:

```json
{
  "Reason": "VariableTypeMismatch",
  "ReasonDetail": "Variable 'Depth' (Type=integer) received \"abc\" which cannot coerce to integer.",
  "VariableContext": [
    { "name": "Depth", "source": "step", "resolvedValue": "abc", "type": "integer", "reason": "coerce failed" }
  ]
}
```

## `path` extra rules

A `path` value must satisfy **all** of:

1. Non-empty after trim.
2. Not absolute (`/foo`, `C:\foo`, `\\server\share` all rejected).
3. No `..` segment after normalisation.
4. First segment ∉ `{ skipped, .release, node_modules, dist }`.
5. Matches `Pattern` if declared.

Path values are normalised to forward slashes (`/`) regardless of host OS.

## `enum` extra rules

- `EnumValues` is the **closed set**. Even a coerced match is rejected if the
  resolved value isn't in the list.
- Comparison is case-sensitive.
- If `Default` is declared, it MUST be in `EnumValues` (enforced at schema
  validation, not at run-time).

## `boolean` truthiness

Only the listed strings (`"true"`/`"false"`/`"1"`/`"0"`) and the numbers
`0` / `1` coerce. `"yes"` / `"no"` / `""` / `"True"` are **not** valid —
authors choose strict over forgiving to keep macro behaviour deterministic.

## Render form for non-string types

When a non-string value is substituted into a markdown body, the engine uses
`String(value)`. Examples:

| Type    | Value      | Rendered     |
|---------|------------|--------------|
| integer | `42`       | `42`         |
| number  | `3.14`     | `3.14`       |
| boolean | `true`     | `true`       |
| boolean | `false`    | `false`      |

No locale-aware formatting (no thousands separators, no scientific notation).
Authors who need different formatting should declare the variable as
`string` and pre-format upstream.
