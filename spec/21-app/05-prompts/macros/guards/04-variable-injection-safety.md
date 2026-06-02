# Guard — Variable Injection Safety

Prevents user-supplied Variable values from breaking out of their placeholder and altering macro semantics.

## Threat model
A malicious or careless Variable value could:
1. Contain `{{ OtherVar }}` → recursive interpolation, leak unrelated secrets.
2. Contain prompt-control phrases ("ignore previous instructions…") → prompt injection into the LLM.
3. Contain shell metacharacters → break out of `JsInline` step execution if naively concatenated.
4. Contain extremely large payloads → DoS via memory pressure.

## Defenses (all enforced by the interpolator + step adapters)

### D1 — Brace-injection guard (recursive interpolation)
- Reject any resolved value containing the literal `{{` or `}}`.
- `Reason='VariableInjectionGuard'`, `ReasonDetail = "name=<VarName>, position=<index>"`.
- Test: `tests/engine/interpolator.test.ts` includes a Variable whose value is `"{{ Secret }}"`.

### D2 — Payload size cap
- Per-Variable hard cap: 64 KiB resolved string length.
- Total interpolated body cap: 1 MiB.
- Excess → `Reason='VariableTooLarge'`, `ReasonDetail = "name=<VarName>, bytes=<n>, cap=<n>"`.

### D3 — JsInline argument boundary
- `JsInline` step does NOT receive Variables via string concatenation.
- Variables passed as a typed object (`vars: ResolvedVariables`) and accessed by property in the step's function body. No `eval`, no `new Function(<bodyWithStringVars>)`.

### D4 — LLM-prompt injection (advisory)
- Engine does NOT auto-sanitize prompt-injection phrases — that's a model-side concern.
- Macro authors MAY add an explicit `JsInline` pre-step that wraps user input in a delimiter block:
  ```
  <user_input>
  {{ UserInput }}
  </user_input>
  ```
- The `summarize-pr` example macro-prompt demonstrates the pattern.

### D5 — Sensitive masking in logs
- Variables with `Sensitive: true` mask their resolved value as `***` in:
  - `variables-snapshot.json`
  - `_log.jsonl`
  - UI Show-details dialog
- Real value still passed to the step. Masking is a logging concern, not an execution concern.

### D6 — Enum strict
- `Enum` Variables are validated against `EnumValues[]` at resolution time, rejecting any value not in the list (`Reason='VariableEnumViolation'`).

## Failure log shape
Every defense above writes the full `VariableContext` entry for the offending Variable, including `source`, `type`, and `reason`. Never omit even when other fields are unknown — log `null` + reason per Core failure-log rule.

## Tests
- `tests/engine/variable-injection.test.ts` exercises D1, D2, D6 explicitly with fixtures under `tests/fixtures/engine/interpolator/injection/`.
