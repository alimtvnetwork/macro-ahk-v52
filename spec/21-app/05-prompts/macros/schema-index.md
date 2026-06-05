# Schema Index

All authoritative JSON schemas for the Prompt-Macros subsystem.

| File | Validates | Owner |
|---|---|---|
| `json/10-macro-definition.schema.json` | A `MacroDefinition` (the saved macro) | spec author |
| `json/11-run-state.schema.json` | A `RunState` row in `chrome.storage.local` | background runner |
| `json/12-audit-output.schema.json` | `spec/audit/<RunId>/02-findings.json` | audit-writer |
| `json/13-event-stream.schema.json` | The `MacroEvent` union on the message bus | message-bus |
| `json/14-info-json.schema.json` | A per-prompt `info.json` | author tooling |

All schemas use **JSON Schema draft 2020-12**. The build-time validator is `scripts/validate-schemas.mjs`. CI gate: `schemas:lint`.

## Versioning rule

Each schema has `"$id"` ending in `#v<N>`. A breaking change bumps `N`; the migrator in `engine/14-pseudocode-audit-writer.md` upgrades older payloads on read.
