# Type Coercion Table

The interpolator coerces resolved raw values to the declared type **before** substitution.

| Declared `Type` | Raw → Accepted | Rendered as | Rejection reason |
|---|---|---|---|
| `string` | any JsonValue | `String(raw)` | never (always coercible) |
| `integer` | number with no fraction; numeric string | decimal | `VarTypeMismatch` if `!Number.isInteger(Number(raw))` |
| `number` | any numeric / numeric string | decimal | `VarTypeMismatch` if `Number.isNaN(Number(raw))` |
| `boolean` | `true`, `false`, `"true"`, `"false"`, `1`, `0` | `"true"` / `"false"` | `VarTypeMismatch` otherwise |
| `enum` | value ∈ `decl.Values` | `String(raw)` | `VarEnumMismatch` if not in list |
| `path` | string matching `^[A-Za-z0-9_./-]+$` AND inside allowed roots | `String(raw)` | `VarPathUnsafe` otherwise |

## Allowed path roots (default)

`spec/`, `src/`, `docs/`, `standalone-scripts/`, `.lovable/`, `public/`. Override via `Project.AllowedPathRoots`.

## Min / Max

For `integer` and `number`:
- `Min` (inclusive) — violation → `VarOutOfRange`
- `Max` (inclusive) — violation → `VarOutOfRange`

For `string` length checks, use `MinLen` / `MaxLen` instead.

## Boolean stringification gotcha

`boolean` types render as the literal string `"true"` or `"false"` in templates. Authors who need conditional wording should use an `enum` variable with `Values: ["yes", "no"]` instead.
