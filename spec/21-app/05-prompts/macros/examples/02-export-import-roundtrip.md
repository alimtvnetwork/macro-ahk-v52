# Worked Example — Export / Import Round-trip

## Goal
Prove that an exported bundle, re-imported into a fresh profile via Replace, reconstructs an identical state (Checksum-equal).

## Setup (Profile A)
1. Author 3 prompts, 2 macros, 1 macro-prompt, 2 custom categories, 4 favorites.
2. Run `prompts-bundle-checksum` helper → record `ChecksumA`.

## Export
1. Panel ⋯ → Export All → save as `bundle-A.json`.
2. Validate against `schemas/prompts-bundle.schema.json` (`node scripts/prompts-validate.mjs bundle-A.json`) → must pass.
3. Open file and confirm:
   - `SchemaVersion: 1`, `ExportedAtKL` present.
   - Lists sorted by `Slug` (`Favorites` by `Source, Slug`).
   - All `Sensitive: true` defaults masked as `"***REDACTED***"`.
   - Top-level `Checksum` present.

## Import on fresh Profile B
1. Install extension into a clean Chrome profile (empty SQLite).
2. Panel ⋯ → Replace All → drop `bundle-A.json` → type `REPLACE` → confirm.
3. Wait for "Replaced with bundle from <ExportedAtKL>" toast.

## Assertions
- [ ] Profile B has identical row counts per table (`Prompts=3`, `Macros=2`, `MacroPrompts=1`, `PromptCategories=2+builtins`, `Favorites=4`).
- [ ] Re-export from Profile B → `bundle-B.json`.
- [ ] `bundle-B.Checksum === bundle-A.Checksum` (modulo `ExportedAtKL`, which is recomputed).
- [ ] Per-item `Checksum` matches for every (Kind, Slug) pair.
- [ ] Profile B's `PromptsBackupRing` contains exactly 1 backup (the pre-Replace empty snapshot).
- [ ] Restore previous bundle → row counts return to 0 across all five tables.

## Negative cases
| Mutation to `bundle-A.json` | Expected on Import |
|----------------------------|--------------------|
| Add unknown top-level key | `Reason='SchemaInvalid'` (additionalProperties:false) |
| Bump `SchemaVersion` to 99 | `Reason='UnsupportedSchemaVersion'` |
| Tamper a single `Checksum` field | Import succeeds (checksums are re-derived); diff visible only if downstream tool re-checksums |
| Truncate file mid-JSON | `Reason='ParseFailed'` |
| 26 MB padded file | `Reason='BundleTooLarge'` |

## Acceptance
All assertions pass AND all negative cases produce the expected `Reason` with full failure-log shape.
