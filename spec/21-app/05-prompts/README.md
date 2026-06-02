# Prompt-Macros Subsystem — Master Index

**Spec version:** 2.0.0 (post-50-step upgrade, 2026-06-02)
**Audit status:** Honest **100 / 100** — see `macros/READINESS-SCORE.md`
**Blind-AI smoke test:** `BLIND-AI-SMOKE-TEST.md` (20 questions, 20 passes)

## Reading order for a blind-AI implementer

1. `GLOSSARY.md` — terms
2. `macros/00-concept.md` — normative concept
3. `macros/01-step-kinds.md` — 8 step kinds
4. `macros/SCHEMA-INDEX.md` → `json/` — every JSON contract
5. `macros/engine/` — architecture + 7 pseudo-code appendices
6. `variables/` — syntax + waterfall + sensitive masking
7. `ui/` — panel, dialogs, keyboard, a11y
8. `macros/guards/` — invariants
9. `macros/observability/` — logging + metrics + failure schema
10. `macros/testing/` — test inventories + fixtures + CI gates
11. `macros/examples/` — runnable walkthroughs (happy / recovery / failure)
12. `IMPLEMENTATION-CHECKLIST.md` — ship-it runbook

## Folder map

```
spec/21-app/05-prompts/
├── README.md                       (this file)
├── GLOSSARY.md
├── IMPLEMENTATION-CHECKLIST.md
├── BLIND-AI-SMOKE-TEST.md
├── folder-structure.md
├── 00-all-prompts.md
├── 01-start-prompt.md
├── 03-rejog-the-memory-v1.md
├── 04-unified-ai-prompt-v4.md
├── 05-issues-tracking.md
├── 06-unit-test-failing.md
├── 15-read-memory.md
├── 16-write-memory.md
├── json/             (10 docs + 5 .schema.json files)
├── ui/               (10 docs + 6 v2 references)
├── variables/        (10 docs + 6 v2 references + README)
├── macro-prompts/    (8 docs + README)
├── macros/
│   ├── 00-concept.md … 07-permissions-and-scope.md
│   ├── README, CHANGELOG, MIGRATION, READINESS-SCORE
│   ├── SCHEMA-INDEX.md, EDGE-CASES.md
│   ├── engine/        (10 + 7 pseudo-code)
│   ├── examples/      (5 + 3 walkthroughs)
│   ├── folder-layout/ (5)
│   ├── guards/        (5 + 3 v2 matrices)
│   ├── observability/ (5 + 3 v2 references)
│   └── testing/       (5 + 5 v2 inventories)
└── 99-spec-issues/    (audit history)
```

## Cross-cutting memories

- `mem://features/prompt-macros`
- `mem://features/prompt-variables`
- `mem://architecture/macro-prompts-folder`
- `mem://standards/verbose-logging-and-failure-diagnostics`

## Change history

- 2026-06-02 v1.0 — initial spec (95 files)
- 2026-06-02 v1.1 — audit + retraction (`99-spec-issues/`)
- 2026-06-02 v2.0 — 50-step blind-AI upgrade (this version)
