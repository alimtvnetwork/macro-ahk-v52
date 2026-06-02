# Sensitive Value Patterns

A variable is treated as sensitive if **either** is true:

1. `info.json` declares `Sensitive: true`.
2. Its `Name` matches the auto-pattern.

## Auto-pattern

```js
/password|token|secret|api[_-]?key|bearer/i
```

Examples that match: `ApiToken`, `BearerToken`, `Secret`, `ApiKey`, `Api_Key`, `Password`.
Examples that do NOT match: `Key` (alone), `Auth`, `Session`.

## Masking rules

| Surface | Behavior |
|---|---|
| Rendered prompt body | substituted normally (the LLM needs the real value) |
| `_log.jsonl` line | value replaced with `***` |
| `MacroEvent` payload | value replaced with `***` |
| Audit `02-findings.json` | value replaced with `***` |
| Audit `01-gap-analysis.md` | value replaced with `***` |
| UI panel (run history) | value replaced with `***` |
| Verbose-logging-ON capture | sensitive STILL `***` — verbose does not lift masking |

## Implementation hook

`recordSensitive(name)` is called by the interpolator the first time it resolves a sensitive variable. The recorded set drives `maskForLog()` (see `engine/11-pseudocode-interpolator.md`).

## Test vectors

| Variable name | Sensitive? |
|---|:--:|
| `Password` | ✅ |
| `userPassword` | ✅ |
| `ApiKey` | ✅ |
| `Api_Key` | ✅ |
| `BearerToken` | ✅ |
| `Key` | ❌ |
| `Auth` | ❌ |
| any with `Sensitive: true` | ✅ |
