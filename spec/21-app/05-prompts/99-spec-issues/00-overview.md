# Spec Issues — Prompt-Macros Subsystem Audit

**Version:** 0.1.0
**Updated:** 2026-06-02
**Auditor:** Lovable agent (self-audit of own last spec)
**Scope:** every file under `spec/21-app/05-prompts/` (95 markdown files)
**Reference:** `spec/01-spec-authoring-guide/` (especially `02-naming-conventions.md`, `03-required-files.md`)

---

## Headline finding

> If you hand this folder to a blind AI today, it **will fail before reading a single line of content**, because the folder violates the spec authoring guide's structural rules. The earlier self-issued "Readiness 100/100" score in `macros/READINESS-SCORE.md` is **invalid** — it audited content quality only and ignored structural conformance.

Revised readiness: **≈ 35 / 100** (content is solid, but a blind AI walking the spec by the project's own onboarding rules will be unable to enumerate the tree).

---

## Issue categories (Phase 0 — broad-stroke)

Each item is a *category*. Phase 1+ will split each into atomic findings.

| ID  | Category                                | Severity | Files affected | Fix file (later) |
|-----|-----------------------------------------|---------:|---------------:|------------------|
| C1  | Missing mandatory metadata header       | Critical | **95 / 95**    | `01-…`           |
| C2  | Filename violates kebab-case / NN-prefix| Critical | 6              | `02-…`           |
| C3  | Folder missing `00-overview.md`         | Critical | 9              | `03-…`           |
| C4  | Root missing `99-consistency-report.md` | High     | 1              | `04-…`           |
| C5  | Reserved-prefix files in wrong slot     | High     | 3              | `05-…`           |
| C6  | `97-acceptance-criteria.md` missing     | High     | 9              | `06-…`           |
| C7  | snake_case identifiers in body content  | Medium   | 1+ (metrics)   | `07-…`           |
| C8  | Cross-reference rot (links to `mem://`) | Medium   | TBD            | `08-…`           |
| C9  | Plan-doc lives in `.lovable/plans/` but spec links to it as authoritative | Medium | 2 | `09-…` |
| C10 | Two parallel concepts (`macros/00-concept.md` vs `engine/00-architecture.md`) — no "supersedes" chain | Medium | 2 | `10-…` |

Total atomic findings expected after Phase 1–9 expansion: **80–100**.

---

## How this audit is sequenced

100 atomic tasks. Each `next` = one task = one of:

- Write/expand one issue file `NN-<slug>.md` under this folder.
- Update this overview's counts.
- Update `mem://audits/spec-prompt-macros` with the new finding.

**No file in `spec/21-app/05-prompts/` outside `99-spec-issues/` will be modified** until the audit is complete and the user explicitly approves a fix pass.

The full 100-step plan lives in [`.lovable/plans/spec-prompt-macros-audit-100.md`](../../../../.lovable/plans/spec-prompt-macros-audit-100.md).

---

## What is NOT in scope of this audit

- Content correctness of macros engine, variables, guards — those were authored deliberately and are not being re-litigated here.
- Code under `src/` — pure spec audit.
- Other spec folders (`02-features/`, `03-...`) — separate audit if requested.
