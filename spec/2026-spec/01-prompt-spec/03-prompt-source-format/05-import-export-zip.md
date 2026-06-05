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
