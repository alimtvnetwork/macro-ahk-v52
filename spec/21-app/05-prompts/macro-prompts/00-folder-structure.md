# Macro-Prompts — Folder Structure

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

## On-disk layout

```
standalone-scripts/
├── prompts/                         # existing human prompts (untouched)
│   └── NNN-slug/
│       ├── info.json
│       └── prompt.md
├── macro-prompts/                   # NEW — macro-only template prompts
│   ├── 001-audit-spec/
│   │   ├── info.json                # PascalCase keys, declares Variables[]
│   │   └── prompt.md                # body with {{ Placeholders }}
│   ├── 002-fix-from-audit/
│   │   ├── info.json
│   │   └── prompt.md
│   └── 003-final-score/
│       ├── info.json
│       └── prompt.md
└── macros/                          # NEW — macro chain definitions
    └── 001-spec-tighten-cycle.macro.json
```

## Per-prompt directory contract

Every `macro-prompts/NNN-slug/` directory MUST contain exactly:

| File         | Required | Purpose                                                       |
|--------------|----------|---------------------------------------------------------------|
| `info.json`  | yes      | Metadata (PascalCase) — Slug, Title, Category, Version, Variables[], IsFavorite, Description |
| `prompt.md`  | yes      | Prompt body in Markdown with `{{ VarName }}` placeholders     |
| `notes.md`   | optional | Human notes; ignored by the aggregator                        |

No other file extensions are read. Hidden files (dotfiles) are ignored.

## Folder-level invariants

- Slug in `info.json` MUST equal the trailing slug segment of the directory name (after the `NNN-` numeric prefix). Mismatch → `Reason="SlugDirectoryMismatch"`.
- Numeric prefix is **3-digit zero-padded** (`001`…`999`). See `01-naming-and-numbering.md`.
- `prompt.md` MUST be UTF-8, LF line endings, max 64 KB.
- No nested subdirectories under `NNN-slug/`.

## Output (build-time)

The aggregator emits a single bundle:

```
chrome-extension/macro-prompts/macro-prompts.json
```

Shape, version hash, and resolver behaviour are specified in `03-aggregation-pipeline.md`, `04-resolution-order.md`, and `06-versioning.md`.
