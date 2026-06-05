# Variable Declaration — `info.json` Schema

**Created:** 2026-06-02 ()

Each prompt or macro-prompt declares its variables in its `info.json`
`Variables[]` array. The array MAY be empty (prompt has no placeholders) or
omitted entirely. If present, every entry MUST satisfy the shape below.

## Shape

```ts
type VariableDeclaration = {
  Name:         string;     // /^[A-Za-z][A-Za-z0-9_]*$/, max 40 chars
  Type:         "string" | "integer" | "number" | "boolean" | "enum" | "path";
  Required:     boolean;    // default false
  Default?:     string | number | boolean;  // type must match Type
  Description?: string;     // max 200 chars, shown in variable dialog
  EnumValues?:  string[];   // required iff Type === "enum"; non-empty, unique
  Min?:         number;     // integer / number only
  Max?:         number;     // integer / number only
  Pattern?:     string;     // string / path only; ECMAScript regex source
  Sensitive?:   boolean;    // default false — masks value in logs / exports
};
```

## Rules

1. **Name uniqueness** — within a single `Variables[]` array, Names are unique.
   Duplicate → `Reason="DuplicateVariable"`.
2. **Reserved names** — `RunId`, `Now`, `LoopCount`, `LastScore`,
   `TargetScore`, `MaxLoops`, `MacroSlug`, `Status` are reserved for the
   built-in run context. Declaring them →
   `Reason="ReservedVariable"`.
3. **Default ⇒ not Required** — if `Default` is present, `Required` may be
   `false`; the engine substitutes `Default` when no caller-supplied value
   exists. If `Required: true`, `Default` is still allowed (it pre-fills the
   variable dialog but the user/macro must explicitly accept it).
4. **Enum** — `Type: "enum"` requires `EnumValues` (≥1 entry, unique strings).
   `Default` (if present) MUST be one of `EnumValues`.
5. **Min/Max** — only valid for `integer` / `number`. `Min <= Max`. Resolved
   values outside the range → `Reason="VariableTypeMismatch"`.
6. **Pattern** — only valid for `string` / `path`. Compiled with the `u` flag.
   Resolved values that fail the pattern → `Reason="VariableTypeMismatch"`.
7. **Path** — `Type: "path"` additionally enforces:
   - No leading `/` (must be repo-relative).
   - No `..` segments.
   - Not inside `skipped/`, `.release/`, `node_modules/`, `dist/`.
   Violations → `Reason="VariableTypeMismatch"`.
8. **Sensitive** — when `true`, the value is masked (`"***"`) in:
   - `MacroRunLog.*` entries
   - `00-run-manifest.json`
   - JSON Export bundles
   - Console / Logger output
   See `07-sensitive-masking.md` for the full redaction rules.

## Worked declarations

```json
{
  "Variables": [
    { "Name": "TargetFolder", "Type": "path",    "Required": true,  "Default": "spec/" },
    { "Name": "Depth",        "Type": "integer", "Required": true,  "Default": 3, "Min": 1, "Max": 8 },
    { "Name": "Mode",         "Type": "enum",    "Required": true,  "EnumValues": ["fast", "deep"], "Default": "fast" },
    { "Name": "ApiKey",       "Type": "string",  "Required": true,  "Sensitive": true, "Pattern": "^sk-[A-Za-z0-9]{20,}$" }
  ]
}
```

## Validation

The full Ajv schema lives at `schemas/variable.schema.json` (Block 4 Task 36)
and is referenced by both `schemas/prompt.schema.json` and
`schemas/macro.schema.json`. `additionalProperties: false` — unknown keys are
rejected at validation time, not silently ignored.

Validation failures emit `Reason="MacroSchemaViolation"` with the full Ajv
error trail (path, keyword, message) in `ReasonDetail`.
