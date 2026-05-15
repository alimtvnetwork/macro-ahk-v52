# Solved: SchemaVersion overwritten by release version bumps

**Date:** 2026-05-15
**Version bumped to:** 2.242.0

## Problem
`pnpm run build:sdk` failed with:
```
$.SchemaVersion: SchemaVersion "2.241" is not supported by this build (supported: [1.0], current: "1.0")
```
Schema validator only allows `SchemaVersion: "1.0"`, but compiled instruction artifacts emitted `"2.241"`.

## Root Cause
Two compounding bugs:
1. `scripts/bump-version.mjs` used a loose regex `/([Vv]ersion:\s*\")/` which matched `SchemaVersion` as well as `Version`, mutating the schema contract on every bump.
2. No safeguard in `scripts/compile-instruction.mjs` to detect/correct a polluted source `SchemaVersion` before emitting `dist/instruction.json` (canonical + camelCase compat).

## Fix
1. **`scripts/bump-version.mjs`** — added word boundary: `/(\b[Vv]ersion:\s*\")[\d.]+(\")/ ` so only standalone `Version`/`version` fields are touched.
2. **`scripts/compile-instruction.mjs`** — added `pinSchemaVersion()` + `loadCurrentSchemaVersion()` reading from `standalone-scripts/types/instruction/primitives/schema-version.json`. If source `SchemaVersion` matches the release `MAJOR.MINOR`, the compiler force-pins the emitted `SchemaVersion` to the current schema (`"1.0"`) while preserving `Version` as the release.
3. **All instruction sources** synced to `Version: "2.242.0"` and `SchemaVersion: "1.0"` (7 files).

## Other Changes in This Loop
- Bumped unified version `2.241.0 → 2.242.0` via `scripts/bump-version.mjs minor`.
  - Updated: manifest.json, src/shared/constants.ts, macro-controller/{shared-state,instruction}.ts, marco-sdk/instruction.ts, xpath/instruction.ts, lovable-common/instruction.ts, lovable-owner-switch/instruction.ts, lovable-user-add/instruction.ts.
- `node scripts/check-version-sync.mjs` → ✅ All versions in sync: 2.242.0.
- Pinned `readme.md` install commands & version refs from `v2.240.0 → v2.242.0` (18 occurrences).
- `readme.txt` left untouched (per Core: SP-1..SP-7 readme.txt prohibitions).

## Learning / Do-Not-Repeat
- Never write a regex that touches `Version` without `\b` — it WILL hit `SchemaVersion`/`ApiVersion`/etc.
- The compiler must defend the schema contract, not trust source files.
- `SchemaVersion` = compile-time contract version (rarely changes); `Version` = release version (bumps every change set). They are independent fields.
