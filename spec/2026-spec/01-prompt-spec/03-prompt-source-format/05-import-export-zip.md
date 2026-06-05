# T35 · Import / export zip format

**Created:** 2026-06-02

Round-trippable bundle for moving prompts between installs.

## Container

A single `.zip` archive. No compression-level requirement.

## Layout inside the zip

```
manifest.json
prompts/
  01-<slug>/
    info.json
    prompt.md
  02-<slug>/
    info.json
    prompt.md
  …
```

Folder shape under `prompts/` is identical to T31. The outer
`manifest.json` describes the bundle as a whole.

## `manifest.json`

```json
{
  "bundleVersion": "1.0",
  "exportedAt":    "2026-06-02T03:14:00Z",
  "exportedBy":    "<free text, e.g. user email or 'anonymous'>",
  "promptCount":   3,
  "slugs":         ["next-tasks", "rejog-the-memory-v1", "audit-spec-v1"]
}
```

- `bundleVersion` is independent of any individual prompt's `version`.
  Current spec defines only `"1.0"`. Future versions add fields; older
  importers MUST refuse unknown `bundleVersion` with
  `ReasonDetail = "unsupported bundleVersion"`.
- `slugs` is informational; the authoritative list is what's on disk.

## Import behaviour

The integrator calls
`PromptStore.importMany(prompts, mode)` (T28) after parsing the zip,
passing the user-selected `mode` (`skip` | `replace` | `rename`).
Hidden-default flags from the source install are NOT carried over.

## Export behaviour

- **Single prompt:** the zip still uses the `prompts/01-<slug>/` shape
  for consistency.
- **Subset:** ordering follows the `(category, order, title)` rule.
- **All:** includes user-created and overridden prompts. Shipped
  defaults that have **no** user override are excluded (they ship with
  the HostApp on the destination install).

## Determinism

For a given input set, two consecutive exports MUST produce
byte-identical archives **except** for `manifest.json → exportedAt`.
This makes diffs reviewable.

## Acceptance

- [ ] The implementation satisfies the `T35 · Import / export zip format` contract in this file and the folder-level acceptance target: prompt source files round-trip through parse and emit without semantic drift.
- [ ] Verification passes when `UT-source-001..008` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** keep `info.json` at the prompt folder root with exactly the keys defined in `02-info-json.md`; extra keys fail `schemas/prompt.schema.json`.
- **MUST** read `prompt.md` body as UTF-8 with explicit BOM strip; trailing whitespace is preserved verbatim (paste-fidelity).
- **MUST** import/export bundles as ZIP with `prompts-bundle.json` manifest validated by `schemas/prompts-bundle.schema.json` before any disk write.
- **MUST** treat the `default/` folder as read-only at runtime; user edits clone into `user/` and never modify defaults in place.

## Pitfalls / Counter-examples

- ❌ Detecting prompt type by file extension. ✅ Read `info.json#kind` — the source of truth.
- ❌ Auto-rewriting `info.json` with a "last modified" timestamp. ✅ See `mem://constraints/readme-txt-prohibitions` SP-1..SP-7 — no auto time stamps in source files.
- ❌ Streaming a ZIP import directly into IndexedDB without schema validation. ✅ Validate the full bundle in memory first; a single bad entry rejects the whole import.
- ❌ Trimming the prompt body to "clean up" whitespace. ✅ Body is paste-fidelity; trim only at the editor surface, never at the loader.
- ❌ Hardcoding the import path. ✅ Use `STORAGE_PROMPTS_ROOT` constant.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
