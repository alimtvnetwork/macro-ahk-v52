# Observability — Failure Log Schema

The canonical PascalCase shape, applied to **every** macro-engine failure. Mirrors the Core mandatory failure-log rule and the recorder/replay convention.

## Schema (`schemas/macro-failure.schema.json`)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "Reason", "ReasonDetail", "MacroSlug", "RunId", "TimestampKL",
    "VariableContext", "SelectorAttempts"
  ],
  "properties": {
    "Reason":          { "type": "string", "pattern": "^[A-Z][A-Za-z0-9]+$" },
    "ReasonDetail":    { "type": "string", "maxLength": 4096 },
    "MacroSlug":       { "type": "string" },
    "MacroVersion":    { "type": "integer", "minimum": 1 },
    "RunId":           { "type": "string", "pattern": "^[0-9a-f-]{36}$" },
    "StepIndex":       { "type": ["integer", "null"], "minimum": 0 },
    "StepKindId":      { "type": ["integer", "null"] },
    "LoopIteration":   { "type": ["integer", "null"], "minimum": 1 },
    "TimestampKL":     { "type": "string", "format": "date-time" },
    "TabId":           { "type": ["integer", "null"] },
    "TabUrl":          { "type": ["string", "null"] },
    "VariableContext": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "source", "row", "column", "resolvedValue", "type", "reason"],
        "properties": {
          "name":          { "type": "string" },
          "source":        { "type": ["string", "null"], "enum": ["Step", "Macro", "RunContext", "Default", null] },
          "row":           { "type": ["integer", "null"] },
          "column":        { "type": ["integer", "null"] },
          "resolvedValue": { "type": ["string", "number", "boolean", "object", "array", "null"] },
          "type":          { "type": "string", "enum": ["String", "Number", "Boolean", "Enum", "Json"] },
          "reason":        { "type": "string" }
        }
      }
    },
    "SelectorAttempts": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "strategy", "expression", "matched", "matchCount", "reason"],
        "properties": {
          "id":         { "type": "string" },
          "strategy":   { "type": "string", "enum": ["css", "xpath", "text", "data-attr", "aria"] },
          "expression": { "type": "string" },
          "matched":    { "type": "boolean" },
          "matchCount": { "type": "integer", "minimum": 0 },
          "reason":     { "type": "string" }
        }
      }
    },
    "StackFiltered":   { "type": ["string", "null"] },
    "CaughtError":     { "type": ["object", "null"] }
  }
}
```

## Required even when empty
- `VariableContext` and `SelectorAttempts` are **always arrays**, never omitted. Use `[]` when not applicable to the failure type.
- Per Core rule: when a field is unknown, log `null` + a `reason` string explaining why — never silently drop.

## Stack filtering
- `StackFiltered` is the result of `filterStack(rawStack)` per `mem://preferences/stack-trace-filtering` — chunk hashes removed, project paths preserved.

## Reason code registry
- Canonical list lives in `src/prompts/engine/reason-codes.ts` as a string-literal union type — no free-form strings allowed.
- Adding a code requires: (a) registry entry, (b) corresponding test, (c) entry in CHANGELOG.

## Validation
- Every `RunFailed` event's embedded `Failure` is validated against this schema **before** persistence. Validation failure of the failure log itself triggers a Logger.error with `Reason='FailureLogInvalid'` + the offending payload — never silently dropped.
