# Fixtures Catalog

Path: `tests/fixtures/prompts/`.

| Fixture | Purpose |
|---|---|
| `minimal/` | Single prompt, no variables — happy path |
| `with-variables/` | All variable types (string, number, boolean, enum) + defaults |
| `sensitive/` | `sensitive: true` variables — masking test |
| `invalid-info-json/` | Schema-violating `info.json` — loader error path |
| `invalid-prompt-md/` | Body > 64 KB — size limit test |
| `import-zip.zip` | End-to-end import round-trip |
| `duplicate-ids/` | Two prompts share `id` — conflict path |
| `host-overrides.json` | Sample settings override blob |
| `queue-100/` | 100 pre-built tasks — capacity test |

Loader fixtures must round-trip: `parse → emit → parse` byte-equal.

## Acceptance

- [ ] The implementation satisfies the `Fixtures Catalog` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
