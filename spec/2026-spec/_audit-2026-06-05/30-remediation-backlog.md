# Remediation Backlog

## Closed machine signals

- `node scripts/audit/check-acceptance.mjs` → every source spec has a machine-checkable Acceptance section.
- `node scripts/audit/check-dangling-links.mjs` → every inline and reference-style relative Markdown link resolves.
- `node scripts/audit/check-constant-divergence.mjs` → copied constant assignments match runtime defaults.
- `node scripts/audit/check-must-constants.mjs` → operational numeric constants bind to runtime defaults or memory.
- `node scripts/audit/check-must-memory-refs.mjs` → every MUST/SHALL spec cites a `mem://` owner.
- `node scripts/audit/check-pitfalls.mjs` → every source spec includes a pitfall/counter-example signal.
- `node scripts/audit/render-reports.mjs` → this audit directory is reproducible from current scores.

## Remaining machine-check hooks

1. Add a score-floor checker that fails when any source file scores <100 or composite <99.5.
2. Add a score snapshot lock at `_audit-2026-06-05/scores.snapshot.json`.
3. Add no-bare-fetch and footer-lint guards for new prose.
4. Wire every audit check into `.github/workflows/spec-audit.yml`.

## Remaining qualitative work

1. Reconcile per-folder consistency reports with this content-quality audit.
2. Graduate or document quarantined files.
3. Run a final pending-issues sweep and tag snapshot.
