# Sensitive Variable Masking

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

A variable declared with `Sensitive: true` is treated as a secret. Its
**resolved value is never persisted, logged, displayed, or exported in
clear**. The mask token is the three-character literal `***`.

## Where masking applies

| Surface                                          | Masked? |
|--------------------------------------------------|---------|
| Console / `RiseupAsiaMacroExt.Logger.*` output   | ✅      |
| `MacroRunLog.<RunId>` entries                    | ✅      |
| `MacroRunState.<RunId>.Variables`                | ✅      |
| `00-run-manifest.json` (`Variables` block)       | ✅      |
| `99-final-report.json` (`Variables` block)       | ✅      |
| JSON Export bundle (Block 6 Task 53)             | ✅      |
| `Macros.Item.<Slug>` (`Default` if `Sensitive`)  | ✅      |
| Variable-input dialog (Block 5 Task 50)          | input type `password`; clipboard paste allowed |
| Rendered prompt body sent to the host AI         | ❌ **NOT masked** — the AI needs the real value |
| Failure-log `VariableContext[].resolvedValue`    | ✅ (replaced with `null`, `reason: "masked (Sensitive)"`) |

The only surface that sees the cleartext is the prompt body delivered to the
host AI's chatbox. Everywhere else the value is replaced **before** the data
crosses a persistence or display boundary.

## Worked example

Declaration:

```json
{ "Name": "ApiKey", "Type": "string", "Required": true, "Sensitive": true,
  "Pattern": "^sk-[A-Za-z0-9]{20,}$" }
```

Caller supplies `"sk-AbCdEf0123456789xyz"`.

Rendered body (delivered to AI, **cleartext**):

```
Call the endpoint with Authorization: Bearer sk-AbCdEf0123456789xyz
```

`00-run-manifest.json` (masked):

```json
{ "Variables": { "ApiKey": "***" } }
```

Failure log (masked, with reason):

```json
{
  "VariableContext": [
    { "name": "ApiKey", "source": "step", "resolvedValue": null,
      "type": "string", "reason": "masked (Sensitive)" }
  ]
}
```

## Masking algorithm

1. After resolution + coercion (so range / pattern checks see the real value),
   wrap the value in a `MaskedValue` object that holds the original behind a
   non-enumerable property.
2. Serialisers (`JSON.stringify`, logger formatters, manifest writer) call
   `MaskedValue.toJSON()` which returns `"***"`.
3. The renderer holds the only escape hatch: a single `MaskedValue.unwrap()`
   call site, located in `engine/05-variable-interpolator.md` (Task 66).
   Any other call site must be flagged by the lint guard in Block 9.

## Storage rules

- `Sensitive: true` values **MUST NOT** be stored in `chrome.storage.local`
  beyond the lifetime of the active run. The engine clears them from
  `MacroRunState.<RunId>.Variables` at `RunFinished` / `RunFailed` /
  `RunStopped` (replaces with `"***"` in place).
- `Sensitive: true` values **MUST NOT** appear in `PromptsBackup.<Timestamp>`
  payloads (Block 6 Task 55).
- A prompt's `Default` for a `Sensitive` variable is allowed but is itself
  treated as sensitive (stored masked, surfaced masked).

## UI rules

- Variable-input dialog (Block 5 Task 50) renders sensitive inputs as
  `<input type="password">`.
- Clipboard paste is allowed; reveal-toggle is **not** provided (defence in
  depth — keeps the value off the rendered DOM).
- Sensitive values are **never** echoed back into a confirmation dialog.

## Forbidden patterns

- Logging `"value=" + value` for any variable, sensitive or not — use the
  structured `VariableContext[]` shape.
- Stringifying the entire `MacroRunState` to a `console.log`.
- Including raw variable values in toast / banner copy.
- Writing variable values into `readme.txt`, `CHANGELOG.md`, or any
  user-facing artifact outside `spec/audit/<RunId>/` (which is itself
  redacted per the manifest rule above).
