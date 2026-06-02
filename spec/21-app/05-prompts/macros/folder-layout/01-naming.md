# Macros — Naming

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

## Filename grammar

```
<NNN>-<kebab-slug>.macro.json
```

Authoritative regex:

```
^(\d{3})-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.macro\.json$
```

- `NNN` — 3-digit zero-padded decimal, `001`–`999`.
- `<kebab-slug>` — lowercase ASCII, letters/digits/hyphens, starts with a letter, no consecutive hyphens, max 48 chars.
- Suffix MUST be `.macro.json` (compound extension); plain `.json` is rejected.

### Valid

```
001-spec-tighten-cycle.macro.json
002-review-and-fix-loop.macro.json
014-weekly-spec-audit.macro.json
```

### Invalid (and the aggregator failure code)

| Filename                              | Reason                          |
|---------------------------------------|---------------------------------|
| `1-spec-tighten-cycle.macro.json`     | `NumberingNotZeroPadded`        |
| `001-Spec-Tighten.macro.json`         | `SlugInvalidCharacters`         |
| `001-spec--tighten.macro.json`        | `SlugConsecutiveHyphens`        |
| `001-spec-tighten.json`               | `MacroSuffixMissing`            |
| `001-.macro.json`                     | `SlugMissing`                   |

## Slug rules

- The slug segment is the **canonical macro identifier** referenced by:
  - The Run banner / Macros tab (`Slug` column).
  - Run IDs: `RunId = <slug>-<yyyymmdd-HHmmss>` (Asia/Kuala_Lumpur).
  - JSON Import/Export round-tripping.
- Slug MUST be globally unique within `standalone-scripts/macros/`. Duplicates → `Reason="DuplicateMacroSlug"` (build aborts).
- Slugs in `macros/` share no namespace with prompt slugs — they live in different bundles and are looked up by distinct APIs.

## Numbering bands

- `001`–`099` — built-in starter macros shipped with the extension.
- `100`–`899` — user / community macros.
- `900`–`999` — experimental / internal-only; aggregator stamps `IsExperimental: true` in the bundle.

Numeric prefix is informational only — slug is identity. Renumbering a file does not change its identity; renaming the slug does (and breaks any persisted `RunId` history for that macro).

## Internal `Slug` field

Every `.macro.json` includes a top-level `Slug` (PascalCase key). It MUST match the filename slug segment exactly. Validator emits `Reason="SlugFilenameMismatch"` with both paths on mismatch.
