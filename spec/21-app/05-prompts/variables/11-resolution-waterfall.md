# Resolution Waterfall

For every `{{ Name }}` token, the interpolator probes five sources in this exact order. First non-`undefined` value wins.

| Tier | Source | Set by | Lifetime |
|---:|---|---|---|
| 1 | `Step.Variables[Name]` | Macro author per step | one step |
| 2 | Macro-scoped store | `set-var` step, runner | full run |
| 3 | UI prompt input | `variable-input-dialog` | full run |
| 4 | Built-in context | runtime (RunId, Now, …) | full run |
| 5 | `info.json` Variables[].Default | spec author | always |

If all 5 yield `undefined`:
- If `decl.Required === true` → abort with `Reason='MissingVariable'`.
- Else → empty string `""`.

## Worked example

Template:
```
Audit {{ TargetFolder }} for run {{ RunId }} at depth {{ Depth }}.
```

Context:
- Step.Variables: `{}`
- Macro-scoped: `{ Depth: 5 }`
- UI input: `{ TargetFolder: "src/" }`
- Built-in: `{ RunId: "9f3-..." }`
- Defaults: `{ TargetFolder: "spec/", Depth: 3 }`

Resolution:
- `TargetFolder` → tier 3 (`src/`)
- `RunId` → tier 4 (`9f3-...`)
- `Depth` → tier 2 (`5`)

Rendered:
```
Audit src/ for run 9f3-... at depth 5.
```
