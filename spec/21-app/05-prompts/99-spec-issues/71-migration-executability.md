# Audit — MIGRATION.md (Blind-AI Executability)

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur) · 93 lines

## Blind-AI walkthrough
Stepping through as if a blind AI handed only this file:

| Step | Doc says | Blind AI can execute? | Why |
|---|---|---|---|
| 1 Move file | `prompts/<slug>.md → macro-prompts/<slug>/body.md` | **Yes** — concrete paths. |
| 2 Add `info.json` | Schema implied but not inlined | **No** — points to `info.json` shape but `json/` folder MISSING (C29); `folder-layout/02-schema-reference.md` is the only real schema doc and not referenced here. |
| CI guards | `DuplicateMacroSlug`, `SlugFolderMismatch` | **No** — guard names cited; implementation files not linked. |
| Variables migration | `{{ VarName }}` introduced | **No** — `mem://features/prompt-variables` MISSING (C67); no inline grammar. |

## Findings
- **C1** Missing metadata header.
- **C8** No link to `folder-layout/02-schema-reference.md` (the real schema source).
- **C27** Guard names not enumerated against owning code paths.
- **C28** No round-trip test (legacy → migrated → executes identically).
- **C9** Implicitly relies on `mem://features/prompt-macros` (MISSING) for variable semantics.

## Severity
**Critical.** Migration without a schema reference or variable grammar guarantees failed migrations.

## Fix order
1. Inline `info.json` minimal schema OR link `folder-layout/02-schema-reference.md`.
2. Add variable-grammar appendix (or fix C67 first).
3. Map guard names → implementation files.
4. Add round-trip test pointer.
