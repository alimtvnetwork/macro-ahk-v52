---
name: prompt-variables
description: Variable system for prompt-macros — Mustache-lite {{ Var }} interpolation with typed declarations, 5-tier resolution waterfall, sensitive-value masking
type: feature
---

# Prompt Variables

Variables let one prompt describe a **shape of work**; the macro fills specifics at run-time. A variable swaps a **noun**, never a **verb**.

## Syntax

- Token: `{{ VarName }}` (Mustache-lite — no logic, no helpers, no nesting)
- Whitespace around name is optional and ignored
- Unknown variable → run aborts with `Reason='UndeclaredVariable'`
- Unresolved required variable → run aborts with `Reason='MissingVariable'`

## Declaration (`info.json`)

```json
{
  "Variables": [
    { "Name": "TargetFolder", "Type": "string",  "Default": "spec/", "Required": true },
    { "Name": "Depth",        "Type": "integer", "Default": 3,        "Required": true, "Min": 1, "Max": 10 },
    { "Name": "ApiToken",     "Type": "string",  "Sensitive": true,   "Required": true }
  ]
}
```

## Types

`string` | `integer` | `number` | `boolean` | `enum` (with `Values`) | `path` (validated against allowed roots).

## Resolution waterfall (5 tiers, first hit wins)

1. **Step-scoped override** (`Step.Variables[Name]`)
2. **Macro-scoped variable** (set by `set-var`)
3. **UI-prompt input** (variable-input-dialog)
4. **Built-in context** (`RunId`, `Now`, `TabId`, `WorkspaceId`, etc.)
5. **`Default`** from declaration

## Sensitive masking

- `Sensitive: true` → value replaced with `***` in logs, audit files, and event stream
- Auto-masked field-name patterns: `/password|token|secret|api[_-]?key|bearer/i`
- Verbose logging gate does NOT override masking — sensitive stays masked even with `Project.VerboseLogging=true`

## Built-in context (read-only)

| Name | Type | Source |
|---|---|---|
| `RunId` | string | `crypto.randomUUID()` at macro start |
| `Now` | string | UTC ISO-8601 |
| `TabId` | integer | tab the macro is bound to |
| `WorkspaceId` | string | active workspace at start |
| `UserId` | string | from `getBearerToken()` claims |
| `StepIndex` | integer | current 0-based step index |
| `LoopIteration` | integer | 0-based loop counter |

## Canonical references

- Spec: `spec/21-app/05-prompts/variables/` (10 files + README)
- Grammar BNF: `spec/21-app/05-prompts/variables/10-grammar-bnf.md`
- Sensitive patterns: `spec/21-app/05-prompts/variables/13-sensitive-patterns.md`
- Injection guard: `spec/21-app/05-prompts/macros/guards/04-variable-injection-safety.md`
