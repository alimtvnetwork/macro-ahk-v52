# 90 — Master Issue List (Consolidated)

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)
**Source:** all `99-spec-issues/01-72*.md`

| ID | Category | Files affected | Top doc(s) |
|---|---|---:|---|
| C1 | Missing metadata header | ~95 / 95 | `01-missing-metadata-header.md` |
| C2 | Filename violations | 6 | `02-filename-violations.md` |
| C3 | Missing `00-overview.md` | 9 folders | `03-missing-overview-files.md` |
| C4 | Missing consistency report | 1 | `04-missing-consistency-report.md` |
| C5 / C25 | Reserved-prefix misuse (`00-` for content) | 8+ | `05`, `26`, `41`, `46`, `51`, `57` |
| C6 | Missing acceptance criteria | 9 folders | `06` |
| C7 | snake_case / magic-number bodies | 20+ | `07`, `42`, `49`, `52`, `61` |
| C8 | Cross-reference rot (`mem://` / paths) | 39 files | `08`, `43`, `44`, `51`, `53`, `54`, `55`, `60`, `63`, `66`, `67`, `69` |
| C9 | `.lovable/plans/` leaks into spec | several | `09` |
| C10 / C26 | Parallel/duplicate authority claims | many | `10`, `26`, `40`, `54`, `57`, `59`, `61`, `68` |
| C11 / C16 | H1 vs filename slug mismatches | 44 | `11`, `16` |
| C12 | Orphan files (not in any overview) | ~70 | `12`, `50` |
| C13 | Duplicate headings across siblings | 11×`## Failure log` | `13`, `26`, `37`, `47`, `54`, `55`, `60`, `62`, `64` |
| C14 | Trailing whitespace | 6 | `14` |
| C15 | Bare code fences | 62 | `15`, plus per-doc audits |
| C17 | Mermaid violating ASCII-only | 2 | `17` |
| C18 | Empty `##` sections | several | `18` |
| C19 | TODO / FIXME markers | 2 | `19` |
| C20–C23 | Anchor rot / image rot / abs paths / date drift | 0–few | `20`–`23` |
| C24 | Mixed timezone mentions / version policy | 55 / 1 | `24`, `25` |
| C27 | Discriminated-union enums absent | many | `26`, `37`, `42`, `45`, `51`, `52`, `58`, `61`, `62` |
| C28 | "Tests" sections lack file paths | most docs | `26`, plus testing batch |
| **C29** | **PLANNED SUBFOLDERS MISSING** (`json/`, `ui/`, `macro-prompts/`, `variables/`) | **30 docs** | **`56`** |
| C66 | `mem://features/prompt-macros` MISSING | 1 mem file | `66` |
| C67 | `mem://features/prompt-variables` MISSING | 1 mem file | `67` |
| C68 | `mem://architecture/macro-prompts-folder` drift | 1 | `68` |
| C69 | `.lovable/memory/index.md` stale references | 3 lines | `69` |
| C70 | READINESS-SCORE 100/100 falsified | 1 | `70` |
| C71 | MIGRATION.md not blind-AI executable | 1 | `71` |
| C72 | CHANGELOG.md cites unwritten content | 1 | `72` |

**Total distinct categories:** 33 (C1–C29 + C66–C72; C20–C23 mostly clean).
**Total per-doc audits written:** 72.
