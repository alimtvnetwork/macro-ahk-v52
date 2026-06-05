# CI Gates (block merge on failure)

| Gate | Command | Source-of-truth |
|---|---|---|
| Banlist lint | `node scripts/lint-spec-banlist.mjs` | `01-glossary/04-vocabulary-banlist.md` |
| Mermaid lint | `node scripts/lint-spec-mermaid.mjs` | `*.mmd` |
| Cross-refs | `node scripts/spec/lint-cross-refs.mjs` | all `spec/...` links |
| Prompts info.json | `node scripts/check-prompts-info-json.mjs` | `schemas/05-info-json.schema.json` |
| Prompts xrefs | `node scripts/check-spec-prompts-xrefs.mjs` | task ↔ ref count |
| Snippet typecheck | `node scripts/typecheck-spec-snippets.mjs` | `19-reference-snippets/` |
| Unit tests | `bunx vitest run` | `UT-*` IDs |
| Component tests | `bunx vitest run --project components` | `CT-*` IDs |
| E2E | `bunx playwright test` | `E2E-*` IDs |
| Genericization audit | `node scripts/audit-spec-genericization.mjs` | host namespace usage |

All gates wired in `.github/workflows/spec-gates.yml`. Zero failures required.

## Acceptance

- [ ] The implementation satisfies the `CI Gates (block merge on failure)` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
