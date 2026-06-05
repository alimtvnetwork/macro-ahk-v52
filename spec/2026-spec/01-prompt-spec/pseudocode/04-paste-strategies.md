# Pseudocode — Paste Strategies

```ts
type Strategy = "replace" | "append" | "prepend" | "insert-at-cursor";

function paste(adapter: EditorAdapter, text: string, strategy: Strategy) {
  switch (strategy) {
    case "replace":          adapter.setValue(text); break;
    case "append":           adapter.setValue(adapter.getValue() + text); break;
    case "prepend":          adapter.setValue(text + adapter.getValue()); break;
    case "insert-at-cursor": adapter.insertAtCursor(text); break;
  }
  const ok = adapter.getValue().includes(text);
  if (!ok) throw new PasteError("PasteVerificationFailed", { strategy });
}
```

Verification rules: `06-injection-contract/04-paste-verification.md`.

## Acceptance

- [ ] The implementation satisfies the `Pseudocode — Paste Strategies` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
