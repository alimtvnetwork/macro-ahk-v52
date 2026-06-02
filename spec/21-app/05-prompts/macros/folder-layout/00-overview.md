# Macros Folder Layout — Overview

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Macro chain definitions live in their own sibling folder, separate from prompts and macro-prompts.

## On-disk layout

```
standalone-scripts/
├── prompts/                          # existing — human prompts
├── macro-prompts/                    # template prompts (Block 3)
└── macros/                           # NEW — macro chain definitions
    ├── 001-spec-tighten-cycle.macro.json
    ├── 002-review-and-fix-loop.macro.json
    └── 003-weekly-spec-audit.macro.json
```

## File contract

- One macro per file.
- Extension: **`.macro.json`** (not `.json` — keeps editors / aggregator unambiguous).
- Filename: `<NNN>-<kebab-slug>.macro.json` — same numbering/slug grammar as `macro-prompts/` (`spec/21-app/05-prompts/macro-prompts/01-naming-and-numbering.md`).
- Slug in file equals slug segment of filename (mismatch → `Reason="SlugFilenameMismatch"`).

## Why one-file-per-macro (not a folder)

A macro is a single JSON document — no Markdown body, no sidecar assets. A flat file beats a folder for:

- Cheap diff review (single file in PR).
- Trivial export/import via the JSON Save/Replace UI (Block 6).
- Stable shell globbing in the aggregator.

## Build output

The aggregator (extended in Block 3, stage `OUT_X`) emits a single bundle:

```
chrome-extension/macros/macros.json
```

Wrapper schema is shared with prompts bundles (`schemas/prompts-bundle.schema.json`, key `Macros[]`).

## Runtime location

- Bundled defaults seed into SQLite table `Macros` (PascalCase columns) at install/update.
- User-authored macros saved via the UI live in the same `Macros` table (with `IsUserAuthored: true`); identity-only storage per `mem://constraints/no-storage-pascalcase-migration`.
- User overrides of bundled macros mirror the prompts pattern: sibling `MacrosUserOverride` table.
- No Supabase (`mem://constraints/no-supabase`).

## Cross-references

- Naming rules: `spec/21-app/05-prompts/macros/folder-layout/01-naming.md`
- Schema: `schemas/macro.schema.json` (Task 34)
- Aggregation: `spec/21-app/05-prompts/macros/folder-layout/03-aggregation.md` (Task 38)
- Starter macros: `spec/21-app/05-prompts/macros/folder-layout/04-starter-macros.md` (Task 39)
