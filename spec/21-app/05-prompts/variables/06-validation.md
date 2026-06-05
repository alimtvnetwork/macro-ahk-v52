# Variable Validation & Failure-Log Shape

**Created:** 2026-06-02 ()

Two distinct validation phases run:

1. **Static** — at macro load / save time, via Ajv against
   `schemas/variable.schema.json` (Block 4 Task 36). Catches schema-level
   problems (duplicate Names, missing `EnumValues`, type mismatches between
   `Default` and `Type`, etc.).
2. **Run-time** — at render time, in the engine. Catches missing values,
   coercion failures, range/pattern violations, and injection attempts.

Both phases emit failures using the mandatory shape from
`mem://standards/verbose-logging-and-failure-diagnostics`.

## Static schema (excerpt)

```jsonc
{
  "$id": "https://riseup.asia/schemas/variable.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["Name", "Type"],
  "properties": {
    "Name":        { "type": "string", "pattern": "^[A-Za-z][A-Za-z0-9_]{0,39}$" },
    "Type":        { "enum": ["string", "integer", "number", "boolean", "enum", "path"] },
    "Required":    { "type": "boolean", "default": false },
    "Default":     {},
    "Description": { "type": "string", "maxLength": 200 },
    "EnumValues":  { "type": "array", "items": { "type": "string" }, "minItems": 1, "uniqueItems": true },
    "Min":         { "type": "number" },
    "Max":         { "type": "number" },
    "Pattern":     { "type": "string" },
    "Sensitive":   { "type": "boolean", "default": false }
  },
  "allOf": [
    { "if": { "properties": { "Type": { "const": "enum" } } }, "then": { "required": ["EnumValues"] } },
    { "if": { "properties": { "Type": { "enum": ["integer", "number"] } } },
      "then": { "not": { "required": ["Pattern"] } } },
    { "if": { "properties": { "Type": { "enum": ["string", "path"] } } },
      "then": { "not": { "anyOf": [ { "required": ["Min"] }, { "required": ["Max"] } ] } } }
  ]
}
```

The full schema is authored in Block 4 Task 36; this excerpt is normative
for the shape and conditionals.

## Run-time check order

For each declared variable, in order, the engine performs:

1. **Resolution** — walk tiers 1 → 5. If unresolved and `Required`, fail
   `MissingVariable`.
2. **Coercion** — apply `Type` coercion per `04-types.md`. Fail
   `VariableTypeMismatch` on coercion error.
3. **Range** — for `integer` / `number`, check `Min` / `Max` inclusive. Fail
   `VariableTypeMismatch` on out-of-range.
4. **Pattern** — for `string` / `path`, test against `Pattern` (compiled with
   `u`). Fail `VariableTypeMismatch` on mismatch.
5. **Enum** — for `enum`, check membership of `EnumValues`. Fail
   `VariableTypeMismatch` on miss.
6. **Path sandbox** — for `path`, run the 5-rule check from `04-types.md`.
   Fail `VariableTypeMismatch` on violation.
7. **Injection guard** — after first-pass interpolation, scan the rendered
   body for any remaining `{{ … }}`. Fail `VariableInjection` if found.

Steps 1–6 run **per variable**; step 7 runs once on the assembled body.

## Failure-log shape

```ts
type VariableFailureLog = {
  RunId: string;
  Step: number;
  Kind: string;
  Reason: "MissingVariable" | "VariableTypeMismatch" | "VariableInjection"
        | "ReservedVariable" | "DuplicateVariable" | "MacroSchemaViolation";
  ReasonDetail: string;
  SelectorAttempts: null;          // always null for variable failures, paired with reason
  VariableContext: VariableContext[];   // never null, never empty
  At: string;
};

type VariableContext = {
  name: string;
  source: "step" | "macro" | "context" | "default" | "missing";
  resolvedValue: string | number | boolean | null;   // null for missing / masked Sensitive
  type: "string" | "integer" | "number" | "boolean" | "enum" | "path";
  reason: string;                  // "ok" | "coerce failed" | "out of range" | …
};
```

- **Every** declared variable for the current step appears in
  `VariableContext[]` — not just the one that failed. This lets the operator
  see the full resolution snapshot at the moment of failure.
- `SelectorAttempts` is **always** `null` for variable failures; the field
  must still exist (don't omit it) — paired with the reason
  `"NotApplicable — variable failure"` documented in `05-failure-modes.md`.

## Worked log

```json
{
  "RunId": "spec-tighten-cycle-20260602-094312",
  "Step": 3,
  "Kind": "audit",
  "Reason": "VariableTypeMismatch",
  "ReasonDetail": "Variable 'Depth' resolved to 9 which exceeds Max=8.",
  "SelectorAttempts": null,
  "VariableContext": [
    { "name": "TargetFolder", "source": "step",    "resolvedValue": "spec/21-app", "type": "path",    "reason": "ok" },
    { "name": "Depth",        "source": "step",    "resolvedValue": 9,             "type": "integer", "reason": "out of range (Max=8)" },
    { "name": "RunId",        "source": "context", "resolvedValue": "spec-tighten-cycle-20260602-094312", "type": "string",  "reason": "ok" }
  ],
  "At": "2026-06-02T09:45:01+08:00"
}
```

## No retry

Per `mem://constraints/no-retry-policy`: a variable failure terminates the
step (and the run) immediately. The engine MUST NOT auto-substitute the
default and retry — that would mask real misconfiguration.
