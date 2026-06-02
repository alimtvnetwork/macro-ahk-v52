# Variable Interpolator

## Syntax
- Placeholder: `{{ VarName }}` (whitespace optional inside braces).
- `VarName` matches `^[A-Za-z][A-Za-z0-9_]{0,63}$`.
- Literal braces: `\{{` and `\}}` escape to `{{` / `}}` (escape rule applies only inside Body strings).

## 5-tier resolution waterfall (first match wins)
1. **Step.Variables** (per-step overrides)
2. **Macro.Variables** (declared at macro level)
3. **RunContext** (set by prior step's `Outputs[]`, including `Score`)
4. **Default** (`Variables[].DefaultValue` on the declaration)
5. **Fail-fast** → `Reason='VariableUnresolved'`

## Type coercion
- Per `Variables[].Type` (`String` | `Number` | `Boolean` | `Enum` | `Json`).
- Coercion failure → `Reason='VariableTypeMismatch'`, `ReasonDetail` = expected vs actual.
- `Enum` rejects values not in `EnumValues[]`.
- `Sensitive: true` → masked as `***` in audit logs + variables-snapshot, real value still passed to the step body.

## Escaping (injection safety)
- `Body` is treated as plain text (not HTML/SQL). The interpolator does NOT auto-escape — Macro authors are responsible for downstream encoding.
- However: any resolved value containing the literal `{{` or `}}` is **rejected** (`Reason='VariableInjectionGuard'`) to prevent recursive interpolation attacks. See `guards/04-variable-injection-safety.md`.

## Algorithm
```ts
function interpolate(body: string, ctx: ResolveContext): string {
  return body.replace(PLACEHOLDER_REGEX, (match, name) => {
    const resolved = resolveVar(name, ctx); // throws on tier-5 fail
    assertNoBraceInjection(resolved, name); // throws VariableInjectionGuard
    return String(resolved);
  });
}
```

## Error surface
Every interpolation failure logs the full `VariableContext[]`:
```json
{
  "name": "TargetScore",
  "source": null,
  "row": null,
  "column": null,
  "resolvedValue": null,
  "type": "Number",
  "reason": "VariableUnresolved: not declared in Step, Macro, RunContext, or Default"
}
```

## Tests
`tests/engine/interpolator.test.ts` covers: each tier, type coercion, enum rejection, escape sequences, brace-injection guard, sensitive masking.
