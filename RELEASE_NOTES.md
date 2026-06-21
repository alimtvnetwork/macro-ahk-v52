# Marco Chrome Extension v3.91.0

## Changed

- Plan inventory sweep: archived 4 shipped plans into `.lovable/plans/completed/` with explicit `STATUS: ✅ COMPLETED` headers (HTTP Fail-Fast, Refill-Priority + GitHub-open v3.10.0, Credit-Totals + Macro UX 20-step, Prompt-Spec 2026 renumber).
- Pending plan backlog narrowed from 7 to 3: `projects-modal-15-step-improvement.md`, `prompt-macros-50-step.md`, `spec-prompt-macros-audit-100.md`.

## Verification

- `ls .lovable/plans/` shows only 3 pending files plus `completed/` and `subtasks/` folders.
- `ls .lovable/plans/completed/` shows 5 archived plans (01-05).
- `node scripts/check-version-sync.mjs` → `✅ All versions in sync: 3.91.0`.
