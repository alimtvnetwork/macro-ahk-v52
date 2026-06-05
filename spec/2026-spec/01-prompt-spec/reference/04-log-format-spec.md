# Log Format Spec (jsonl)
One JSON object per line. No multi-line records.
```json
{"ts":"2026-06-03T06:25:01.234Z","level":"error","SourceFile":"queue-engine.ts","Phase":"run","Reason":"PasteVerificationFailed","ReasonDetail":"strategy=replace expected=… got=…","Error":{"name":"PasteError","message":"…","stack":"…"},"SelectorAttempts":[{"strategy":"id","expression":"#composer","matched":false,"matchCount":0,"reason":"not found"}],"VariableContext":[{"name":"UserName","source":"user","row":1,"resolvedValue":"<masked>","type":"string","reason":"sensitive"}]}
```
Required keys: `ts`, `level`, `SourceFile`, `Phase`. Error records additionally require `Reason`, `ReasonDetail`, `Error`. Selector/variable failures require their respective arrays (empty `[]` with a `reason` is acceptable, but the key MUST be present).
Sensitive values are masked at the emitter, never at the sink.

## Acceptance

- [ ] The implementation satisfies the `Log Format Spec (jsonl)` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
