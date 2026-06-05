# T31 · On-disk folder layout

**Created:** 2026-06-02

When a `PromptStore` is backed by a file system (the canonical
distribution format and the shape used by the reference corpus at
`standalone-scripts/prompts/`), each prompt lives in its **own folder**.

## Layout

```
<root>/
  01-<slug>/
    info.json
    prompt.md
  02-<slug>/
    info.json
    prompt.md
  …
```

## Rules

1. **One folder per prompt.** Never share a folder between two prompts.
2. **Folder name format:** `^(\d{2,3})-(<slug>)$`
   - `\d{2,3}` is a 2- or 3-digit ordering prefix used **only** for
     human readability when browsing the directory. It MUST equal
     `info.json → order` zero-padded to at least 2 digits.
   - `<slug>` matches the slug regex from `02-data-model/04-id-and-slug-rules.md`.
3. **Required files** inside each folder: `info.json` (see T32) and
   `prompt.md` (see T33). Any other file is allowed for the integrator's
   use and MUST be ignored by the loader.
4. **Encoding:** UTF-8, LF line endings, no BOM.
5. **Sort order at load time** is `order` then `slug`. The folder
   prefix is advisory, not authoritative.
6. **Discovery:** the loader walks one level deep only — nested
   `<root>/foo/bar/01-x/` is NOT considered a prompt.

## Reference corpus

The folder `standalone-scripts/prompts/` in this repo is treated as a
**read-only reference** that demonstrates this layout end-to-end. Do
not copy it into the spec; cite it by path only.

## Acceptance

- [ ] The implementation satisfies the `T31 · On-disk folder layout` contract in this file and the folder-level acceptance target: prompt source files round-trip through parse and emit without semantic drift.
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
