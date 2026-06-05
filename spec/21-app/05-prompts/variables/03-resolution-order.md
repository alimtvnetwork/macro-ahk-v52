# Variable Resolution — 5-Tier Waterfall

**Created:** 2026-06-02 ()

When the engine renders a prompt body, every `{{ Name }}` placeholder is
resolved by walking five tiers in order. The first tier that yields a value
wins; ties cannot occur because each tier is a single map.

## The waterfall

| Tier | Source                              | Where it lives                                    |
|------|-------------------------------------|---------------------------------------------------|
| 1    | **Step-level** `Variables`          | `Step.Variables` in the macro definition          |
| 2    | **Macro-level** `Variables`         | `Macro.Variables` in the macro definition         |
| 3    | **Run context**                     | Engine-managed: `RunId`, `Now`, `LoopCount`, `LastScore`, `TargetScore`, `MaxLoops`, `MacroSlug`, `Status` |
| 4    | **Prompt `Default`**                | `Variables[].Default` in the prompt's `info.json` |
| 5    | **Fail-fast**                       | Raises `MissingVariable` if `Required: true`      |

If `Required: false` and tiers 1–4 all miss, the placeholder resolves to the
**empty string** `""` (rendered as nothing).

## Two-pass resolution

Tier 1 and Tier 2 values may themselves contain `{{ … }}` (commonly a
reference to the run context, e.g. `"{{ RunId }}"`). The engine renders in
two passes:

1. **Pass 1** — Resolve tiers 1 → 2 → 3 → 4 → 5 against the **raw template**;
   substitute.
2. **Pass 2** — Re-scan the result. If any `{{ … }}` remains, raise
   `Reason="VariableInjection"` with the offending span. This blocks
   user-supplied values from smuggling new placeholders into the body.

Macro-level and step-level values are themselves resolved in a **dedicated
pre-pass** (against tiers 2 → 3 → 4 only, since tier 1 is being computed)
before being handed to Pass 1.

## Worked walkthrough

Given:

```json
// Macro
{
  "Slug": "spec-tighten-cycle",
  "Variables": { "SpecRoot": "spec/" },
  "Steps": [
    { "Kind": "audit", "Slug": "audit-spec",
      "Variables": { "TargetFolder": "{{ SpecRoot }}/21-app" } }
  ]
}
```

```json
// Prompt info.json
{
  "Variables": [
    { "Name": "TargetFolder", "Type": "path",    "Required": true, "Default": "spec/" },
    { "Name": "Depth",        "Type": "integer", "Required": true, "Default": 3 }
  ]
}
```

```md
// Prompt body
Audit {{ TargetFolder }} to depth {{ Depth }} for run {{ RunId }}.
```

Resolution:

| Placeholder      | Tier hit | Resolved value                              |
|------------------|----------|---------------------------------------------|
| `TargetFolder`   | 1 (step) | `"spec/21-app"` (after step pre-pass resolves `{{ SpecRoot }}` via tier 2) |
| `Depth`          | 4 (default) | `3`                                      |
| `RunId`          | 3 (run context) | `"spec-tighten-cycle-20260602-094312"`|

Rendered:

```
Audit spec/21-app to depth 3 for run spec-tighten-cycle-20260602-094312.
```

## Failure logging

On `MissingVariable` the engine logs the full `VariableContext[]` so the
operator can see exactly which tier produced what:

```json
{
  "Reason": "MissingVariable",
  "ReasonDetail": "Variable 'Depth' is Required and no tier supplied a value.",
  "VariableContext": [
    { "name": "TargetFolder", "source": "step",    "resolvedValue": "spec/21-app", "type": "path",    "reason": "ok" },
    { "name": "Depth",        "source": "default", "resolvedValue": null,          "type": "integer", "reason": "no default declared" },
    { "name": "RunId",        "source": "context", "resolvedValue": "spec-tighten-cycle-20260602-094312", "type": "string", "reason": "ok" }
  ]
}
```

## Determinism

Resolution is **purely functional** — given the same macro, step index,
prompt, and run context, the rendered output is byte-identical. The engine
MUST NOT consult clocks, randomness, network, or storage during render
(beyond reading the already-fixed run context).
