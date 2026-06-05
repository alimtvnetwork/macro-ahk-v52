# Pseudocode — Loader Runner

```ts
async function loadPrompts(source: PromptSource): Promise<LoaderResult> {
  const entries = await source.list();          // folder | zip | bundle
  const prompts: Prompt[] = [];
  const errors: LoaderError[] = [];
  for (const entry of entries) {
    try {
      const info = JSON.parse(await source.read(`${entry}/info.json`));
      validate(info, infoJsonSchema);           // throws TypedError
      const body = await source.read(`${entry}/prompt.md`);
      prompts.push(materialize(info, body));    // resolves defaults
    } catch (err) {
      errors.push(toLoaderError(entry, err));   // never swallowed
    }
  }
  return { prompts, errors, loadedAt: nowIso() };
}
```

Cross-refs: `04-loader-contract/01-loader-interface.md`, `04-error-modes.md`.

## Acceptance

- [ ] The implementation satisfies the `Pseudocode — Loader Runner` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
