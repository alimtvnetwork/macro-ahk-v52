---
name: examples-02-export-import-roundtrip audit
description: Per-doc audit of examples/02-export-import-roundtrip.md
type: audit
---

# Audit — examples/02-export-import-roundtrip.md

**Target:** `spec/21-app/05-prompts/macros/examples/02-export-import-roundtrip.md` (42 lines)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C15 Bare code fences:** none — cleanest example in the folder.
- **C7 Mixed-case tokens** — uses `SchemaVersion: 1`, `ExportedAtKL`; PascalCase is on-policy but field origin is undocumented (no link to `engine/06-message-contract.md` or a JSON schema doc).
- **C8 Reference rot** — implies an importer exists but never names the spec doc or code path that performs the import.
- **C28 Tests not addressed** — no round-trip equality assertion (export → import → re-export should be byte-stable except for `ExportedAtKL`).

## Severity
Medium. Schema-version contract is critical; ambiguity blocks any blind-AI migrator.

## Recommended fix order
1. Metadata header.
2. Link `SchemaVersion` to its owning schema doc.
3. Add explicit round-trip equality rule.
