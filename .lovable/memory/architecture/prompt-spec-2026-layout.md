---
name: Prompt Spec 2026 — folder layout
description: Renamed from spec/2026-spec/01-prompt-spec/ to spec/2026-spec/01-prompt-spec/ with dense 01..20 child numbering; layout, history, and rewrite tool
type: feature
---

# `spec/2026-spec/01-prompt-spec/` layout (renumbered 2026-06-03)

**History:** Originally `spec/2026-spec/01-prompt-spec/` with sparse child numbering (`10..200` in steps of 10). Renamed atomically to `spec/2026-spec/01-prompt-spec/` and renumbered to dense sequential `01..20` per user directive (no gaps, predictable navigation).

## Live structure

```
spec/2026-spec/01-prompt-spec/
├── 00-overview.md
├── 01-glossary/
├── 01-plan-tasks-1-20.md
├── 02-data-model/
├── 02-hardening-backlog.md
├── 03-prompt-source-format/
├── 04-loader-contract/
├── 05-ui-contract/
├── 06-injection-contract/
├── 07-editor-adapters/
├── 08-save-create-edit/
├── 09-next-overview/
├── 10-queue-model/
├── 11-queue-lifecycle/
├── 12-delay-engine/
├── 13-failure-handling/
├── 14-plan-mode/
├── 15-settings/
├── 16-observability/
├── 17-onboarding/
├── 18-test-plan/
├── 19-reference-snippets/
├── 20-adoption-checklist/
├── 99-spec-issues/
│   ├── 200-renumber-baseline.md   ← full migration changelog
│   └── 300-blind-ai-rescore-pre-renumber.md
└── README.md
```

- **Total files:** 106 (stable since Phase B).
- **Numbering rule:** dense `NN-name` (no gaps); zero-padded 2 digits; no 3-digit sub-folder numbers.
- **3-digit numbers reserved** for `99-spec-issues/` ledger entries only (`200-...`, `300-...`).

## Old → new path mapping

Sparse `1N0-` and `200-` folders collapse to dense `1N-` and `20-`:

| Old | New |
|-----|-----|
| `100-queue-model/` | `10-queue-model/` |
| `110-queue-lifecycle/` | `11-queue-lifecycle/` |
| `120-delay-engine/` | `12-delay-engine/` |
| `130-failure-handling/` | `13-failure-handling/` |
| `140-plan-mode/` | `14-plan-mode/` |
| `150-settings/` | `15-settings/` |
| `160-observability/` | `16-observability/` |
| `170-onboarding/` | `17-onboarding/` |
| `180-test-plan/` | `18-test-plan/` |
| `190-reference-snippets/` | `19-reference-snippets/` |
| `200-adoption-checklist/` | `20-adoption-checklist/` |

Sub-200 children (`10..90` → `01..09`) renamed in lockstep.

## Rewrite tool

`scripts/spec/apply-rename-map.mjs` — pair-based regex rewriter keyed on full `NN-name` (not bare `NN-`) to avoid collisions. 3-digit pairs ordered first so `100-…` is never partially eaten by `10-…`. Word-boundary regex prevents false matches. Default scope: renamed spec tree only; extensions `.md|.json|.html|.mjs|.ts|.tsx|.yml|.yaml`.

**Use it again** for any future spec-tree rename — update `ROOT_PAIR` (line 44) and re-run.

## Scripts repaired in Phase E

These 8 scripts had hard-coded `spec/2026-spec` ROOT paths; all rewritten to `spec/2026-spec`:

- `scripts/typecheck-spec-snippets.mjs` (also `190-…` → `19-…`)
- `scripts/build-spec-prompts-pdf.mjs`
- `scripts/check-spec-prompts-xrefs.mjs`
- `scripts/check-prompts-info-json.mjs` (also `30-…` → `03-…`)
- `scripts/extract-prompts-acceptance.mjs`
- `scripts/lint-spec-banlist.mjs`
- `scripts/lint-spec-mermaid.mjs`
- `scripts/audit-spec-genericization.mjs` (escaped regex variant)

## Verification gates

- `node scripts/spec/lint-cross-refs.mjs` → exit 0
- `node scripts/lint-spec-mermaid.mjs` → clean
- `node scripts/check-spec-prompts-xrefs.mjs` → clean
- `node scripts/check-prompts-info-json.mjs` → clean

## Audit trail

- Plan: `.lovable/plans/prompt-spec-2026-renumber-100.md` (STATUS banner: EXECUTED)
- Snapshots: `.lovable/audits/2026-06-03-renumber/` (path-map.json, inventory-before/after-*, refs-*)
- Changelog: `spec/2026-spec/01-prompt-spec/99-spec-issues/200-renumber-baseline.md`
- Blind-AI rescore: `spec/2026-spec/01-prompt-spec/99-spec-issues/300-blind-ai-rescore-pre-renumber.md`
